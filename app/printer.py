"""Punto de entrada único para imprimir: elige el backend según el sistema
operativo.

  - Linux (Raspberry Pi): CUPS vía el comando `lp` (app/printer_linux.py).
    Es el camino de despliegue real.
  - Windows: API nativa de impresión de Windows, a la impresora
    predeterminada del sistema o a PRINTER_NAME si está seteado
    (app/printer_windows.py). Pensado para probar el flujo completo sin
    tener la Raspberry Pi a mano.

Expone siempre las mismas funciones: print_image, purge_stale_queue,
is_online, status_message, y la excepción PrintError.
"""
from __future__ import annotations

import platform

if platform.system() == "Windows":
    from app.printer_windows import (  # noqa: F401
        PrintError,
        is_online,
        print_image,
        purge_stale_queue,
        status_message,
    )
else:
    from app.printer_linux import (  # noqa: F401
        PrintError,
        is_online,
        print_image,
        purge_stale_queue,
        status_message,
    )
