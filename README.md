# Impresora de Dibujos Mágicos 🖍️

Un aparatito para que los chicos aprieten un botón, digan qué quieren dibujar
("Spiderman tomando mate", "un dinosaurio con casco", lo que se les ocurra),
vean aparecer el dibujo para colorear en una pantalla, y con otro botón lo
manden a imprimir en la impresora láser HP.

## Cómo funciona

1. **Botón 1 (grabar)**: se mantiene apretado mientras el nene/a habla, y se
   suelta cuando termina (como un walkie-talkie).
2. El audio se transcribe con la API de OpenAI (Whisper).
3. El texto se chequea con el endpoint de moderación de OpenAI, para
   filtrar pedidos que no sean aptos, antes de gastar una generación de imagen.
4. Se genera un dibujo estilo "para colorear" (líneas negras, sin relleno)
   con la API de imágenes de OpenAI (`gpt-image-1`), usando lo que dijo como
   tema.
5. El dibujo aparece en pantalla completa.
6. **Botón 2 (imprimir)**: manda el dibujo a la impresora láser HP conectada
   por USB, vía CUPS.

Todo el flujo corre local en la Raspberry Pi, salvo las dos llamadas a la
API de OpenAI (transcripción y generación de imagen), que necesitan
internet.

> ⚠️ **Este proyecto no se probó sobre hardware real** (se generó en un
> entorno sin acceso a una Raspberry Pi física). Es un punto de partida
> sólido, pero probablemente necesites ajustar algún detalle (nombre del
> dispositivo de audio, versión de Chromium, etc.) al instalarlo.

## Qué necesitás

- Raspberry Pi (4 o 5 recomendado) con Raspberry Pi OS (Bookworm) de 64 bits.
- Pantalla/monitor conectado por HDMI (no hace falta que sea táctil).
- Micrófono USB (los más simples andan bien; evitá el mic integrado de una
  webcam barata si podés, capta mucho ruido).
- 2 pulsadores tipo arcade (los redondos grandes de colores son ideales para
  chicos) + cables dupont macho-macho o macho-hembra.
- Impresora láser HP por USB.
- Cuenta de OpenAI con API key y crédito cargado (la generación de imágenes
  y la transcripción tienen costo por uso — ver sección "Costos" abajo).

## 1. Cableado de los botones

Cada botón va entre un pin GPIO y GND. gpiozero usa el pull-up interno del
Raspberry Pi, así que **no hace falta resistencia**: cuando el botón está
apretado, conecta el pin a tierra.

```
Botón 1 (grabar/elegir dibujo)
  Pata A -> GPIO17 (pin físico 11)
  Pata B -> GND     (pin físico 9, por ejemplo)

Botón 2 (imprimir)
  Pata A -> GPIO27 (pin físico 13)
  Pata B -> GND     (pin físico 14, por ejemplo)
```

Podés usar cualquier otro par de GPIO libres; solo actualizá
`BUTTON_RECORD_PIN` y `BUTTON_PRINT_PIN` en el `.env` (la numeración es
**BCM**, no la de pin físico).

Consejo para uso con chicos: montá los botones en una cajita o tablero
firme, y separalos bien uno del otro para que no los confundan.

## 2. Instalación en la Raspberry Pi

```bash
git clone <tu-fork-de-este-repo>
cd ImpresoraBebes
bash scripts/setup_pi.sh
cp .env.example .env
nano .env   # completá OPENAI_API_KEY, PRINTER_NAME, pines GPIO, etc.
```

Para probar el micrófono y ver qué dispositivo usar:

```bash
source venv/bin/activate
python -m sounddevice
```

Anotá el nombre/índice del micrófono USB y, si hace falta, ponelo en
`AUDIO_INPUT_DEVICE` del `.env`.

## 3. Impresora (CUPS)

1. Conectá la impresora HP por USB y encendela.
2. Entrá a la interfaz de CUPS desde un navegador: `http://localhost:631`
   (o desde otra máquina en la misma red: `http://<ip-de-la-pi>:631`, si
   habilitaste acceso remoto).
3. `Administration` → `Add Printer`, elegí la HP detectada por USB, y
   seguí el asistente (el driver `hpcups` que instalamos con `hplip` suele
   detectarla sola).
4. Anotá el **nombre de la cola** que le pusiste (por ejemplo `HP_LaserJet`)
   y ponelo en `PRINTER_NAME` en el `.env`.
5. Probalo por línea de comandos:
   ```bash
   lpstat -p -d
   lp -d HP_LaserJet -o fit-to-page algún_archivo.png
   ```

Si preferís la vía rápida por terminal en vez de la web de CUPS:

