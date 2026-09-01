"""Self-hosted OmniVoice TTS server for Yoojel's voice mode.

Deploy with: modal deploy app.py

Uses OmniVoice's auto-voice path (no instruct, no ref_audio) -- the
voice-design path (instruct="female, american accent, ...") produces
badly garbled audio on this checkpoint, see the DEFAULT_INSTRUCT comment
below. A fixed RNG seed keeps auto voice's speaker choice consistent
across calls instead of picking a new random speaker every time.
Auth is a single shared-secret bearer token (Modal secret "omnivoice-auth"),
matching the token stored in Vercel's OMNIVOICE_API_SECRET env var.
"""

import io
import os

import modal
from fastapi import HTTPException, Request
from fastapi.responses import Response
from pydantic import BaseModel

app = modal.App("omnivoice-tts")

image = (
    modal.Image.debian_slim(python_version="3.11")
    .pip_install("torch", "torchaudio")
    .pip_install("omnivoice", "soundfile", "fastapi[standard]")
)

# Persists downloaded HuggingFace model weights across cold starts -- without
# this, every scale-from-zero container would re-download the full model.
weights_volume = modal.Volume.from_name("omnivoice-weights", create_if_missing=True)
HF_CACHE_DIR = "/root/.cache/huggingface"

# OmniVoice's voice-design path (instruct="female, american accent, ...")
# produces badly garbled/noise-like audio on this checkpoint -- confirmed via
# spectral analysis (55-64% of energy above 4kHz, spectral flatness ~0.7,
# both close to white noise). Auto voice (instruct=None entirely) produces
# clean, genuinely speech-like output (87.5% energy below 4kHz, flatness
# ~0.06), so that's the default until voice design is revisited.
DEFAULT_INSTRUCT = None

# Fixed so auto voice picks the same speaker on every call -- see the seed
# comment at the generate() call site. Chosen from a sweep of 8 candidate
# seeds (0,1,2,3,5,42,123,999), all clean; seed 0 had the best measured
# speech quality (spectral flatness 0.033, 92.4% of energy below 4kHz --
# both strong speech-like signals, vs. e.g. seed 7's 0.6+/35%, which sounded
# like static despite being a perfectly valid seed).
VOICE_SEED = 0


class SynthesizeRequest(BaseModel):
    text: str
    language: str | None = "English"
    instruct: str | None = None
    speed: float = 1.0
    seed: int | None = None


@app.cls(
    gpu="L4",
    image=image,
    volumes={HF_CACHE_DIR: weights_volume},
    secrets=[modal.Secret.from_name("omnivoice-auth")],
    scaledown_window=600,  # keep warm 10 min after last use
    timeout=120,
)
class OmniVoiceServer:
    @modal.enter()
    def load(self):
        import torch
        from omnivoice.models.omnivoice import OmniVoice

        self.model = OmniVoice.from_pretrained(
            "k2-fsa/OmniVoice", device_map="cuda:0", dtype=torch.float32
        )

    @modal.fastapi_endpoint(method="POST")
    def synthesize(self, request: Request, body: SynthesizeRequest):
        expected = f"Bearer {os.environ['OMNIVOICE_API_SECRET']}"
        if request.headers.get("Authorization") != expected:
            raise HTTPException(status_code=401, detail="Unauthorized")

        if not body.text or not body.text.strip():
            raise HTTPException(status_code=400, detail="Missing text.")

        import soundfile as sf
        import torch

        # Auto voice (no instruct/ref_audio) otherwise picks a new random
        # speaker on every call -- fine for one-off Voice Studio generations,
        # but voice mode needs the same speaker across a whole conversation's
        # worth of sentence-by-sentence TTS calls. Seeding torch's global RNG
        # identically before each generate() call makes that speaker choice
        # (and the rest of the diffusion sampling) deterministic.
        torch.manual_seed(body.seed if body.seed is not None else VOICE_SEED)
        audios = self.model.generate(
            text=body.text,
            language=body.language,
            instruct=body.instruct or DEFAULT_INSTRUCT,
            speed=body.speed,
        )

        # soundfile defaults a float array to 32-bit IEEE-float WAV, which
        # decodes fine in Python but many browsers (Safari/iOS especially)
        # can't natively decode -- it plays as static instead of erroring.
        # Force 16-bit PCM, which every browser supports, and clip first so
        # any sample slightly outside [-1, 1] doesn't wrap around instead of
        # clamping.
        import numpy as np

        audio = np.clip(audios[0], -1.0, 1.0)
        buf = io.BytesIO()
        sf.write(buf, audio, self.model.sampling_rate, format="WAV", subtype="PCM_16")
        return Response(content=buf.getvalue(), media_type="audio/wav")
