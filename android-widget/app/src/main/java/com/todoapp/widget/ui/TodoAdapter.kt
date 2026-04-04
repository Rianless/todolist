package com.todoapp.widget.ui

import android.graphics.Color
import android.graphics.Paint
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.TextView
import androidx.cardview.widget.CardView
import androidx.recyclerview.widget.DiffUtil
import androidx.recyclerview.widget.ListAdapter
import androidx.recyclerview.widget.RecyclerView
import com.todoapp.widget.R
import com.todoapp.widget.data.Todo

class TodoAdapter(
    private val onChecked: (Todo, Boolean) -> Unit,
    private val onClick: (Todo) -> Unit
) : ListAdapter<Todo, TodoAdapter.TodoViewHolder>(DiffCallback) {

    inner class TodoViewHolder(view: View) : RecyclerView.ViewHolder(view) {
        val card: CardView = view.findViewById(R.id.card_root)
        val accent: View = view.findViewById(R.id.view_accent)
        val tvTitle: TextView = view.findViewById(R.id.tv_title)
        val tvCategory: TextView = view.findViewById(R.id.tv_category)
        val tvTime: TextView = view.findViewById(R.id.tv_time)
        val tvMeta: TextView = view.findViewById(R.id.tv_meta)
        val tvCheck: TextView = view.findViewById(R.id.tv_check)
    }

    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): TodoViewHolder {
        val view = LayoutInflater.from(parent.context)
            .inflate(R.layout.item_todo, parent, false)
        return TodoViewHolder(view)
    }

    override fun onBindViewHolder(holder: TodoViewHolder, position: Int) {
        val todo = getItem(position)

        // Accent color
        try {
            holder.accent.setBackgroundColor(Color.parseColor(todo.categoryColor))
        } catch (e: Exception) {
            holder.accent.setBackgroundColor(Color.parseColor("#636366"))
        }

        // Title
        holder.tvTitle.text = todo.title
        if (todo.done) {
            holder.tvTitle.paintFlags = holder.tvTitle.paintFlags or Paint.STRIKE_THRU_TEXT_FLAG
            holder.tvTitle.alpha = 0.5f
        } else {
            holder.tvTitle.paintFlags = holder.tvTitle.paintFlags and Paint.STRIKE_THRU_TEXT_FLAG.inv()
            holder.tvTitle.alpha = 1f
        }

        // Category pill
        holder.tvCategory.text = todo.category
        try {
            val color = Color.parseColor(todo.categoryColor)
            holder.tvCategory.setBackgroundColor(adjustAlpha(color, 0.18f))
            holder.tvCategory.setTextColor(darkenColor(color))
        } catch (e: Exception) {}

        // Time
        val timeStr = when {
            todo.allDay -> "하루종일"
            todo.startTime.isNotEmpty() && todo.endTime.isNotEmpty() -> "${todo.startTime}–${todo.endTime}"
            todo.startTime.isNotEmpty() -> todo.startTime
            else -> ""
        }
        holder.tvTime.text = timeStr
        holder.tvTime.visibility = if (timeStr.isEmpty()) View.GONE else View.VISIBLE

        // Meta
        val meta = buildString {
            if (todo.instructor.isNotEmpty()) append("👤 ${todo.instructor}")
            if (todo.location.isNotEmpty()) {
                if (isNotEmpty()) append("  ")
                append("📍 ${todo.location}")
            }
        }
        holder.tvMeta.text = meta
        holder.tvMeta.visibility = if (meta.isEmpty()) View.GONE else View.VISIBLE

        // Check button
        holder.tvCheck.text = if (todo.done) "✓" else ""
        holder.tvCheck.setBackgroundResource(
            if (todo.done) R.drawable.bg_check_done else R.drawable.bg_check_empty
        )
        holder.tvCheck.setOnClickListener { onChecked(todo, !todo.done) }

        holder.card.alpha = if (todo.done) 0.6f else 1f
        holder.card.setOnClickListener { onClick(todo) }
    }

    private fun adjustAlpha(color: Int, factor: Float): Int {
        val r = Color.red(color)
        val g = Color.green(color)
        val b = Color.blue(color)
        return Color.argb((factor * 255).toInt(), r, g, b)
    }

    private fun darkenColor(color: Int): Int {
        val r = (Color.red(color) * 0.65f).toInt()
        val g = (Color.green(color) * 0.65f).toInt()
        val b = (Color.blue(color) * 0.65f).toInt()
        return Color.rgb(r, g, b)
    }

    companion object DiffCallback : DiffUtil.ItemCallback<Todo>() {
        override fun areItemsTheSame(oldItem: Todo, newItem: Todo) = oldItem.id == newItem.id
        override fun areContentsTheSame(oldItem: Todo, newItem: Todo) = oldItem == newItem
    }
}
