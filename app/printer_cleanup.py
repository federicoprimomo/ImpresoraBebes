"""Tarea corta e independiente que purga la cola de impresión.

Pensada para correr cada tanto desde un timer de systemd (ver
systemd/impresorabebes-cleanup.timer), como red de seguridad extra además
de la limpieza que ya hace app.printer.print_image() por cada trabajo y
app.main al arrancar. Se corre con:

    python -m app.printer_cleanup
"""
from __future__ import annotations

import logging

from app import printer

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
log = logging.getLogger("impresorabebes.printer_cleanup")


def main() -> None:
    purged = printer.purge_stale_queue()
    if purged:
        log.info("Limpieza periódica: %d trabajo(s) cancelado(s).", purged)
    else:
        log.info("Limpieza periódica: la cola estaba vacía.")


if __name__ == "__main__":
    main()
