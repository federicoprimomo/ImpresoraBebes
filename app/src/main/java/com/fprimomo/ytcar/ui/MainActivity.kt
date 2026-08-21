package com.fprimomo.ytcar.ui

import android.content.Intent
import android.os.Bundle
import android.view.View
import android.view.inputmethod.EditorInfo
import android.widget.Button
import android.widget.EditText
import android.widget.ProgressBar
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import androidx.recyclerview.widget.LinearLayoutManager
import androidx.recyclerview.widget.RecyclerView
import com.fprimomo.ytcar.R
import com.fprimomo.ytcar.youtube.YoutubeRepository
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.cancel
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import org.schabi.newpipe.extractor.stream.StreamInfoItem

/** Pantalla del telefono: buscador + lista de resultados + video completo. */
class MainActivity : AppCompatActivity() {

    private val scope = CoroutineScope(Dispatchers.Main + SupervisorJob())
    private lateinit var adapter: VideoAdapter

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main)

        val searchEditText = findViewById<EditText>(R.id.searchEditText)
        val searchButton = findViewById<Button>(R.id.searchButton)
        val progressBar = findViewById<ProgressBar>(R.id.progressBar)
        val recyclerView = findViewById<RecyclerView>(R.id.recyclerView)

        adapter = VideoAdapter { item -> openPlayer(item) }
        recyclerView.layoutManager = LinearLayoutManager(this)
        recyclerView.adapter = adapter

        fun triggerSearch() = doSearch(searchEditText.text.toString(), progressBar)

        searchButton.setOnClickListener { triggerSearch() }
        searchEditText.setOnEditorActionListener { _, actionId, _ ->
            if (actionId == EditorInfo.IME_ACTION_SEARCH) {
                triggerSearch()
                true
            } else {
                false
            }
        }
    }

    private fun doSearch(query: String, progressBar: ProgressBar) {
        if (query.isBlank()) return
        progressBar.visibility = View.VISIBLE
        scope.launch {
            val results = try {
                withContext(Dispatchers.IO) { YoutubeRepository.search(query) }
            } catch (e: Exception) {
                Toast.makeText(
                    this@MainActivity,
                    getString(R.string.search_error, e.message ?: e.toString()),
                    Toast.LENGTH_LONG,
                ).show()
                emptyList()
            }
            progressBar.visibility = View.GONE
            adapter.submitList(results)
        }
    }

    private fun openPlayer(item: StreamInfoItem) {
        val intent = Intent(this, PlayerActivity::class.java).apply {
            putExtra(PlayerActivity.EXTRA_VIDEO_PAGE_URL, item.url)
            putExtra(PlayerActivity.EXTRA_TITLE, item.name)
        }
        startActivity(intent)
    }

    override fun onDestroy() {
        super.onDestroy()
        scope.cancel()
    }
}
