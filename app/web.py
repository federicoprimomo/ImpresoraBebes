"""Servidor web local que muestra la pantalla para los chicos.

Se sirve en localhost y se abre en un navegador en modo kiosco (ver
systemd/ y README). Usa Server-Sent Events para actualizar la pantalla en
tiempo real a medida que cambia el estado (escuchando, dibujando, listo...).
"""
from __future__ import annotations

import json
from pathlib import Path

from flask import Flask, Response, render_template

from app import state

WEB_DIR = Path(__file__).resolve().parent.parent / "web"


def create_web_app() -> Flask:
    app = Flask(
        __name__,
        template_folder=str(WEB_DIR / "templates"),
        static_folder=str(WEB_DIR / "static"),
        static_url_path="/static",
    )

    @app.route("/")
    def index():
        return render_template("index.html", initial_state=state.bus.get().as_dict())

    @app.route("/events")
    def events():
        q = state.bus.subscribe()

        def stream():
            try:
                while True:
                    data = q.get()
                    yield f"data: {json.dumps(data)}\n\n"
            finally:
                state.bus.unsubscribe(q)

        return Response(stream(), mimetype="text/event-stream")

    return app
