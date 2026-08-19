"""Grabación de audio desde el micrófono mientras se mantiene apretado el botón."""
from __future__ import annotations

import threading
import time
from pathlib import Path
from typing import Optional

import numpy as np
import sounddevice as sd
import soundfile as sf

import config


class PushToTalkRecorder:
    """Graba audio en un stream mientras `active` es True.

    Uso:
        rec = PushToTalkRecorder()
        rec.start()      # llamar cuando se aprieta el botón
        ...
        path = rec.stop()  # llamar cuando se suelta el botón; devuelve el .wav o None
    """

    def __init__(self) -> None:
        self._frames: list[np.ndarray] = []
        self._stream: Optional[sd.InputStream] = None
        self._start_time: float = 0.0
        self._lock = threading.Lock()
        self._recording = False

    def _callback(self, indata, frames, time_info, status):  # noqa: ANN001
        if status:
            pass  # los underruns/overruns se ignoran, no son fatales acá
        with self._lock:
            if self._recording:
                self._frames.append(indata.copy())

    def start(self) -> None:
        with self._lock:
            if self._recording:
                return
            self._frames = []
            self._recording = True
            self._start_time = time.time()
        self._stream = sd.InputStream(
            samplerate=config.SAMPLE_RATE,
            channels=1,
            dtype="float32",
            device=config.AUDIO_INPUT_DEVICE,
            callback=self._callback,
        )
        self._stream.start()

    def elapsed(self) -> float:
        return time.time() - self._start_time if self._recording else 0.0

    def stop(self) -> Optional[Path]:
        with self._lock:
            was_recording = self._recording
            self._recording = False
            duration = time.time() - self._start_time

        if self._stream is not None:
            self._stream.stop()
            self._stream.close()
            self._stream = None

        if not was_recording or not self._frames:
            return None

        if duration < config.RECORD_MIN_SECONDS:
            # Toque accidental, muy corto: no vale la pena mandarlo a la API.
            return None

        audio = np.concatenate(self._frames, axis=0)
        out_path = config.RECORDINGS_DIR / f"grabacion_{int(time.time())}.wav"
        sf.write(str(out_path), audio, config.SAMPLE_RATE)
        return out_path
