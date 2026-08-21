# YT Car Player (proyecto personal)

App Android **personal, no destinada a Play Store**, para buscar y reproducir
videos de YouTube desde el teléfono y, con limitaciones, desde la pantalla de
Android Auto de un Chevrolet Tracker 2024 (u otro auto con Android Auto
proyectado).

## ⚠️ Antes de instalar, leé esto

**Video en la pantalla del auto mientras se maneja es ilegal en la mayoría de
las jurisdicciones**, más allá de lo que la app técnicamente permita. Esta
app no bloquea la reproducción de video con el auto en movimiento. El uso es
responsabilidad de quien la instala.

**Cómo se logra mostrar video en Android Auto (y por qué es frágil):**
Android Auto solo entrega una superficie de dibujo libre (`Surface`) a las
apps declaradas de categoría **"navigation"** — pensada para que apps de
mapas dibujen el mapa cuadro a cuadro (`androidx.car.app.AppManager.
setSurfaceCallback`). Esta app se declara "navigation" y, en lugar de dibujar
un mapa, vuelca ahí los frames de video. Es una API pública y documentada,
usada de una forma que Google no previó ni certifica:

- Puede dejar de funcionar sin aviso si Android Auto empieza a validar que el
  contenido dibujado sea efectivamente un mapa.
- Al no estar publicada en Play Store, Android Auto no la reconoce como app
  verificada: hay que activar **"Fuentes desconocidas"** en la configuración
  de desarrollador de la app Android Auto del teléfono para que aparezca en
  el auto (ver más abajo).
- No hay ningún tipo de soporte ni garantía de que siga andando tras una
  actualización de la app Android Auto de Google.

Si en algún momento esto deja de andar, la alternativa estable (sin
depender de ningún truco) es usar una tablet o teléfono viejo montado aparte
en el auto, corriendo esta misma app como una app Android normal, con el
audio por Bluetooth al auto. La pantalla de Android Auto, en ese esquema,
queda libre para navegación/música con solo audio (ver sección "Modo
alternativo: solo audio en Android Auto" más abajo).

## Qué hace la app

- **Pantalla del teléfono**: buscador de YouTube + reproducción de video
  completo (sin restricciones, sin trucos).
- **Pantalla del auto (Android Auto)**: buscador (`SearchTemplate`, con
  teclado en pantalla o dictado por voz) → lista de resultados → reproduce
  el video ocupando la superficie de navegación, con controles de
  reproducir/pausar/volver.

No usa la YouTube Data API oficial (no hace falta API key ni depende de
cuota de Google): usa [NewPipeExtractor](https://github.com/TeamNewPipe/NewPipeExtractor),
la misma librería que usa la app NewPipe, para buscar y resolver streams
directos reproducibles con ExoPlayer/Media3.

## Requisitos para compilar

- Android Studio (Koala o más nuevo recomendado).
- JDK 17 (Android Studio ya lo trae embebido).
- Conexión a internet la primera vez, para bajar dependencias (incluye
  JitPack, de donde se baja NewPipeExtractor).

Este proyecto **no fue compilado ni corrido en este entorno** porque no hay
SDK de Android disponible acá — se escribió a mano siguiendo la API pública
documentada de `androidx.car.app` y NewPipeExtractor. Al abrirlo en Android
Studio puede necesitar ajustes menores (versión exacta de alguna
dependencia, algún import).

## Cómo instalar en tu teléfono (sideload, sin Play Store)

1. Abrí el proyecto en Android Studio.
2. Conectá el teléfono por USB con "Depuración USB" activada, o generá un
   APK (`Build > Build Bundle(s) / APK(s) > Build APK(s)`) y copialo/instalalo
   a mano.
3. Vas a necesitar permitir "Instalar apps desconocidas" para el origen que
   uses (Android Studio, el explorador de archivos, etc.), ya que la app no
   viene de Play Store.

## Cómo habilitar que aparezca en Android Auto

1. En el teléfono, abrí la app **Android Auto**.
2. Entrá a **Configuración de Android Auto** y tocá 10 veces seguidas sobre
   el número de versión, al final de la pantalla, hasta que aparezca el
   aviso de que se habilitó el modo desarrollador.
3. Andá al menú (⋮) → **Configuración para desarrolladores**.
4. Activá **"Unknown sources"** (fuentes desconocidas): esto le dice a
   Android Auto que confíe en apps instaladas fuera de Play Store.
5. Conectá el auto (cable o inalámbrico). La app debería aparecer entre las
   apps de navegación disponibles en la pantalla del Tracker.

Si tu versión de la app Android Auto no tiene ese menú visible de la misma
forma, buscá "Android Auto developer settings unknown sources" para la
versión que tengas — Google mueve este menú de vez en cuando.

## Limitaciones conocidas (MVP)

- Se prioriza un stream "muxed" (video + audio en un solo archivo) para
  simplificar el reproductor. YouTube deja de publicar formatos muxed por
  encima de ~720p, así que la resolución máxima está limitada a eso. Una
  mejora futura es combinar streams de video y audio por separado (mayor
  resolución) con `MergingMediaSource` de Media3.
- No hay control de "no reproducir video con el auto en movimiento": queda
  pendiente si se quiere agregar como salvaguarda (se podría consultar el
  estado del freno de mano / velocidad vía `CarHardwareManager` y pausar el
  video, o directamente no ofrecer video y forzar el modo solo-audio
  mientras el auto está en marcha).
- `HostValidator.ALLOW_ALL_HOSTS_VALIDATOR` acepta cualquier host de Android
  Auto sin verificar firma. Correcto para uso personal, pero si esto se
  fuera a compartir con más gente convendría restringirlo.

## Modo alternativo: solo audio en Android Auto (estable, sin trucos)

Si el modo video en la pantalla del auto deja de funcionar (por una
actualización de Google) o preferís algo estable, la alternativa
100% soportada es exponer un `MediaBrowserService`/`MediaSession` estándar:
buscador + reproducción de **solo audio** de YouTube, con carátula y
controles nativos como cualquier app de música (Spotify, YouTube Music).
Esto no está implementado en este MVP — si lo querés, es un módulo
adicional que reutiliza el mismo `YoutubeRepository`, cambiando el
`CarAppService`/pantallas de video por un servicio de media estándar.

## Estructura del proyecto

```
app/src/main/java/com/fprimomo/ytcar/
├── App.kt                       # Application: inicializa NewPipeExtractor
├── youtube/
│   ├── OkHttpDownloader.kt      # Downloader HTTP para NewPipeExtractor
│   └── YoutubeRepository.kt     # Búsqueda y resolución de streams
├── ui/                          # Pantallas del teléfono
│   ├── MainActivity.kt          # Buscador + lista
│   ├── VideoAdapter.kt
│   └── PlayerActivity.kt        # Reproductor de video completo
└── car/                         # Pantallas de Android Auto
    ├── YtCarAppService.kt       # Entry point que Android Auto instancia
    ├── YtCarSession.kt
    ├── SearchScreen.kt          # SearchTemplate: buscador + resultados
    └── VideoScreen.kt           # NavigationTemplate + Surface: video
```
