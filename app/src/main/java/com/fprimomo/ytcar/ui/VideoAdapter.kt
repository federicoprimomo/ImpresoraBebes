package com.fprimomo.ytcar.ui

import android.view.LayoutInflater
import android.view.ViewGroup
import android.widget.ImageView
import android.widget.TextView
import androidx.recyclerview.widget.DiffUtil
import androidx.recyclerview.widget.ListAdapter
import androidx.recyclerview.widget.RecyclerView
import coil.load
import com.fprimomo.ytcar.R
import com.fprimomo.ytcar.youtube.YoutubeRepository
import org.schabi.newpipe.extractor.stream.StreamInfoItem

class VideoAdapter(
    private val onClick: (StreamInfoItem) -> Unit,
) : ListAdapter<StreamInfoItem, VideoAdapter.ViewHolder>(DIFF) {

    class ViewHolder(itemView: android.view.View) : RecyclerView.ViewHolder(itemView) {
        val thumbnail: ImageView = itemView.findViewById(R.id.thumbnail)
        val title: TextView = itemView.findViewById(R.id.title)
        val uploader: TextView = itemView.findViewById(R.id.uploader)
    }

    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): ViewHolder {
        val view = LayoutInflater.from(parent.context).inflate(R.layout.item_video, parent, false)
        return ViewHolder(view)
    }

    override fun onBindViewHolder(holder: ViewHolder, position: Int) {
        val item = getItem(position)
        holder.title.text = item.name
        holder.uploader.text = item.uploaderName
        holder.thumbnail.load(YoutubeRepository.thumbnailUrl(item))
        holder.itemView.setOnClickListener { onClick(item) }
    }

    companion object {
        private val DIFF = object : DiffUtil.ItemCallback<StreamInfoItem>() {
            override fun areItemsTheSame(oldItem: StreamInfoItem, newItem: StreamInfoItem) =
                oldItem.url == newItem.url

            override fun areContentsTheSame(oldItem: StreamInfoItem, newItem: StreamInfoItem) =
                oldItem.url == newItem.url && oldItem.name == newItem.name
        }
    }
}
