package com.fprimomo.ytcar.youtube

import okhttp3.OkHttpClient
import okhttp3.RequestBody.Companion.toRequestBody
import org.schabi.newpipe.extractor.downloader.Downloader
import org.schabi.newpipe.extractor.downloader.Request
import org.schabi.newpipe.extractor.downloader.Response
import org.schabi.newpipe.extractor.exceptions.ReCaptchaException
import java.io.IOException
import java.util.concurrent.TimeUnit
import okhttp3.Request as OkRequest

/**
 * Implementacion minima del [Downloader] que NewPipeExtractor necesita para
 * hacer sus pedidos HTTP. NewPipeExtractor no trae cliente HTTP propio a
 * proposito, para no forzar una dependencia; usamos OkHttp.
 */
object OkHttpDownloader : Downloader() {

    private val client = OkHttpClient.Builder()
        .connectTimeout(15, TimeUnit.SECONDS)
        .readTimeout(20, TimeUnit.SECONDS)
        .build()

    @Throws(IOException::class, ReCaptchaException::class)
    override fun execute(request: Request): Response {
        val httpMethod = request.httpMethod()
        val url = request.url()
        val headers = request.headers()
        val dataToSend = request.dataToSend()

        val body = dataToSend?.toRequestBody(null)

        val builder = OkRequest.Builder()
            .method(httpMethod, body)
            .url(url)
            // Un User-Agent de navegador de escritorio evita algunos bloqueos
            // basicos que YouTube aplica a clientes sin identificar.
            .header("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36")

        for ((name, values) in headers) {
            if (values.size > 1) {
                builder.removeHeader(name)
                for (value in values) builder.addHeader(name, value)
            } else if (values.size == 1) {
                builder.header(name, values[0])
            }
        }

        client.newCall(builder.build()).execute().use { response ->
            if (response.code == 429) {
                throw ReCaptchaException("reCaptcha challenge solicitado por YouTube", url)
            }
            val responseBodyString = response.body?.string()
            val latestUrl = response.request.url.toString()
            return Response(
                response.code,
                response.message,
                response.headers.toMultimap(),
                responseBodyString,
                latestUrl,
            )
        }
    }
}
