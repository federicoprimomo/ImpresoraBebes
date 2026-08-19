"""Configuración de los dos botones físicos vía gpiozero.

Cableado esperado (ver README para el diagrama completo):
  - Botón 1 (grabar/elegir dibujo): entre GPIO configurado (BUTTON_RECORD_PIN) y GND.
  - Botón 2 (imprimir): entre GPIO configurado (BUTTON_PRINT_PIN) y GND.
  - gpiozero usa el pull-up interno, así que no hace falta resistencia externa.
"""
from __future__ import annotations

from typing import Callable

from gpiozero import Button

import config


def setup_buttons(
    on_record_pressed: Callable[[], None],
    on_record_released: Callable[[], None],
    on_print_pressed: Callable[[], None],
) -> tuple[Button, Button]:
    record_button = Button(config.BUTTON_RECORD_PIN, pull_up=True, bounce_time=0.05)
    print_button = Button(config.BUTTON_PRINT_PIN, pull_up=True, bounce_time=0.05)

    record_button.when_pressed = on_record_pressed
    record_button.when_released = on_record_released
    print_button.when_pressed = on_print_pressed

    return record_button, print_button
