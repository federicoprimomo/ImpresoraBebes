"""Generación del dibujo para colorear a partir de un texto, usando la API
de imágenes de OpenAI (gpt-image-1).

Esta es una de las dos fuentes posibles de dibujos (la otra es
app/imagesearch.py, que busca en Google Imágenes gratis en vez de
generar). Cuál se usa se elige con IMAGE_SOURCE en el .env — ver
app/controller.py.

Para que el dibujo ocupe la hoja al máximo al imprimir hay dos capas:
  1. Se le pide explícitamente al modelo que dibuje grande, llenando el
     cuadro (no siempre lo respeta al pie de la letra).
  2. Igual, por las dudas, se recortan los márgenes blancos que hayan
     quedado alrededor del dibujo antes de guardarlo — esto es lo que
     realmente garantiza que no quede chico y centrado con mucho borde en
     blanco, más allá de lo que haga la IA.
"""
from __future__ import annotations

import base64
import time
from io import BytesIO
from pathlib import Path

from PIL import Image
from openai import OpenAI

import config
from app.imageutil import trim_whitespace

_client: OpenAI | None = None

# El prompt fuerza el estilo "para colorear": líneas negras simples sobre
# fondo blanco, sin sombreado ni relleno de color, para que quede bien al
# imprimirlo en blanco y negro con la láser. También le pedimos que llene
# el cuadro, para minimizar el margen blanco que después recortamos igual.
PROMPT_TEMPLATE = (
    "Dibujo para colorear infantil, estilo libro de colorear. "
    "Solo líneas negras simples y gruesas sobre fondo blanco liso, "
    "sin sombreado, sin degradados, sin relleno de color, sin texto ni marcas de agua. "
    "Un único personaje u objeto, fácil de colorear con crayones para un niño pequeño. "
    "MUY IMPORTANTE: el dibujo tiene que ser grande y ocupar casi todo el cuadro de "
    "punta a punta, con el mínimo margen blanco posible alrededor (estilo primer plano, "
    "no un dibujo chico centrado en una hoja vacía). Tema pedido: {subject}"
)


def _client_instance() -> OpenAI:
    global _client
    if _client is None:
        _client = OpenAI(api_key=config.OPENAI_API_KEY)
    return _client


def generate_coloring_page(subject_text: str) -> Path:
    """Genera la imagen, la recorta para que ocupe el máximo posible, y la
    guarda en web/static/generated/. Devuelve el path."""
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

    img = Image.open(BytesIO(image_bytes)).convert("RGB")
    img = trim_whitespace(img)

    filename = f"dibujo_{int(time.time())}.png"
    out_path = config.GENERATED_DIR / filename
    img.save(out_path)
    return out_path
