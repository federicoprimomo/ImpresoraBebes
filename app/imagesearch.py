"""Búsqueda de dibujos para colorear en Google Imágenes, como alternativa
gratuita a generarlos con IA. Cuál se usa se elige con IMAGE_SOURCE en el
.env (ver app/controller.py).

Usa la Custom Search JSON API de Google — es la única forma soportada de
buscar en Google por código; scrapear google.com/search directamente viola
sus términos de uso y es frágil (se rompe con cualquier cambio de diseño,
termina bloqueado con captchas).

Cuota: 100 búsquedas gratis por día. Si NO habilitás facturación en el
proyecto de Google Cloud, pasada esa cuota las búsquedas simplemente
fallan con error — nunca te cobra un centavo. Este módulo, además, lleva
su propio contador local (SEARCH_DAILY_LIMIT en .env) para avisar con un
mensaje amigable en pantalla antes de gastar la cuota real de Google.

No hay fallback automático a la generación con IA si la búsqueda no
encuentra nada: a propósito, para no terminar gastando de la API paga sin
querer. Ver README, sección "Buscar en vez de generar (gratis)".
"""
from __future__ import annotations

import json
import logging
import time
from datetime import date
from io import BytesIO
from pathlib import Path

import requests
from PIL import Image

import config
from app.imageutil import trim_whitespace

log = logging.getLogger("impresorabebes.imagesearch")

SEARCH_URL = "https://www.googleapis.com/customsearch/v1"

# Términos que se agregan a lo que dijo el chico, para que la búsqueda
# devuelva dibujos de línea en vez de fotos, renders o posters.
QUERY_SUFFIX = "coloring page black and white line art para colorear"

# Cuántos resultados candidatos se revisan como máximo por pedido.
MAX_CANDIDATES = 8

# Qué fracción de píxeles "de color" (no blanco/negro/gris) tolera un
# candidato para seguir considerándolo un dibujo de línea y no una foto.
_MAX_COLOR_FRACTION = 0.08

_USAGE_FILE = config.BASE_DIR / "search_usage.json"


class SearchError(RuntimeError):
    """Error genérico de búsqueda."""


class QuotaExceeded(SearchError):
    """Se llegó al límite (local o de Google) de búsquedas del día."""


class NoResultsFound(SearchError):
    """La búsqueda no devolvió ningún candidato que pareciera un dibujo
    de línea para colorear."""


def _load_usage() -> dict:
    today = str(date.today())
    if not _USAGE_FILE.exists():
        return {"date": today, "count": 0}
    try:
        data = json.loads(_USAGE_FILE.read_text())
    except (OSError, json.JSONDecodeError):
        return {"date": today, "count": 0}
    if data.get("date") != today:
        return {"date": today, "count": 0}
    return data


def _bump_usage() -> None:
    data = _load_usage()
    data["count"] = data.get("count", 0) + 1
    _USAGE_FILE.write_text(json.dumps(data))


def _check_local_quota() -> None:
    data = _load_usage()
    if data.get("count", 0) >= config.SEARCH_DAILY_LIMIT:
        raise QuotaExceeded(
            f"Ya se usaron las {config.SEARCH_DAILY_LIMIT} búsquedas gratis de hoy."
        )


def _is_mostly_bw(img: Image.Image, sample_size: int = 200) -> bool:
    """Heurística: ¿la imagen es mayormente blanco/negro (dibujo de línea)
    en vez de una foto o ilustración a color?"""
    small = img.convert("RGB").resize((sample_size, sample_size))
    pixels = list(small.getdata())
    colorful = sum(1 for r, g, b in pixels if max(r, g, b) - min(r, g, b) > 40)
    return (colorful / len(pixels)) <= _MAX_COLOR_FRACTION


def find_coloring_page(subject_text: str) -> Path:
    """Busca en Google Imágenes un dibujo para colorear sobre el tema
    pedido, descarga el primer candidato que parezca un dibujo de línea
    (no una foto a color), lo recorta al contenido, y lo guarda.

    Devuelve el path. Levanta QuotaExceeded o NoResultsFound (ambas
    subclases de SearchError) en esos casos particulares.
    """
    if not config.GOOGLE_SEARCH_API_KEY or not config.GOOGLE_SEARCH_ENGINE_ID:
        raise SearchError(
            "Falta configurar GOOGLE_SEARCH_API_KEY / GOOGLE_SEARCH_ENGINE_ID en el .env "
            "(ver README, sección 'Buscar en vez de generar')."
        )

    _check_local_quota()

    query = f"{subject_text.strip()} {QUERY_SUFFIX}"
    params = {
        "key": config.GOOGLE_SEARCH_API_KEY,
        "cx": config.GOOGLE_SEARCH_ENGINE_ID,
        "q": query,
        "searchType": "image",
        "safe": "active",  # SafeSearch: fundamental tratándose de una app para chicos
        "num": MAX_CANDIDATES,
    }

    response = requests.get(SEARCH_URL, params=params, timeout=15)
    _bump_usage()  # contamos el intento aunque falle: consumió cuota real de Google igual

    if response.status_code == 429 or "quota" in response.text.lower():
        raise QuotaExceeded("Google avisó que se acabó la cuota gratis de búsquedas de hoy.")
    if response.status_code != 200:
        raise SearchError(f"Falló la búsqueda (código {response.status_code}): {response.text[:200]}")

    items = response.json().get("items", [])
    if not items:
        raise NoResultsFound(f"No encontré ningún resultado para '{subject_text}'.")

    for item in items:
        image_url = item.get("link")
        if not image_url:
            continue
        try:
            img_response = requests.get(image_url, timeout=8)
            img_response.raise_for_status()
            img = Image.open(BytesIO(img_response.content)).convert("RGB")
        except Exception as exc:  # noqa: BLE001 - candidato roto, probamos el siguiente
            log.info("Candidato descartado (%s): %s", image_url, exc)
            continue

        if not _is_mostly_bw(img):
            log.info("Candidato descartado por no parecer blanco/negro: %s", image_url)
            continue

        img = trim_whitespace(img)
        filename = f"dibujo_{int(time.time())}.png"
        out_path = config.GENERATED_DIR / filename
        img.save(out_path)
        return out_path

    raise NoResultsFound(
        f"Encontré resultados para '{subject_text}' pero ninguno parecía un dibujo para colorear."
    )
