"use client";

// Replaces the browser's built-in SpeechRecognition for dictation/voice
// mode. SpeechRecognition's live partial-transcript behavior turned out to
// be unreliably implemented across Android engines -- some devices
// re-deliver growing, overlapping snapshots of the same result instead of
// following the spec, which no amount of client-side event-parsing could
// fully paper over. Recording raw audio and sending it to a real cloud STT
// (openai-whisper via Muapi, same gateway already used for TTS/image/video)
// is slower to first-word (no live captions) but actually correct.

const PREFERRED_MIME_TYPES = [
  "audio/webm;codecs=opus",
  "audio/webm",
  "audio/mp4",
  "audio/ogg;codecs=opus",
];

function pickMimeType(): string {
  if (typeof MediaRecorder === "undefined") return "";
  for (const type of PREFERRED_MIME_TYPES) {
    if (MediaRecorder.isTypeSupported?.(type)) return type;
  }
  return "";
}

export function audioSupported(): boolean {
  return (
    typeof navigator !== "undefined" &&
    !!navigator.mediaDevices?.getUserMedia &&
    typeof MediaRecorder !== "undefined"
  );
}

export type ActiveRecording = {
  stop: () => Promise<Blob>;
  cancel: () => void;
};

// Manual start/stop recording -- used by dictation, where the user taps
// Done themselves.
export async function startRecording(): Promise<ActiveRecording> {
  const stream = await navigator.mediaDevices.getUserMedia({
    audio: { echoCancellation: true, noiseSuppression: true },
  });
  const mimeType = pickMimeType();
  const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
  const chunks: BlobPart[] = [];
  recorder.ondataavailable = (e) => {
    if (e.data.size > 0) chunks.push(e.data);
  };
  recorder.start();

  const cleanup = () => stream.getTracks().forEach((t) => t.stop());

  return {
    stop: () =>
      new Promise<Blob>((resolve) => {
        recorder.onstop = () => {
          cleanup();
          resolve(new Blob(chunks, { type: mimeType || "audio/webm" }));
        };
        if (recorder.state !== "inactive") recorder.stop();
        else {
          cleanup();
          resolve(new Blob(chunks, { type: mimeType || "audio/webm" }));
        }
      }),
    cancel: () => {
      recorder.onstop = null;
      if (recorder.state !== "inactive") recorder.stop();
      cleanup();
    },
  };
}

export type SilenceRecording = {
  promise: Promise<Blob>;
  cancel: () => void;
};

// Records until the mic has been quiet for `silenceMs` after at least
// `minRecordMs` of audio, or `maxRecordMs` is hit as a hard cap. Used by
// voice mode so each turn stays hands-free (no manual stop needed).
// Lightweight energy-based VAD via Web Audio's AnalyserNode -- not
// sophisticated, but doesn't need to be: it just needs to notice "the user
// stopped talking," not distinguish speech from other sounds precisely.
export function recordUntilSilence(opts?: {
  silenceMs?: number;
  minRecordMs?: number;
  maxRecordMs?: number;
  silenceThreshold?: number;
}): SilenceRecording {
  const silenceMs = opts?.silenceMs ?? 1200;
  const minRecordMs = opts?.minRecordMs ?? 500;
  const maxRecordMs = opts?.maxRecordMs ?? 30000;
  const silenceThreshold = opts?.silenceThreshold ?? 8;

  let cancelled = false;
  let cancelFn: () => void = () => {
    cancelled = true;
  };

  const promise = new Promise<Blob>((resolve, reject) => {
    (async () => {
      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          audio: { echoCancellation: true, noiseSuppression: true },
        });
      } catch (e) {
        reject(e);
        return;
      }
      if (cancelled) {
        stream.getTracks().forEach((t) => t.stop());
        reject(new Error("cancelled"));
        return;
      }

      const mimeType = pickMimeType();
      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      const chunks: BlobPart[] = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data);
      };

      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      const audioCtx = new AudioCtx();
      const source = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 512;
      source.connect(analyser);
      const data = new Uint8Array(analyser.frequencyBinCount);

      const startedAt = Date.now();
      let lastLoudAt = Date.now();
      let settled = false;
      let interval: ReturnType<typeof setInterval>;

      const finish = (asCancel: boolean) => {
        if (settled) return;
        settled = true;
        clearInterval(interval);
        const done = () => {
          stream.getTracks().forEach((t) => t.stop());
          audioCtx.close().catch(() => {});
          if (asCancel) reject(new Error("cancelled"));
          else resolve(new Blob(chunks, { type: mimeType || "audio/webm" }));
        };
        recorder.onstop = done;
        if (recorder.state !== "inactive") recorder.stop();
        else done();
      };

      cancelFn = () => finish(true);
      if (cancelled) {
        finish(true);
        return;
      }

      recorder.start();
      interval = setInterval(() => {
        analyser.getByteTimeDomainData(data);
        let sumSquares = 0;
        for (let i = 0; i < data.length; i++) {
          const v = data[i] - 128;
          sumSquares += v * v;
        }
        const rms = Math.sqrt(sumSquares / data.length);
        if (rms > silenceThreshold) lastLoudAt = Date.now();

        const elapsed = Date.now() - startedAt;
        const silentFor = Date.now() - lastLoudAt;
        if (elapsed >= maxRecordMs || (elapsed >= minRecordMs && silentFor >= silenceMs)) {
          finish(false);
        }
      }, 100);
    })();
  });

  return { promise, cancel: () => cancelFn() };
}
