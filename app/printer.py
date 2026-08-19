"""Envío del dibujo a la impresora láser HP conectada por USB, vía CUPS."""
from __future__ import annotations

import subprocess
from pathlib import Path

import config


class PrintError(RuntimeError):
    pass


def print_image(image_path: Path) -> None:
    """Manda el archivo a imprimir usando el comando `lp` de CUPS.

    Requiere que la impresora ya esté agregada en CUPS (ver README) y que
    PRINTER_NAME en .env coincida con el nombre de la cola (`lpstat -p -d`).
    """
    if not config.PRINTER_NAME:
        raise PrintError(
            "No configuraste PRINTER_NAME en el .env. "
            "Corré 'lpstat -p -d' en la Raspberry Pi para ver el nombre de la cola."
        )

    if not image_path.exists():
        raise PrintError(f"No existe el archivo a imprimir: {image_path}")

    cmd = [
        "lp",
        "-d", config.PRINTER_NAME,
        "-o", "fit-to-page",
        "-o", "media=A4",
        str(image_path),
    ]
    result = subprocess.run(cmd, capture_output=True, text=True)
    if result.returncode != 0:
        raise PrintError(
            f"Falló la impresión (código {result.returncode}): "
            f"{result.stderr.strip() or result.stdout.strip()}"
        )
