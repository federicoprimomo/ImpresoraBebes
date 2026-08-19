#!/bin/bash
# Espera a que el backend esté levantado y abre Chromium en modo kiosco
# apuntando a la pantalla de la app.

URL="http://127.0.0.1:5000"

# Espera hasta 30s a que el servidor web responda antes de abrir el navegador
for i in $(seq 1 30); do
  if curl -s -o /dev/null "$URL"; then
    break
  fi
  sleep 1
done

# Oculta el cursor del mouse (útil en pantallas táctiles) si está instalado unclutter
if command -v unclutter >/dev/null 2>&1; then
  unclutter -idle 0.1 -root &
fi

chromium-browser \
  --kiosk \
  --noerrdialogs \
  --disable-infobars \
  --disable-session-crashed-bubble \
  --check-for-update-interval=31536000 \
  --incognito \
  "$URL"
