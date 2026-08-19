"""Transcripción de audio a texto usando la API de OpenAI (Whisper)."""
from __future__ import annotations

from pathlib import Path

from openai import OpenAI

import config

_client: OpenAI | None = None


def _client_instance() -> OpenAI:
    global _client
    if _client is None:
        _client = OpenAI(api_key=config.OPENAI_API_KEY)
    return _client


def transcribe(audio_path: Path) -> str:
    """Devuelve el texto dicho en el audio. Puede tirar excepción si falla la API."""
    client = _client_instance()
    with open(audio_path, "rb") as f:
        result = client.audio.transcriptions.create(
            model=config.STT_MODEL,
            file=f,
            language=config.TRANSCRIPTION_LANGUAGE,
        )
    return (result.text or "").strip()
