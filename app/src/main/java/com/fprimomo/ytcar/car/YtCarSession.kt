package com.fprimomo.ytcar.car

import android.content.Intent
import androidx.car.app.Screen
import androidx.car.app.Session

class YtCarSession : Session() {
    override fun onCreateScreen(intent: Intent): Screen = SearchScreen(carContext)
}
