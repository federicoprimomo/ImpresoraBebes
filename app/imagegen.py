"""Generación del dibujo para colorear a partir de un texto, usando la API
de imágenes de OpenAI (gpt-image-1).
"""
from __future__ import annotations

import base64
import time
from pathlib import Path

from openai import OpenAI

import config

_client: OpenAI | None = None

# El prompt fuerza el estilo "para colorear": líneas negras simples sobre
# fondo blanco, sin sombreado ni relleno de color, para que quede bien al
# imprimirlo en blanco y negro con la láser.
PROMPT_TEMPLATE = (
    "Dibujo para colorear infantil, estilo libro de colorear. "
    "Solo líneas negras simples y gruesas sobre fondo blanco liso, "
    "sin sombreado, sin degradados, sin relleno de color, sin texto ni marcas de agua. "
    "Un único personaje u objeto grande y centrado, fácil de colorear con crayones "
    "para un niño pequeño. Tema pedido: {subject}"
)


def _client_instance() -> OpenAI:
    global _client
    if _client is None:
        _client = OpenAI(api_key=config.OPENAI_API_KEY)
    return _client


def generate_coloring_page(subject_text: str) -> Path:
    """Genera la imagen y la guarda en web/static/generated/. Devuelve el path."""
    client = _client_instance()
    prompt = PROMPT_TEMPLATE.format(subject=subject_text.strip())

    response = client.images.generate(
        model=config.IMAGE_MODEL,
        prompt=prompt,
        size=config.IMAGE_SIZE,
        n=1,
    )

    b64 = response.data[0].b64_json
    image_bytes = base64.b64decode(b64)

    filename = f"dibujo_{int(time.time())}.png"
    out_path = config.GENERATED_DIR / filename
    out_path.write_bytes(image_bytes)
    return out_path
