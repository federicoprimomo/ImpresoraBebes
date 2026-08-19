"""Generación del dibujo para colorear a partir de un texto, usando la API
de imágenes de OpenAI (gpt-image-1).

Para que el dibujo ocupe la hoja al máximo al imprimir hay dos capas:
  1. Se le pide explícitamente al modelo que dibuje grande, llenando el
     cuadro (no siempre lo respeta al pie de la letra).
  2. Igual, por las dudas, se recortan los márgenes blancos que hayan
     quedado alrededor del dibujo antes de guardarlo (_trim_whitespace) —
     esto es lo que realmente garantiza que no quede chico y centrado con
     mucho borde en blanco, más allá de lo que haga la IA.
"""
from __future__ import annotations

import base64
import time
from io import BytesIO
from pathlib import Path

from PIL import Image, ImageChops
from openai import OpenAI

import config

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

# Al recortar el margen blanco, dejamos un colchón chico alrededor del
# dibujo (fracción del tamaño del propio dibujo) para que no quede
# pegado al borde de la hoja.
TRIM_PADDING_FRACTION = 0.04

# Qué tan blanco tiene que ser un pixel para contarlo como "fondo" y no
# como parte del dibujo (0-255, tolera el antialiasing de los bordes).
TRIM_THRESHOLD = 25


def _client_instance() -> OpenAI:
    global _client
    if _client is None:
        _client = OpenAI(api_key=config.OPENAI_API_KEY)
    return _client


def _trim_whitespace(img: Image.Image) -> Image.Image:
    """Recorta el margen blanco alrededor del dibujo.

    Sin esto, aunque la hoja/imagen tengan la proporción correcta, el
    modelo puede devolver el dibujo chico y centrado con mucho borde en
    blanco — y ese borde blanco, para la impresora, es "parte del dibujo",
    así que el fit-to-page no lo arregla. Recortándolo acá, lo que después
    se manda a imprimir ocupa la hoja mucho mejor.
    """
    gray = img.convert("L")
    background = Image.new("L", gray.size, 255)
    diff = ImageChops.difference(gray, background)
    diff = diff.point(lambda p: 255 if p > TRIM_THRESHOLD else 0)
    bbox = diff.getbbox()
    if bbox is None:
        return img  # imagen totalmente en blanco (no debería pasar); no tocamos nada

    left, top, right, bottom = bbox
    pad_x = max(1, int((right - left) * TRIM_PADDING_FRACTION))
    pad_y = max(1, int((bottom - top) * TRIM_PADDING_FRACTION))
    left = max(0, left - pad_x)
    top = max(0, top - pad_y)
    right = min(img.width, right + pad_x)
    bottom = min(img.height, bottom + pad_y)
    return img.crop((left, top, right, bottom))


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
    img = _trim_whitespace(img)

    filename = f"dibujo_{int(time.time())}.png"
    out_path = config.GENERATED_DIR / filename
    img.save(out_path)
    return out_path
