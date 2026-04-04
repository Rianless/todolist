package com.todoapp.widget.ui

import android.app.Application
import androidx.lifecycle.*
import com.todoapp.widget.data.Todo
import com.todoapp.widget.data.TodoDatabase
import com.todoapp.widget.data.TodoRepository
import kotlinx.coroutines.launch

class TodoViewModel(application: Application) : AndroidViewModel(application) {

    private val repository: TodoRepository
    val allTodos: LiveData<List<Todo>>

    init {
        val dao = TodoDatabase.getDatabase(application).todoDao()
        repository = TodoRepository(dao)
        allTodos = repository.allTodos
    }

    fun insert(todo: Todo) = viewModelScope.launch {
        repository.insert(todo)
    }

    fun update(todo: Todo) = viewModelScope.launch {
        repository.update(todo)
    }

    fun delete(todo: Todo) = viewModelScope.launch {
        repository.delete(todo)
    }

    fun setDone(id: Int, done: Boolean) = viewModelScope.launch {
        repository.setDone(id, done)
    }

    fun importFromJson(json: String, onResult: (Int) -> Unit) = viewModelScope.launch {
        val count = repository.importFromJson(json)
        onResult(count)
    }

    fun exportToJson(onResult: (String) -> Unit) = viewModelScope.launch {
        val json = repository.exportToJson()
        onResult(json)
    }
}
