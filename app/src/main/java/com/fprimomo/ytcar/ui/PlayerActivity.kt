package com.fprimomo.ytcar.ui

import android.os.Bundle
import android.view.View
import android.widget.ProgressBar
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import androidx.media3.common.MediaItem
import androidx.media3.exoplayer.ExoPlayer
import androidx.media3.ui.PlayerView
import com.fprimomo.ytcar.R
import com.fprimomo.ytcar.youtube.YoutubeRepository
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.cancel
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext

/** Reproduccion de video completo en pantalla del telefono, sin restricciones. */
class PlayerActivity : AppCompatActivity() {

    companion object {
        const val EXTRA_VIDEO_PAGE_URL = "extra_video_page_url"
        const val EXTRA_TITLE = "extra_title"
    }

    private val scope = CoroutineScope(Dispatchers.Main + SupervisorJob())
    private var player: ExoPlayer? = null

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_player)

        val playerView = findViewById<PlayerView>(R.id.playerView)
        val spinner = findViewById<ProgressBar>(R.id.loadingSpinner)

        val videoPageUrl = intent.getStringExtra(EXTRA_VIDEO_PAGE_URL)
        if (videoPageUrl == null) {
            finish()
            return
        }

        scope.launch {
            val streamUrl = try {
                withContext(Dispatchers.IO) { YoutubeRepository.resolveStreamUrl(videoPageUrl) }
            } catch (e: Exception) {
                null
            }

            spinner.visibility = View.GONE

            if (streamUrl == null) {
                Toast.makeText(this@PlayerActivity, R.string.stream_error, Toast.LENGTH_LONG).show()
                finish()
                return@launch
            }

            val exoPlayer = ExoPlayer.Builder(this@PlayerActivity).build()
            playerView.player = exoPlayer
            exoPlayer.setMediaItem(MediaItem.fromUri(streamUrl))
            exoPlayer.prepare()
            exoPlayer.playWhenReady = true
            player = exoPlayer
        }
    }

    override fun onStop() {
        super.onStop()
        player?.pause()
    }

    override fun onDestroy() {
        super.onDestroy()
        scope.cancel()
        player?.release()
        player = null
    }
}
