package com.fprimomo.ytcar.car

import androidx.car.app.CarAppService
import androidx.car.app.Session
import androidx.car.app.validation.HostValidator

/**
 * Punto de entrada que Android Auto instancia para mostrar esta app en la
 * pantalla del auto.
 *
 * HostValidator.ALLOW_ALL_HOSTS_VALIDATOR acepta cualquier host de Android
 * Auto sin verificar firma/certificado. Es lo que corresponde para una app
 * personal, sideloaded, no publicada: no hay forma de conocer de antemano
 * la huella del host contra la que validar. Para publicar en Play Store
 * habria que reemplazar esto por un HostValidator con allowlist real.
 */
class YtCarAppService : CarAppService() {

    override fun createHostValidator(): HostValidator = HostValidator.ALLOW_ALL_HOSTS_VALIDATOR

    override fun onCreateSession(): Session = YtCarSession()
}
