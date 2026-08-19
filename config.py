"""Carga de configuración desde variables de entorno (.env)."""
import os
from pathlib import Path

from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parent

load_dotenv(BASE_DIR / ".env")


def _get_bool(name: str, default: bool) -> bool:
    val = os.getenv(name)
    if val is None:
        return default
    return val.strip().lower() in {"1", "true", "yes", "on"}


OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "")

PRINTER_NAME = os.getenv("PRINTER_NAME", "")

BUTTON_RECORD_PIN = int(os.getenv("BUTTON_RECORD_PIN", "17"))
BUTTON_PRINT_PIN = int(os.getenv("BUTTON_PRINT_PIN", "27"))

RECORD_MIN_SECONDS = float(os.getenv("RECORD_MIN_SECONDS", "0.3"))
RECORD_MAX_SECONDS = float(os.getenv("RECORD_MAX_SECONDS", "8"))

AUDIO_INPUT_DEVICE = os.getenv("AUDIO_INPUT_DEVICE") or None
SAMPLE_RATE = int(os.getenv("SAMPLE_RATE", "16000"))

# Vertical (1024x1536) en vez de cuadrado: se parece más a la proporción de
# una hoja A4, así que al imprimir con fit-to-page aprovecha más la hoja
# (menos franjas blancas arriba/abajo). gpt-image-1 solo acepta
# "1024x1024", "1024x1536", "1536x1024" o "auto".
IMAGE_SIZE = os.getenv("IMAGE_SIZE", "1024x1536")

WEB_PORT = int(os.getenv("WEB_PORT", "5000"))
WEB_HOST = os.getenv("WEB_HOST", "127.0.0.1")

PRINT_COOLDOWN_SECONDS = float(os.getenv("PRINT_COOLDOWN_SECONDS", "5"))

# Cuánto esperar a que la impresora confirme un trabajo antes de darlo por
# colgado y cancelarlo (para no acumular dibujos en la cola si la
# impresora está sin papel, apagada, atascada, etc.)
PRINT_TIMEOUT_SECONDS = float(os.getenv("PRINT_TIMEOUT_SECONDS", "25"))

GENERATED_DIR = BASE_DIR / "web" / "static" / "generated"
RECORDINGS_DIR = BASE_DIR / "recordings"

GENERATED_DIR.mkdir(parents=True, exist_ok=True)
RECORDINGS_DIR.mkdir(parents=True, exist_ok=True)

# Modelos de OpenAI usados
STT_MODEL = os.getenv("STT_MODEL", "whisper-1")
IMAGE_MODEL = os.getenv("IMAGE_MODEL", "gpt-image-1")
TRANSCRIPTION_LANGUAGE = os.getenv("TRANSCRIPTION_LANGUAGE", "es")
