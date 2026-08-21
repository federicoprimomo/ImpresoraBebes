package com.fprimomo.ytcar.car

import androidx.car.app.AppManager
import androidx.car.app.CarContext
import androidx.car.app.Screen
import androidx.car.app.ScreenManager
import androidx.car.app.SurfaceCallback
import androidx.car.app.SurfaceContainer
import androidx.car.app.model.Action
import androidx.car.app.model.ActionStrip
import androidx.car.app.model.CarIcon
import androidx.car.app.model.MessageTemplate
import androidx.car.app.model.Template
import androidx.car.app.navigation.model.NavigationTemplate
import androidx.core.graphics.drawable.IconCompat
import androidx.lifecycle.DefaultLifecycleObserver
import androidx.lifecycle.LifecycleOwner
import androidx.media3.common.MediaItem
import androidx.media3.common.Player
import androidx.media3.exoplayer.ExoPlayer
import com.fprimomo.ytcar.R
import com.fprimomo.ytcar.youtube.YoutubeRepository
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext

/**
 * Pantalla que "reproduce" el video en la pantalla del auto.
 *
 * Esta app se declara categoria "navigation" (ver automotive_app_desc.xml)
 * porque es la unica categoria a la que Android Auto le entrega una Surface
 * de dibujo libre via AppManager.setSurfaceCallback: pensada para que apps
 * de mapas dibujen el mapa cuadro a cuadro. Aca la reutilizamos para volcar
 * ahi los frames de video del reproductor en lugar de un mapa.
 *
 * Esto es un uso no previsto de la API: es publica y documentada para
 * navegacion, pero Android Auto no valida que lo que se dibuje sea
 * efectivamente un mapa. Puede dejar de funcionar si Google agrega esa
 * validacion en una actualizacion futura.
 */
class VideoScreen(
    carContext: CarContext,
    private val videoPageUrl: String,
    private val title: String,
) : Screen(carContext), DefaultLifecycleObserver {

    private val scope = CoroutineScope(Dispatchers.Main + Job())
    private var player: ExoPlayer? = null
    private var pendingSurface: android.view.Surface? = null
    private var resolvedStreamUrl: String? = null
    private var isLoading = true
    private var errorMessage: String? = null

    init {
        lifecycle.addObserver(this)
    }

    override fun onCreate(owner: LifecycleOwner) {
        carContext.getCarService(AppManager::class.java).setSurfaceCallback(
            object : SurfaceCallback {
                override fun onSurfaceAvailable(surfaceContainer: SurfaceContainer) {
                    pendingSurface = surfaceContainer.surface
                    attachSurfaceIfReady()
                }

                override fun onSurfaceDestroyed(surfaceContainer: SurfaceContainer) {
                    player?.clearVideoSurface()
                    pendingSurface = null
                }
            },
        )

        scope.launch {
            resolvedStreamUrl = try {
                withContext(Dispatchers.IO) { YoutubeRepository.resolveStreamUrl(videoPageUrl) }
            } catch (e: Exception) {
                null
            }
            isLoading = false
            if (resolvedStreamUrl == null) {
                errorMessage = carContext.getString(R.string.stream_error)
            } else {
                startPlayback()
            }
            invalidate()
        }
    }

    private fun startPlayback() {
        val url = resolvedStreamUrl ?: return
        if (player != null) return
        val exo = ExoPlayer.Builder(carContext).build()
        exo.setMediaItem(MediaItem.fromUri(url))
        exo.prepare()
        exo.playWhenReady = true
        exo.addListener(object : Player.Listener {
            override fun onIsPlayingChanged(isPlaying: Boolean) {
                invalidate()
            }
        })
        player = exo
        attachSurfaceIfReady()
    }

    private fun attachSurfaceIfReady() {
        val surface = pendingSurface ?: return
        player?.setVideoSurface(surface)
    }

    private fun togglePlayback() {
        player?.let {
            it.playWhenReady = !it.playWhenReady
            invalidate()
        }
    }

    override fun onGetTemplate(): Template {
        errorMessage?.let { message ->
            return MessageTemplate.Builder(message)
                .setTitle(title)
                .setHeaderAction(Action.BACK)
                .build()
        }

        if (isLoading || player == null) {
            return MessageTemplate.Builder(carContext.getString(R.string.car_loading_video))
                .setTitle(title)
                .setHeaderAction(Action.BACK)
                .build()
        }

        val playPauseAction = Action.Builder()
            .setIcon(iconFor(if (player?.isPlaying == true) R.drawable.ic_pause else R.drawable.ic_play))
            .setOnClickListener { togglePlayback() }
            .build()

        val backAction = Action.Builder()
            .setIcon(iconFor(R.drawable.ic_back))
            .setOnClickListener { screenManager.pop() }
            .build()

        val actionStrip = ActionStrip.Builder()
            .addAction(playPauseAction)
            .addAction(backAction)
            .build()

        return NavigationTemplate.Builder()
            .setActionStrip(actionStrip)
            .build()
    }

    private fun iconFor(resId: Int): CarIcon =
        CarIcon.Builder(IconCompat.createWithResource(carContext, resId)).build()

    private val screenManager: ScreenManager
        get() = carContext.getCarService(ScreenManager::class.java)

    override fun onDestroy(owner: LifecycleOwner) {
        scope.coroutineContext[Job]?.cancel()
        player?.release()
        player = null
    }
}
