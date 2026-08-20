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
   por USB, vía CUPS. Antes de intentarlo, el sistema ya sabe si la
   impresora está lista o no (chequeo periódico en segundo plano, se ve
   como un cartelito 🖨️ arriba a la derecha de la pantalla) y avisa al
   toque si está offline en vez de hacerte esperar.

Todo el flujo corre local en la Raspberry Pi, salvo las dos llamadas a la
API de OpenAI (transcripción y generación de imagen), que necesitan
internet.

Los botones **físicos son opcionales**: además de los pulsadores GPIO, la
pantalla siempre acepta controles de teclado (mantener **espacio** = botón
1, **Enter** = botón 2) — sirven para probar todo el flujo en cualquier PC
sin tener la Raspberry Pi ni los botones armados (ver sección "Probar en
Windows o en una PC sin la Raspberry Pi" más abajo), y también quedan
como respaldo si algún botón físico se rompe.

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

## 3. Impresora (HP LaserJet Pro M12, CUPS)

La M12 es una impresora "de gama chica": no habla PostScript nativo, así
que Linux la maneja a través de **HPLIP** (`hplip`, ya instalado por
`scripts/setup_pi.sh`), que trae el driver `hpcups`. No hace falta ningún
driver de Windows/Mac ni nada de HP aparte de eso.

1. Conectá la impresora por USB y encendela.
2. Corré el asistente de HPLIP, que detecta el modelo solo y agrega la cola
   en CUPS:
   ```bash
   hp-setup -i
   ```
   Si te pide instalar un "plugin" propietario de HP (pasa con algunos
   modelos, sobre todo si tienen wifi), aceptá — lo descarga e instala
   `hp-plugin`.
3. Alternativa manual, si preferís no usar el asistente:
   ```bash
   lpinfo -v                 # buscá una línea "usb://HP/LaserJet%20MFP%20M12..."
   sudo lpadmin -p HP_LaserJet -E -v "usb://HP/LaserJet%20..." -m everywhere
   ```
   O por la interfaz web de CUPS: `http://localhost:631` →
   `Administration` → `Add Printer`.
4. Anotá el **nombre de la cola** que quedó (por ejemplo `HP_LaserJet`) y
   ponelo en `PRINTER_NAME` en el `.env`:
   ```bash
   lpstat -p -d
   ```
5. Corré el script que deja la cola configurada con `fit-to-page`, A4 y la
   política de error que evita que se acumulen trabajos colgados (ver
   sección siguiente):
   ```bash
   bash scripts/configure_printer.sh
   ```
6. Probalo:
   ```bash
   lp -d HP_LaserJet -o fit-to-page -o media=A4 algún_archivo.png
   ```

### Ajuste de la imagen a la hoja

Que el dibujo ocupe bien la hoja depende de tres cosas, no solo de una:

1. **Proporción de la imagen generada**: se pide vertical (1024×1536, ver
   `IMAGE_SIZE` en `.env`) en vez de cuadrada, porque se parece más a una
   hoja A4.
2. **Recorte automático del margen blanco** (`app/imagegen.py`,
   `_trim_whitespace`): esta es la parte importante que se me había
   pasado al principio. Aunque la imagen tenga la proporción justa, el
   modelo puede devolver el dibujo chico y centrado con mucho borde blanco
   alrededor — y ese borde blanco, para la impresora, es "parte del
   dibujo", así que ni el tamaño de imagen ni el `fit-to-page` lo
   arreglan solos. Por eso, antes de guardar cada imagen generada, se
   recortan automáticamente los márgenes blancos hasta el contenido real
   del dibujo (con un colchón chico alrededor para que no quede pegado al
   borde de la hoja). El prompt también le pide al modelo que dibuje
   grande y llene el cuadro, pero el recorte es lo que lo garantiza pase
   lo que pase.
3. **`fit-to-page` al imprimir** (`-o fit-to-page -o media=A4` en Linux, o
   el escalado equivalente en `printer_windows.py`): ya con el dibujo
   recortado a su contenido real, esto lo agranda hasta ocupar el máximo
   de la hoja A4 posible sin cortar nada, manteniendo la proporción.

## 4. Cola de impresión que se limpia sola

Para que un problema de la impresora (sin papel, sin tóner, apagada,
atascada) no vaya dejando dibujos acumulados en la cola, hay tres capas:

1. **Por trabajo**: `app/printer.py` espera a que el trabajo salga de la
   cola después de mandarlo (`PRINT_TIMEOUT_SECONDS` en `.env`, 25s por
   defecto). Si no sale a tiempo, lo cancela solo y la pantalla muestra un
   error en vez de quedarse esperando.
2. **Al arrancar**: `app/main.py` purga cualquier trabajo que haya quedado
   pendiente de un reinicio anterior (por ejemplo, un corte de luz con la
   impresora offline).
3. **Timer periódico** (red de seguridad extra, cada 10 minutos):
   ```bash
   sudo cp systemd/impresorabebes-cleanup.service /etc/systemd/system/
   sudo cp systemd/impresorabebes-cleanup.timer /etc/systemd/system/
   sudo nano /etc/systemd/system/impresorabebes-cleanup.service  # ajustá User/WorkingDirectory si hace falta
   sudo systemctl daemon-reload
   sudo systemctl enable --now impresorabebes-cleanup.timer
   ```

Además, `scripts/configure_printer.sh` (paso 5 de arriba) le pone a la
cola `printer-error-policy=abort-job`, para que CUPS mismo cancele un
trabajo que falla en vez de reintentarlo sin parar.

## 5. Arranque automático

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

## 6. Probarlo sin reiniciar

```bash
source venv/bin/activate
python -m app.main
# en otra terminal / u otra pestaña del navegador:
chromium-browser --kiosk http://127.0.0.1:5000
```

Apretá el botón 1, decí algo, soltalo, esperá el dibujo, apretá el botón 2.
(Si no tenés los botones armados todavía, usá el teclado: mantené
**espacio** en vez del botón 1, **Enter** en vez del botón 2 — ver sección
siguiente.)

## 7. Probar en Windows o en una PC sin la Raspberry Pi

Todo el proyecto corre igual en Windows — la única diferencia es que ahí no
hay pines GPIO, así que los botones físicos se reemplazan por teclado, y la
impresión no usa CUPS sino la API nativa de impresión de Windows.

1. Instalá Python 3.11+ y cloná el repo.
2. Creá el entorno e instalá dependencias (en Windows, `pip` instala
   automáticamente `pywin32` en vez de `gpiozero`, gracias a los
   marcadores de plataforma en `requirements.txt`):
   ```powershell
   python -m venv venv
   venv\Scripts\activate
   pip install -r requirements.txt
   ```
3. Copiá `.env.example` a `.env` y completá `OPENAI_API_KEY`.
4. **Impresora**: dejá `PRINTER_NAME` vacío para usar la impresora
   predeterminada de Windows, o poné el nombre exacto de otra impresora tal
   como figura en `Configuración → Bluetooth y dispositivos → Impresoras y
   escáneres` (o con PowerShell: `Get-Printer | Select Name`).
5. Corré la app:
   ```powershell
   python -m app.main
   ```
   Al arrancar vas a ver en la consola un aviso de que gpiozero no está
   disponible — es esperado, no es un error: significa que quedó
   funcionando solo con teclado/pantalla.
6. Abrí `http://127.0.0.1:5000` en el navegador. Mantené apretada la
   **barra espaciadora** para grabar (necesita micrófono en la PC), soltala
   para que transcriba y genere el dibujo, y apretá **Enter** para
   imprimirlo en la impresora de Windows.

Esto sirve para probar y ajustar todo el flujo (voz → dibujo → impresión)
sin depender de tener la Raspberry Pi armada. El despliegue final para los
chicos sigue siendo la Raspberry Pi con los botones físicos + CUPS, tal
como está descripto en las secciones anteriores.

## 8. Buscar en vez de generar (gratis)

En vez de generar cada dibujo con IA (que tiene costo por imagen), podés
configurar el sistema para que **busque un dibujo para colorear ya
existente en Google Imágenes** — gratis, dentro de una cuota diaria.

Lo que se pierde con esta opción: no podés pedir combinaciones inventadas
("Spiderman tomando mate") — busca lo que ya exista publicado en internet
con esas palabras. Lo que se gana: no cuesta nada por imagen (solo sigue
teniendo costo, chico, la transcripción de voz con Whisper).

### Cómo se elige

Es un simple switch en el `.env`:

```bash
IMAGE_SOURCE=generate   # como hasta ahora (gpt-image-1, con costo)
IMAGE_SOURCE=search     # Google Imágenes (gratis dentro de la cuota)
```

### Setup de la búsqueda (una sola vez)

La única forma soportada de buscar en Google por código es la **Custom
Search JSON API** (no se scrapea Google directamente: viola sus términos
de uso y es frágil). Tiene **100 búsquedas gratis por día**; superada esa
cuota, si **no habilitaste facturación** en el proyecto de Google Cloud,
las búsquedas simplemente fallan con error — nunca te cobra un centavo.
Para un uso de 2 chicos jugando en casa, 100/día alcanza de sobra.

1. Andá a [Programmable Search Engine](https://programmablesearchengine.google.com/)
   y creá un motor de búsqueda nuevo:
   - "Sites to search": elegí buscar en toda la web.
   - Activá la opción "Image search".
2. Copiá el **Search engine ID** (`cx`) que te da, y ponelo en
   `GOOGLE_SEARCH_ENGINE_ID` en el `.env`.
3. Andá a la [consola de Google Cloud](https://console.cloud.google.com/),
   creá (o usá) un proyecto, habilitá la **"Custom Search API"**, y creá
   una **API key** (`APIs & Services → Credentials`).
   - **Importante**: no le asocies una cuenta de facturación a este
     proyecto si querés la garantía de $0 — así, pasada la cuota gratis,
     las búsquedas fallan en vez de cobrarte.
4. Copiá esa API key en `GOOGLE_SEARCH_API_KEY` en el `.env`.
5. Poné `IMAGE_SOURCE=search`.

### Cómo elige el dibujo

Para cada pedido, `app/imagesearch.py` arma la búsqueda agregando términos
como `coloring page black and white line art` a lo que dijo el chico (así
prioriza dibujos de línea en vez de fotos), activa SafeSearch, y de los
primeros resultados descarta los que no sean mayormente blanco y negro
(heurística simple sobre los píxeles) hasta encontrar uno que sí lo sea.
Si no encuentra ninguno, o si se acabó la cuota del día, la pantalla lo
avisa y no imprime nada — **no hay fallback automático a la generación con
IA**, justamente para no terminar gastando de la API paga sin querer.

## Estructura del proyecto

```
app/
  main.py         arranque: botones, watcher de impresora y servidor web
  controller.py   la lógica del flujo en sí (botones físicos, teclado y
                   HTTP llaman a las mismas funciones acá)
  gpio_buttons.py configuración de los dos pulsadores (gpiozero); si no hay
                   GPIO disponible (Windows, PC de desarrollo) no rompe,
                   solo deshabilita los botones físicos
  audio.py        grabación push-to-talk del micrófono
  speech.py       transcripción de audio -> texto (OpenAI Whisper)
  moderation.py   chequeo de contenido antes de generar la imagen
  imagegen.py     fuente 1: generación del dibujo con IA (OpenAI gpt-image-1)
  imagesearch.py  fuente 2: búsqueda del dibujo en Google Imágenes (gratis)
  imageutil.py    recorte de márgenes blancos, compartido por ambas fuentes
  printer.py      elige el backend de impresión según el sistema operativo
  printer_linux.py    impresión vía CUPS (`lp`) + limpieza de cola — Raspberry Pi
  printer_windows.py  impresión nativa de Windows (pywin32) — para probar sin la Pi
  printer_cleanup.py  tarea corta para el timer periódico de limpieza (Linux)
  state.py        estado compartido (incluye si la impresora está lista) +
                   notificación a la pantalla (SSE)
  web.py          servidor Flask: sirve la pantalla y los endpoints de
                   teclado (/api/record/start, /api/record/stop, /api/print)
web/
  templates/index.html   pantalla que ven los chicos
  static/css, static/js  estilos y lógica de la pantalla (se actualiza sola)
  static/generated/      dibujos generados (no se versionan en git)
systemd/          units de systemd (backend, limpieza de cola) + autostart del navegador en kiosco
scripts/          instalación, configuración de la impresora y arranque del kiosco
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
moderación antes de generar nada (aplica con `IMAGE_SOURCE=generate` y con
`IMAGE_SOURCE=search`, porque filtra el texto del pedido, no la imagen).
Con `IMAGE_SOURCE=search` además se activa SafeSearch de Google en cada
búsqueda. Si por algún motivo aparece un dibujo que no te convence, el
botón de imprimir es un paso aparte y separado — podés supervisar la
pantalla antes de dejarlos apretar "imprimir".

Nota sobre copyright: con `IMAGE_SOURCE=generate`, el dibujo es una imagen
100% nueva creada por IA, no una reproducción de arte oficial de ningún
personaje. Con `IMAGE_SOURCE=search`, en cambio, vas a estar mostrando e
imprimiendo imágenes reales de la web (que sí pueden tener copyright, por
ejemplo si buscan un personaje de Marvel/Disney) — para uso personal y no
comercial en casa es lo mismo que buscar "spiderman para colorear" a mano
y mandarlo a imprimir, una actividad perfectamente normal.

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
- **El cartelito 🖨️ de la pantalla dice "no lista" todo el tiempo**: en
  Linux, corré `lpstat -p $PRINTER_NAME` a mano y fijate qué dice CUPS
  (pausada, sin papel, offline). En Windows, `Get-Printer` en PowerShell
  muestra el estado, y confirmá que `PRINTER_NAME` en `.env` coincida
  exactamente con el nombre real (o dejalo vacío para usar la
  predeterminada).
- **En Windows tira error de pywin32 al imprimir**: confirmá que
  `pip install -r requirements.txt` haya corrido en Windows (no reusando un
  venv creado en Linux) — ahí es donde se instala `pywin32` automáticamente.
