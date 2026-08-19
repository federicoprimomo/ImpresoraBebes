"""Servidor web local que muestra la pantalla para los chicos.

Se sirve en localhost y se abre en un navegador en modo kiosco (ver
systemd/ y README). Usa Server-Sent Events para actualizar la pantalla en
tiempo real a medida que cambia el estado (escuchando, dibujando, listo...).
"""
from __future__ import annotations

import json
from pathlib import Path

from flask import Flask, Response, render_template

from app import controller, state

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

    # --- Controles de teclado, para probar sin los botones físicos ---
    # (también sirven como control alternativo en la Raspberry Pi si algún
    # botón físico falla). Mantener apretada la barra espaciadora = botón 1,
    # Enter = botón 2. Ver web/static/js/app.js.

    @app.route("/api/record/start", methods=["POST"])
    def api_record_start():
        controller.on_record_pressed()
        return ("", 204)

    @app.route("/api/record/stop", methods=["POST"])
    def api_record_stop():
        controller.on_record_released()
        return ("", 204)

    @app.route("/api/print", methods=["POST"])
    def api_print():
        controller.on_print_pressed()
        return ("", 204)

    return app
