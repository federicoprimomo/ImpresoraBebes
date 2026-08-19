"""Estado compartido de la aplicación + mecanismo simple de pub/sub para
avisarle a la pantalla (vía Server-Sent Events) cuando algo cambia.
"""
from __future__ import annotations

import queue
import threading
import time
from dataclasses import dataclass, field, asdict
from typing import Optional


# Estados posibles que se muestran en pantalla
IDLE = "idle"                  # esperando que aprieten el botón
LISTENING = "listening"        # botón 1 apretado, grabando audio
TRANSCRIBING = "transcribing"  # convirtiendo el audio a texto
MODERATING = "moderating"      # chequeando que el pedido sea apto
GENERATING = "generating"      # generando el dibujo con la API de imágenes
READY = "ready"                 # dibujo listo para mostrar / imprimir
PRINTING = "printing"          # enviando a la impresora
ERROR = "error"                # algo falló, mostrar mensaje y volver a idle


@dataclass
class AppState:
    status: str = IDLE
    message: str = ""
    heard_text: str = ""
    image_url: Optional[str] = None
    updated_at: float = field(default_factory=time.time)

    def as_dict(self) -> dict:
        return asdict(self)


class StateBus:
    """Guarda el estado actual y notifica a los clientes SSE conectados."""

    def __init__(self) -> None:
        self._lock = threading.Lock()
        self._state = AppState()
        self._subscribers: list[queue.Queue] = []

    def get(self) -> AppState:
        with self._lock:
            return self._state

    def set(self, **kwargs) -> None:
        with self._lock:
            current = asdict(self._state)
            current.update(kwargs)
            current["updated_at"] = time.time()
            self._state = AppState(**current)
            snapshot = self._state.as_dict()
            subs = list(self._subscribers)
        for q in subs:
            q.put(snapshot)

    def subscribe(self) -> "queue.Queue":
        q: queue.Queue = queue.Queue()
        with self._lock:
            self._subscribers.append(q)
            q.put(self._state.as_dict())
        return q

    def unsubscribe(self, q: "queue.Queue") -> None:
        with self._lock:
            if q in self._subscribers:
                self._subscribers.remove(q)


bus = StateBus()
