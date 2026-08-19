#!/bin/bash
# Instalación en una Raspberry Pi OS (Bookworm) recién instalada.
# Corré este script parado en la carpeta del proyecto: bash scripts/setup_pi.sh
set -euo pipefail

echo "== Actualizando paquetes =="
sudo apt update
sudo apt install -y \
  python3-venv python3-pip python3-dev \
  cups printer-driver-hpcups hplip \
  portaudio19-dev libportaudio2 \
  chromium-browser unclutter \
  git curl

echo "== Habilitando CUPS y agregando el usuario al grupo lpadmin =="
sudo systemctl enable --now cups
sudo usermod -aG lpadmin "$USER"

# En Raspberry Pi OS Bookworm (Pi 4/5) gpiozero necesita lgpio.
# En modelos más viejos con Bullseye, RPi.GPIO ya funciona sin este paquete.
echo "== Instalando soporte GPIO (lgpio) =="
sudo apt install -y python3-lgpio || echo "python3-lgpio no disponible via apt, se intentará por pip"

echo "== Creando entorno virtual e instalando dependencias Python =="
python3 -m venv --system-site-packages venv
source venv/bin/activate
pip install --upgrade pip
pip install -r requirements.txt

echo "== Listo =="
echo "Ahora:"
echo "  1) Copiá .env.example a .env y completá OPENAI_API_KEY, PRINTER_NAME y los pines GPIO."
echo "  2) Agregá la impresora HP en CUPS (ver README, sección 'Impresora')."
echo "  3) Instalá el servicio systemd (ver README, sección 'Arranque automático')."
