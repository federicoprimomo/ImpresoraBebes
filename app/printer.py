"""Envío del dibujo a la impresora láser HP conectada por USB, vía CUPS.

Además de mandar a imprimir, este módulo se encarga de que la cola no
acumule trabajos colgados si la impresora falla por algún motivo (sin
papel, sin tóner, apagada, atascada, etc.):

  - print_image() espera a que el trabajo salga de la cola; si no lo hace
    en PRINT_TIMEOUT_SECONDS, lo cancela y avisa con un error.
  - purge_stale_queue() cancela cualquier trabajo que haya quedado
    pendiente en la cola (se usa al arrancar el programa, y también desde
    un timer de systemd como red de seguridad — ver systemd/).

Recomendado además configurar la cola en CUPS con
`printer-error-policy=abort-job` (ver scripts/configure_printer.sh) para
que, ante un error de la impresora, CUPS cancele el trabajo en vez de
reintentar indefinidamente.
"""
from __future__ import annotations

import logging
import re
import subprocess
import time
from pathlib import Path

import config

log = logging.getLogger("impresorabebes.printer")

_JOB_ID_RE = re.compile(r"request id is\s+(\S+)")


class PrintError(RuntimeError):
    pass


def _run(cmd: list[str]) -> subprocess.CompletedProcess:
    return subprocess.run(cmd, capture_output=True, text=True)


def _submit(image_path: Path) -> str:
    cmd = [
        "lp",
        "-d", config.PRINTER_NAME,
        "-o", "fit-to-page",
        "-o", "media=A4",
        str(image_path),
    ]
    result = _run(cmd)
    if result.returncode != 0:
        raise PrintError(
            f"Falló al mandar el trabajo (código {result.returncode}): "
            f"{result.stderr.strip() or result.stdout.strip()}"
        )
    match = _JOB_ID_RE.search(result.stdout)
    if not match:
        raise PrintError(f"Respuesta inesperada de 'lp': {result.stdout.strip()!r}")
    return match.group(1)


def _job_ids_in_queue() -> list[str]:
    result = _run(["lpstat", "-o", config.PRINTER_NAME])
    return [line.split()[0] for line in result.stdout.splitlines() if line.strip()]


def cancel_job(job_id: str) -> None:
    _run(["cancel", job_id])


def print_image(image_path: Path) -> None:
    """Manda el archivo a imprimir y espera confirmación.

    Requiere que la impresora ya esté agregada en CUPS (ver README) y que
    PRINTER_NAME en .env coincida con el nombre de la cola (`lpstat -p -d`).

    Si la impresora no lo procesa dentro de PRINT_TIMEOUT_SECONDS (sin
    papel, apagada, atascada...), cancela el trabajo para que no quede
    acumulado en la cola y levanta PrintError.
    """
    if not config.PRINTER_NAME:
        raise PrintError(
            "No configuraste PRINTER_NAME en el .env. "
            "Corré 'lpstat -p -d' en la Raspberry Pi para ver el nombre de la cola."
        )

    if not image_path.exists():
        raise PrintError(f"No existe el archivo a imprimir: {image_path}")

    job_id = _submit(image_path)
    log.info("Trabajo de impresión enviado: %s", job_id)

    deadline = time.time() + config.PRINT_TIMEOUT_SECONDS
    while time.time() < deadline:
        if job_id not in _job_ids_in_queue():
            log.info("Trabajo %s salió de la cola (impreso).", job_id)
            return
        time.sleep(2)

    cancel_job(job_id)
    raise PrintError(
        "La impresora no respondió a tiempo (¿sin papel, sin tóner, apagada o "
        "atascada?). Cancelé el trabajo para no acumular la cola."
    )


def purge_stale_queue() -> int:
    """Cancela todo lo que haya quedado pendiente en la cola de esta impresora.

    Útil al arrancar el programa (por si quedó algo colgado de un corte de
    luz o reinicio con la impresora offline) y desde un timer periódico
    como red de seguridad adicional. Devuelve cuántos trabajos canceló.
    """
    if not config.PRINTER_NAME:
        return 0
    job_ids = _job_ids_in_queue()
    for job_id in job_ids:
        cancel_job(job_id)
    if job_ids:
        log.info("Cola limpiada: %d trabajo(s) cancelado(s): %s", len(job_ids), job_ids)
    return len(job_ids)