```bash
lpinfo -v                 # lista impresoras detectadas, buscá una línea "usb://HP/..."
sudo lpadmin -p HP_LaserJet -E -v "usb://HP/LaserJet%20..." -m everywhere
```

## 4. Arranque automático

### Backend (botones + servidor web)

```bash
sudo cp systemd/impresorabebes.service /etc/systemd/system/
sudo nano /etc/systemd/system/impresorabebes.service   # ajustá User y WorkingDirectory si hace falta
sudo systemctl daemon-reload
sudo systemctl enable --now impresorabebes.service
sudo systemctl status impresorabebes.service
```

### Pantalla en modo kiosco (Chromium a pantalla completa)

Raspberry Pi OS Bookworm arranca el escritorio y lee autostarts de
`~/.config/autostart/`:

```bash
mkdir -p ~/.config/autostart
cp systemd/impresorabebes-kiosk.desktop ~/.config/autostart/
# revisá que la ruta dentro del .desktop (Exec=) apunte a tu carpeta real del proyecto
```

Configurá la Raspberry Pi para que **inicie sesión automáticamente en el
escritorio** (`raspi-config` → `System Options` → `Boot / Auto Login` →
`Desktop Autologin`), así el kiosco arranca solo sin pedir usuario/contraseña.

Reiniciá (`sudo reboot`) y debería levantar todo solo: backend + navegador
en pantalla completa mostrando la app.

## 5. Probarlo sin reiniciar

```bash
source venv/bin/activate
python -m app.main
# en otra terminal / u otra pestaña del navegador:
chromium-browser --kiosk http://127.0.0.1:5000
```

Apretá el botón 1, decí algo, soltalo, esperá el dibujo, apretá el botón 2.

## Estructura del proyecto

```
app/
  main.py         orquestador: conecta botones, estado y el flujo completo
  gpio_buttons.py configuración de los dos pulsadores (gpiozero)
  audio.py        grabación push-to-talk del micrófono
  speech.py       transcripción de audio -> texto (OpenAI Whisper)
  moderation.py   chequeo de contenido antes de generar la imagen
  imagegen.py     generación del dibujo para colorear (OpenAI gpt-image-1)
  printer.py      envío a imprimir vía CUPS (`lp`)
  state.py        estado compartido + notificación a la pantalla (SSE)
  web.py          servidor Flask que sirve la pantalla del kiosco
web/
  templates/index.html   pantalla que ven los chicos
  static/css, static/js  estilos y lógica de la pantalla (se actualiza sola)
  static/generated/      dibujos generados (no se versionan en git)
systemd/          unit de systemd + autostart del navegador en kiosco
scripts/          instalación y arranque del kiosco
```

## Costos y uso de la API

Cada vez que se aprieta el botón 1 y se genera un dibujo, se hacen **2
llamadas pagas** a la API de OpenAI: una transcripción de audio y una
generación de imagen. Con chicos jugando libremente esto puede sumar
rápido. Sugerencias:

- Cargá un límite de gasto mensual en tu cuenta de OpenAI
  (`platform.openai.com` → `Billing` → `Limits`).
- `RECORD_MIN_SECONDS` en el `.env` evita que un toque accidental dispare
  una generación (ignora grabaciones muy cortas).
- `PRINT_COOLDOWN_SECONDS` evita imprimir varias veces seguidas por
  apretar de más el botón 2 (no vuelve a llamar a la API, pero cuida el
  papel/tóner).

## Seguridad de contenido

Como el pedido lo arma libremente un chico por voz, además de los filtros
propios de las APIs de OpenAI, el texto transcripto pasa por el endpoint de
moderación antes de generar nada. Si por algún motivo se genera un dibujo
que no te convence, el botón de imprimir es un paso aparte y separado —
podés supervisar la pantalla antes de dejarlos apretar "imprimir".

## Problemas comunes

- **"No pude imprimir"**: revisá `PRINTER_NAME` en `.env` contra
  `lpstat -p -d`, y que la cola no esté pausada (`lpstat -p` muestra el
  estado).
- **No detecta el micrófono / graba silencio**: confirmá el dispositivo con
  `python -m sounddevice` y seteá `AUDIO_INPUT_DEVICE`.
- **Los botones no responden**: confirmá el cableado con
  `pinout` (viene con Raspberry Pi OS) y que estés usando numeración BCM en
  el `.env`. En Pi 5, si gpiozero tira error de "pin factory", instalá
  `python3-lgpio` (`sudo apt install python3-lgpio`) y recreá el venv con
  `--system-site-packages`.
- **Chromium no abre en kiosco al bootear**: confirmá el autologin de
  escritorio en `raspi-config` y que la ruta `Exec=` del `.desktop` sea
  correcta.
