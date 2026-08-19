#!/bin/bash
# Configura la cola de CUPS ya agregada (ver README, sección "Impresora")
# para que:
#   - ante un error (sin papel, atascada, offline) cancele el trabajo en
#     vez de reintentar para siempre (printer-error-policy=abort-job)
#   - use A4 y "ajustar a la hoja" por defecto
#
# Uso: bash scripts/configure_printer.sh
# (lee PRINTER_NAME del .env del proyecto)
set -euo pipefail

cd "$(dirname "$0")/.."

if [ -f .env ]; then
  set -a
  source .env
  set +a
fi

: "${PRINTER_NAME:?Falta PRINTER_NAME. Definilo en .env o exportalo antes de correr este script.}"

if ! lpstat -p "$PRINTER_NAME" >/dev/null 2>&1; then
  echo "No encuentro una cola llamada '$PRINTER_NAME'. Agregala primero (ver README, sección Impresora)."
  echo "Colas disponibles:"
  lpstat -p || true
  exit 1
fi

echo "Configurando la cola '$PRINTER_NAME'..."
sudo lpadmin -p "$PRINTER_NAME" -o printer-error-policy=abort-job
lpoptions -p "$PRINTER_NAME" -o media=A4 -o fit-to-page -o print-quality=4

echo "Listo. Política de error: abort-job (cancela el trabajo fallido en vez de reintentar sin parar)."
echo "Opciones actuales de la cola:"
lpoptions -p "$PRINTER_NAME" -l || true
