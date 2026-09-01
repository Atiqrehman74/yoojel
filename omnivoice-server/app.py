"""Self-hosted OmniVoice TTS server for Yoojel's voice mode.

Deploy with: modal deploy app.py

Voice mode has no reference audio to clone from, so it always uses
OmniVoice's voice-design path (`instruct=`) rather than voice cloning.
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

# Fixed voice-design instruction standing in for the old Muapi "Friendly_Person"
# preset -- voice mode doesn't offer a voice picker, just one consistent voice.
# OmniVoice's `instruct` is a closed vocabulary (not free-form descriptive
# text), see the model's own error message for the full valid item list.
DEFAULT_INSTRUCT = "female, american accent, moderate pitch"


class SynthesizeRequest(BaseModel):
    text: str
    language: str | None = "English"
    instruct: str | None = None
    speed: float = 1.0


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
            "k2-fsa/OmniVoice", device_map="cuda:0", dtype=torch.float16
        )

    @modal.fastapi_endpoint(method="POST")
    def synthesize(self, request: Request, body: SynthesizeRequest):
        expected = f"Bearer {os.environ['OMNIVOICE_API_SECRET']}"
        if request.headers.get("Authorization") != expected:
            raise HTTPException(status_code=401, detail="Unauthorized")

        if not body.text or not body.text.strip():
            raise HTTPException(status_code=400, detail="Missing text.")

        import soundfile as sf

        audios = self.model.generate(
            text=body.text,
            language=body.language,
            instruct=body.instruct or DEFAULT_INSTRUCT,
            speed=body.speed,
        )

        buf = io.BytesIO()
        sf.write(buf, audios[0], self.model.sampling_rate, format="WAV")
        return Response(content=buf.getvalue(), media_type="audio/wav")
