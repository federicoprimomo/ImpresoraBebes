"""Lógica del flujo completo, independiente de cómo se dispara cada acción.

Tanto los botones físicos (GPIO, app/gpio_buttons.py) como los controles de
teclado/pantalla (barra espaciadora / Enter, vía HTTP en app/web.py) llaman
a las mismas tres funciones de acá: on_record_pressed, on_record_released,
on_print_pressed. Así el comportamiento es idéntico sin importar el modo.
"""
from __future__ import annotations

import logging
import threading
import time

import config
from app import audio, imagegen, moderation, printer, speech, state

log = logging.getLogger("impresorabebes.controller")

recorder = audio.PushToTalkRecorder()

_last_image_path = None
_last_print_time = 0.0
_max_duration_timer: threading.Timer | None = None
_processing_lock = threading.Lock()


def _busy() -> bool:
    return state.bus.get().status in {
        state.LISTENING,
        state.TRANSCRIBING,
        state.MODERATING,
        state.GENERATING,
        state.PRINTING,
    }


def _cancel_max_duration_timer() -> None:
    global _max_duration_timer
    if _max_duration_timer is not None:
        _max_duration_timer.cancel()
        _max_duration_timer = None


def on_record_pressed() -> None:
    if _busy():
        log.info("Botón de grabar ignorado: el sistema está ocupado (%s)", state.bus.get().status)
        return
    log.info("Empezando a grabar...")
    state.bus.set(status=state.LISTENING, message="Te escucho... ¡decime qué querés dibujar!", image_url=None)
    try:
        recorder.start()
    except Exception:  # noqa: BLE001 - típicamente: no hay micrófono disponible
        log.exception("No pude empezar a grabar (¿hay un micrófono conectado?)")
        state.bus.set(status=state.ERROR, message="No encuentro el micrófono. Avisale a un adulto.")
        _back_to_idle_after(4)
        return

    global _max_duration_timer
    _max_duration_timer = threading.Timer(config.RECORD_MAX_SECONDS, on_record_released)
    _max_duration_timer.daemon = True
    _max_duration_timer.start()


def on_record_released() -> None:
    _cancel_max_duration_timer()
    if state.bus.get().status != state.LISTENING:
        return  # ya se procesó (por ejemplo, se cortó por el timer)

    audio_path = recorder.stop()
    if audio_path is None:
        log.info("Grabación muy corta, se ignora.")
        state.bus.set(status=state.IDLE, message="", heard_text="")
        return

    threading.Thread(target=_process_recording, args=(audio_path,), daemon=True).start()


def _process_recording(audio_path) -> None:
    with _processing_lock:
        try:
            state.bus.set(status=state.TRANSCRIBING, message="Estoy entendiendo lo que dijiste...")
            text = speech.transcribe(audio_path)
            log.info("Transcripción: %r", text)

            if not text:
                state.bus.set(
                    status=state.ERROR,
                    message="No te escuché bien. ¡Apretá el botón de nuevo y probá otra vez!",
                )
                _back_to_idle_after(3)
                return

            state.bus.set(status=state.MODERATING, message="Un segundo...", heard_text=text)
            if not moderation.is_appropriate(text):
                log.warning("Pedido bloqueado por moderación: %r", text)
                state.bus.set(
                    status=state.ERROR,
                    message="Mejor pidamos otro dibujo. ¡Probá con otra idea!",
                )
                _back_to_idle_after(3)
                return

            state.bus.set(status=state.GENERATING, message=f"Estoy dibujando: {text}...")
            image_path = imagegen.generate_coloring_page(text)

            global _last_image_path
            _last_image_path = image_path

            image_url = f"/static/generated/{image_path.name}"
            state.bus.set(
                status=state.READY,
                message="¡Listo! Apretá el otro botón para imprimirlo.",
                image_url=image_url,
            )
        except Exception:  # noqa: BLE001
            log.exception("Error procesando el pedido")
            state.bus.set(status=state.ERROR, message="Uy, algo falló. ¡Probemos de nuevo!")
            _back_to_idle_after(3)


def _back_to_idle_after(seconds: float) -> None:
    def _reset():
        time.sleep(seconds)
        if state.bus.get().status == state.ERROR:
            state.bus.set(status=state.IDLE, message="", heard_text="")

    threading.Thread(target=_reset, daemon=True).start()


def on_print_pressed() -> None:
    global _last_print_time

    current = state.bus.get()
    if current.status != state.READY or _last_image_path is None:
        log.info("Botón de imprimir ignorado: no hay dibujo listo (estado=%s)", current.status)
        return

    now = time.time()
    if now - _last_print_time < config.PRINT_COOLDOWN_SECONDS:
        log.info("Botón de imprimir ignorado: cooldown activo")
        return
    _last_print_time = now

    if current.printer_online is False:
        # Ya sabemos (por el chequeo periódico) que la impresora no está
        # lista: avisamos al toque en vez de esperar el timeout del intento.
        log.info("Botón de imprimir: la impresora está offline, no intento imprimir.")
        state.bus.set(
            status=state.ERROR,
            message="La impresora no está lista (revisá que esté encendida, con papel y tóner).",
            image_url=current.image_url,
        )
        _back_to_idle_after(4)
        return

    threading.Thread(target=_do_print, args=(current.image_url,), daemon=True).start()


def _do_print(image_url: str) -> None:
    try:
        state.bus.set(status=state.PRINTING, message="Imprimiendo... ¡ya sale!", image_url=image_url)
        printer.print_image(_last_image_path)
        time.sleep(1.5)
        state.bus.set(
            status=state.READY,
            message="¡Imprimido! Apretá el otro botón para dibujar algo nuevo.",
            image_url=image_url,
        )
    except printer.PrintError as exc:
        log.error("Error de impresión: %s", exc)
        state.bus.set(
            status=state.ERROR,
            message="No pude imprimir. Avisale a un adulto.",
            image_url=image_url,
        )
        _back_to_idle_after(4)


def _printer_status_loop() -> None:
    while True:
        try:
            online = printer.is_online()
        except Exception:  # noqa: BLE001
            log.exception("Error chequeando el estado de la impresora")
            online = False
        current = state.bus.get()
        if current.printer_online != online:
            log.info("Estado de la impresora: %s (%s)", "lista" if online else "no lista", printer.status_message())
            state.bus.set(printer_online=online)
        time.sleep(config.PRINTER_STATUS_POLL_SECONDS)


def start_printer_status_watcher() -> None:
    """Chequea periódicamente si la impresora está lista, en un hilo aparte,
    y lo publica en el estado para que la pantalla muestre un aviso antes de
    que intenten imprimir."""
    threading.Thread(target=_printer_status_loop, daemon=True).start()
