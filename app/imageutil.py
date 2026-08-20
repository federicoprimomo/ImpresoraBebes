"""Utilidades de imagen compartidas entre las dos fuentes de dibujos
(generación con IA y búsqueda en Google Imágenes)."""
from __future__ import annotations

from PIL import Image, ImageChops

# Al recortar el margen blanco, dejamos un colchón chico alrededor del
# dibujo (fracción del tamaño del propio dibujo) para que no quede pegado
# al borde de la hoja.
TRIM_PADDING_FRACTION = 0.04

# Qué tan blanco tiene que ser un pixel para contarlo como "fondo" y no
# como parte del dibujo (0-255, tolera el antialiasing de los bordes).
TRIM_THRESHOLD = 25


def trim_whitespace(img: Image.Image) -> Image.Image:
    """Recorta el margen blanco alrededor del dibujo.

    Sin esto, aunque la hoja/imagen tengan la proporción correcta, el
    dibujo puede venir chico y centrado con mucho borde en blanco — y ese
    borde blanco, para la impresora, es "parte del dibujo", así que el
    fit-to-page no lo arregla. Recortándolo acá, lo que después se manda a
    imprimir ocupa la hoja mucho mejor.
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
