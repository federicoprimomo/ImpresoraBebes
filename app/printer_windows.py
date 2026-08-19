"""Backend de impresión para Windows: pensado para probar el flujo completo
(voz -> dibujo -> imprimir) en una PC con Windows mientras no tenés la
Raspberry Pi a mano. Usa la API nativa de impresión de Windows (pywin32),
no CUPS.

Si PRINTER_NAME está vacío en el .env, imprime en la impresora
**predeterminada del sistema**. Si querés apuntar a otra, poné en
PRINTER_NAME el nombre exacto tal como figura en
Configuración -> Bluetooth y dispositivos -> Impresoras y escáneres.

Requiere pywin32 (ya está en requirements.txt con un marcador que hace que
`pip install` solo lo instale en Windows).
"""
from __future__ import annotations

from pathlib import Path

import config

try:
    import win32print
    import win32ui
    from PIL import Image
    from PIL import ImageWin
    _IMPORT_ERROR: Exception | None = None
except Exception as exc:  # pragma: no cover - solo se ejecuta en Windows
    win32print = None
    win32ui = None
    Image = None
    ImageWin = None
    _IMPORT_ERROR = exc

# GetDeviceCaps: índices estándar de la API de Windows GDI
_HORZRES = 8
_VERTRES = 10


class PrintError(RuntimeError):
    pass


def _require_pywin32() -> None:
    if win32print is None:
        raise PrintError(
            "Falta pywin32 para imprimir en Windows. Instalalo con: pip install pywin32"
        ) from _IMPORT_ERROR


def _printer_name() -> str:
    _require_pywin32()
    if config.PRINTER_NAME:
        return config.PRINTER_NAME
    return win32print.GetDefaultPrinter()


def is_online() -> bool:
    """True si la impresora existe y no está offline/con error/pausada."""
    if win32print is None:
        return False
    try:
        name = _printer_name()
        handle = win32print.OpenPrinter(name)
        try:
            info = win32print.GetPrinter(handle, 2)
        finally:
            win32print.ClosePrinter(handle)
    except Exception:
        return False

    bad_flags = (
        win32print.PRINTER_STATUS_OFFLINE
        | win32print.PRINTER_STATUS_ERROR
        | win32print.PRINTER_STATUS_PAPER_OUT
        | win32print.PRINTER_STATUS_PAPER_JAM
        | win32print.PRINTER_STATUS_NOT_AVAILABLE
        | win32print.PRINTER_STATUS_DOOR_OPEN
        | win32print.PRINTER_STATUS_NO_TONER
    )
    return (info["Status"] & bad_flags) == 0


def status_message() -> str:
    if win32print is None:
        return "pywin32 no está instalado"
    try:
        name = _printer_name()
    except PrintError as exc:
        return str(exc)
    return f"'{name}' lista" if is_online() else f"'{name}' con problemas"


def print_image(image_path: Path) -> None:
    _require_pywin32()
    name = _printer_name()

    if not is_online():
        raise PrintError(f"La impresora '{name}' no está lista (offline, sin papel o con error).")

    if not image_path.exists():
        raise PrintError(f"No existe el archivo a imprimir: {image_path}")

    img = Image.open(image_path).convert("RGB")

    hDC = win32ui.CreateDC()
    hDC.CreatePrinterDC(name)
    try:
        hDC.StartDoc(str(image_path.name))
        hDC.StartPage()

        # Escala la imagen para ocupar el máximo del área imprimible,
        # manteniendo proporción (equivalente al fit-to-page de CUPS).
        printable_w = hDC.GetDeviceCaps(_HORZRES)
        printable_h = hDC.GetDeviceCaps(_VERTRES)
        img_ratio = img.width / img.height
        page_ratio = printable_w / printable_h
        if img_ratio > page_ratio:
            w, h = printable_w, int(printable_w / img_ratio)
        else:
            w, h = int(printable_h * img_ratio), printable_h
        x = (printable_w - w) // 2
        y = (printable_h - h) // 2

        dib = ImageWin.Dib(img)
        dib.draw(hDC.GetHandleOutput(), (x, y, x + w, y + h))

        hDC.EndPage()
        hDC.EndDoc()
    except Exception as exc:
        raise PrintError(f"Falló la impresión en Windows: {exc}") from exc
    finally:
        hDC.DeleteDC()


def purge_stale_queue() -> int:
    """Cancela los trabajos pendientes de esta impresora en la cola de Windows."""
    if win32print is None:
        return 0
    try:
        name = _printer_name()
        handle = win32print.OpenPrinter(name)
    except Exception:
        return 0
    try:
        jobs = win32print.EnumJobs(handle, 0, -1, 1)
        for job in jobs:
            win32print.SetJob(handle, job["JobId"], 0, None, win32print.JOB_CONTROL_CANCEL)
        return len(jobs)
    finally:
        win32print.ClosePrinter(handle)
