package com.fprimomo.ytcar.car

import androidx.car.app.CarContext
import androidx.car.app.CarToast
import androidx.car.app.Screen
import androidx.car.app.model.Action
import androidx.car.app.model.ItemList
import androidx.car.app.model.Row
import androidx.car.app.model.Template
import androidx.car.app.model.SearchTemplate
import androidx.lifecycle.DefaultLifecycleObserver
import androidx.lifecycle.LifecycleOwner
import com.fprimomo.ytcar.R
import com.fprimomo.ytcar.youtube.YoutubeRepository
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import org.schabi.newpipe.extractor.stream.StreamInfoItem

/**
 * Pantalla raiz en la pantalla del auto: un buscador (teclado en pantalla o
 * dictado por voz, lo maneja Android Auto) con resultados en lista.
 */
class SearchScreen(carContext: CarContext) : Screen(carContext), DefaultLifecycleObserver {

    private val scope = CoroutineScope(Dispatchers.Main + Job())
    private var results: List<StreamInfoItem> = emptyList()
    private var isSearching = false

    init {
        lifecycle.addObserver(this)
    }

    override fun onGetTemplate(): Template {
        val listBuilder = ItemList.Builder()

        if (results.isEmpty()) {
            listBuilder.setNoItemsMessage(
                if (isSearching) carContext.getString(R.string.loading) else carContext.getString(R.string.car_search_hint),
            )
        } else {
            for (item in results) {
                listBuilder.addItem(
                    Row.Builder()
                        .setTitle(item.name)
                        .addText(item.uploaderName ?: "")
                        .setOnClickListener { openVideo(item) }
                        .build(),
                )
            }
        }

        return SearchTemplate.Builder(
            object : SearchTemplate.SearchCallback {
                override fun onSearchTextChanged(searchText: String) {
                    runSearch(searchText)
                }

                override fun onSearchSubmitted(searchText: String) {
                    runSearch(searchText)
                }
            },
        )
            .setHeaderAction(Action.APP_ICON)
            .setSearchHint(carContext.getString(R.string.car_search_hint))
            .setShowKeyboardByDefault(true)
            .setItemList(listBuilder.build())
            .build()
    }

    private fun runSearch(query: String) {
        if (query.length < 2) {
            results = emptyList()
            invalidate()
            return
        }
        isSearching = true
        invalidate()
        scope.launch {
            val found = try {
                withContext(Dispatchers.IO) { YoutubeRepository.search(query) }
            } catch (e: Exception) {
                CarToast.makeText(carContext, "Error: ${e.message}", CarToast.LENGTH_LONG).show()
                emptyList()
            }
            isSearching = false
            results = found
            invalidate()
        }
    }

    private fun openVideo(item: StreamInfoItem) {
        // Screen ya expone screenManager (equivalente a
        // carContext.getCarService(ScreenManager::class.java)).
        screenManager.push(VideoScreen(carContext, item.url, item.name))
    }

    override fun onDestroy(owner: LifecycleOwner) {
        scope.coroutineContext[Job]?.cancel()
    }
}
