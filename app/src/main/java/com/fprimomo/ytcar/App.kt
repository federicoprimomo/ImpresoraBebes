package com.fprimomo.ytcar

import android.app.Application
import com.fprimomo.ytcar.youtube.OkHttpDownloader
import org.schabi.newpipe.extractor.NewPipe

/**
 * Inicializa NewPipeExtractor una sola vez al arrancar el proceso, tanto si
 * arranca por la Activity del telefono como si lo arranca Android Auto via
 * el CarAppService.
 */
class App : Application() {
    override fun onCreate() {
        super.onCreate()
        NewPipe.init(OkHttpDownloader)
    }
}
