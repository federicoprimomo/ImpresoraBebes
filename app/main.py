"""Punto de entrada: arranca el servidor web (pantalla), los botones GPIO
(si hay disponibles) y el chequeo periódico de la impresora.

La lógica del flujo (grabar -> transcribir -> moderar -> generar -> mostrar
-> imprimir) vive en app/controller.py, así se comparte entre los botones
físicos, el teclado/pantalla y (a futuro) cualquier otro disparador.

Se corre como: python -m app.main
"""
from __future__ import annotations

import logging

import config
from app import controller, printer
from app.gpio_buttons import setup_buttons
from app.web import create_web_app

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
log = logging.getLogger("impresorabebes")


def main() -> None:
    if not config.OPENAI_API_KEY:
        log.warning(
            "OPENAI_API_KEY no está configurada. Completá el archivo .env "
            "(ver .env.example) antes de usar los botones."
        )

    purged = printer.purge_stale_queue()
    if purged:
        log.info("Se limpiaron %d trabajo(s) colgado(s) de la cola al arrancar.", purged)

    setup_buttons(controller.on_record_pressed, controller.on_record_released, controller.on_print_pressed)
    controller.start_printer_status_watcher()

    web_app = create_web_app()
    log.info("Servidor web en http://%s:%s (barra espaciadora = grabar, Enter = imprimir)", config.WEB_HOST, config.WEB_PORT)
    web_app.run(host=config.WEB_HOST, port=config.WEB_PORT, threaded=True)


if __name__ == "__main__":
    main()
