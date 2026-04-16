package com.todoapp.widget.data

import androidx.lifecycle.LiveData
import androidx.room.*

@Dao
interface TodoDao {

    @Query("SELECT * FROM todos ORDER BY date ASC, startTime ASC")
    fun getAllTodos(): LiveData<List<Todo>>

    @Query("SELECT * FROM todos ORDER BY date ASC, startTime ASC")
    suspend fun getAllTodosSync(): List<Todo>

    @Query("SELECT * FROM todos WHERE date = :date ORDER BY startTime ASC")
    fun getTodosByDate(date: String): LiveData<List<Todo>>

    @Query("SELECT * FROM todos WHERE date = :date ORDER BY startTime ASC")
    suspend fun getTodosByDateSync(date: String): List<Todo>

    @Query("SELECT * FROM todos WHERE date >= :fromDate ORDER BY date ASC, startTime ASC LIMIT :limit")
    suspend fun getUpcomingTodos(fromDate: String, limit: Int = 5): List<Todo>

    @Query("SELECT * FROM todos WHERE date >= :startDate AND date <= :endDate ORDER BY date ASC, startTime ASC")
    suspend fun getWeeklyTodos(startDate: String, endDate: String): List<Todo>

    @Query("SELECT COUNT(*) FROM todos WHERE date >= :startDate AND date <= :endDate")
    suspend fun getWeeklyCount(startDate: String, endDate: String): Int

    @Query("SELECT COUNT(*) FROM todos WHERE date >= :startDate AND date <= :endDate AND done = 1")
    suspend fun getWeeklyDoneCount(startDate: String, endDate: String): Int

    @Query("SELECT * FROM todos WHERE done = 0 ORDER BY date ASC, startTime ASC LIMIT :limit")
    suspend fun getPendingTodos(limit: Int = 5): List<Todo>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertTodo(todo: Todo): Long

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertAll(todos: List<Todo>)

    @Update
    suspend fun updateTodo(todo: Todo)

    @Delete
    suspend fun deleteTodo(todo: Todo)

    @Query("UPDATE todos SET done = :done WHERE id = :id")
    suspend fun setDone(id: Int, done: Boolean)

    @Query("DELETE FROM todos")
    suspend fun deleteAll()

    @Query("SELECT COUNT(*) FROM todos")
    suspend fun getCount(): Int

    @Query("SELECT COUNT(*) FROM todos WHERE done = 1")
    suspend fun getDoneCount(): Int
}
