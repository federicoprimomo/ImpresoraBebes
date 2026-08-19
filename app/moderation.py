"""Chequeo de contenido antes de generar la imagen.

Como esto lo va a manejar libremente un nene/a por voz, agregamos una capa
extra de seguridad además de los filtros propios de la API de imágenes:
pasamos el texto transcripto por el endpoint de moderación de OpenAI antes
de gastar una generación de imagen.
"""
from __future__ import annotations

from openai import OpenAI

import config

_client: OpenAI | None = None


def _client_instance() -> OpenAI:
    global _client
    if _client is None:
        _client = OpenAI(api_key=config.OPENAI_API_KEY)
    return _client


def is_appropriate(text: str) -> bool:
    if not text.strip():
        return False
    client = _client_instance()
    result = client.moderations.create(input=text)
    flagged = result.results[0].flagged
    return not flagged
