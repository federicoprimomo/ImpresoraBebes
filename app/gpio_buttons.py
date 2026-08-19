"""Configuración de los dos botones físicos vía gpiozero.

Cableado esperado (ver README para el diagrama completo):
  - Botón 1 (grabar/elegir dibujo): entre GPIO configurado (BUTTON_RECORD_PIN) y GND.
  - Botón 2 (imprimir): entre GPIO configurado (BUTTON_PRINT_PIN) y GND.
  - gpiozero usa el pull-up interno, así que no hace falta resistencia externa.

Los botones físicos son *opcionales*: si no hay GPIO disponible (por
ejemplo, corriendo en Windows o en una PC de desarrollo sin Raspberry Pi),
esta función no rompe el arranque — devuelve (None, None), avisa por log,
y el sistema sigue funcionando igual con los controles de teclado/pantalla
(ver app/web.py: barra espaciadora = grabar, Enter = imprimir).
"""
from __future__ import annotations

import logging
from typing import Callable, Optional, Tuple

import config

log = logging.getLogger("impresorabebes.gpio")


def setup_buttons(
    on_record_pressed: Callable[[], None],
    on_record_released: Callable[[], None],
    on_print_pressed: Callable[[], None],
) -> Tuple[Optional[object], Optional[object]]:
    try:
        from gpiozero import Button
    except Exception as exc:  # ImportError en Windows/Mac, o sin backend GPIO
        log.warning(
            "gpiozero no disponible (%s). Los botones físicos quedan "
            "deshabilitados; usá barra espaciadora (grabar) y Enter (imprimir) "
            "en la pantalla.",
            exc,
        )
        return None, None

    try:
        record_button = Button(config.BUTTON_RECORD_PIN, pull_up=True, bounce_time=0.05)
        print_button = Button(config.BUTTON_PRINT_PIN, pull_up=True, bounce_time=0.05)
    except Exception as exc:
        log.warning(
            "No pude inicializar los pines GPIO (%s). ¿Estás corriendo esto en "
            "una Raspberry Pi real, con los botones cableados? Quedan "
            "deshabilitados los botones físicos; usá el teclado.",
            exc,
        )
        return None, None

    record_button.when_pressed = on_record_pressed
    record_button.when_released = on_record_released
    print_button.when_pressed = on_print_pressed

    log.info("Botones físicos listos en GPIO%s / GPIO%s.", config.BUTTON_RECORD_PIN, config.BUTTON_PRINT_PIN)
    return record_button, print_button
