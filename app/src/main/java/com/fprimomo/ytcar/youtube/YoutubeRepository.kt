package com.fprimomo.ytcar.youtube

import org.schabi.newpipe.extractor.ServiceList
import org.schabi.newpipe.extractor.stream.StreamInfo
import org.schabi.newpipe.extractor.stream.StreamInfoItem

/**
 * Punto unico de acceso a YouTube. No usa la YouTube Data API oficial (no
 * hace falta API key, no hay cuota) sino NewPipeExtractor, que scrapea la
 * web/apps de YouTube igual que hace la app NewPipe.
 *
 * Todas las funciones son bloqueantes / hacen red: siempre llamarlas desde
 * un dispatcher de IO (Dispatchers.IO), nunca desde el hilo principal ni
 * desde el hilo de UI de Android Auto.
 */
object YoutubeRepository {

    private val youtube = ServiceList.YouTube

    /** Busca videos por texto libre y devuelve los resultados de la primera pagina. */
    fun search(query: String): List<StreamInfoItem> {
        if (query.isBlank()) return emptyList()
        val extractor = youtube.getSearchExtractor(query)
        extractor.fetchPage()
        return extractor.initialPage.items.filterIsInstance<StreamInfoItem>()
    }

    /** Miniatura de un resultado de busqueda, si esta disponible. */
    fun thumbnailUrl(item: StreamInfoItem): String? =
        item.thumbnails.maxByOrNull { it.height }?.url

    /**
     * Resuelve la URL de la pagina de un video a una URL de stream directa
     * reproducible con ExoPlayer. Se prioriza un formato "muxed" (video +
     * audio en un solo stream) para no tener que mezclar dos pistas en el
     * reproductor. Esto limita la resolucion maxima disponible (YouTube deja
     * de publicar formatos muxed por encima de 720p), lo cual es un buen
     * trade-off para este caso de uso.
     */
    fun resolveStreamUrl(videoPageUrl: String): String? {
        val info = StreamInfo.getInfo(youtube, videoPageUrl)
        val muxed = info.videoStreams
            .filter { !it.isVideoOnly }
            .maxByOrNull { resolutionRank(it.resolution) }
        return muxed?.content
    }

    private fun resolutionRank(resolution: String?): Int =
        resolution?.filter { it.isDigit() }?.toIntOrNull() ?: 0
}
