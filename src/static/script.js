let todos = [];

// Load todos on page load
document.addEventListener('DOMContentLoaded', function() {
    loadTodos();
    
    // Add event listener for Enter key
    document.getElementById('taskInput').addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            addTodo();
        }
    });
});

async function loadTodos() {
    try {
        showLoading();
        const response = await fetch('/api/todos');
        if (response.ok) {
            todos = await response.json();
            renderTodos();
            updateStats();
        } else {
            showError('Failed to load todos');
        }
    } catch (error) {
        console.error('Error loading todos:', error);
        showError('Error loading todos. Please check if the server is running.');
    } finally {
        hideLoading();
    }
}

function renderTodos() {
    const todoList = document.getElementById('todoList');
    
    if (todos.length === 0) {
        todoList.innerHTML = `
            <div class="empty-state">
                <h3>No todos yet</h3>
                <p>Add your first todo item above to get started!</p>
            </div>
        `;
        return;
    }

    todoList.innerHTML = '';

    todos.forEach(todo => {
        const todoElement = document.createElement('div');
        todoElement.className = `todo-item ${todo.completed ? 'completed' : ''}`;
        todoElement.innerHTML = `
            <div class="todo-text ${todo.completed ? 'completed' : ''}">
                ${escapeHtml(todo.task)}
            </div>
            <div class="todo-actions">
                <button class="toggle-btn" onclick="toggleTodo(${todo.id}, ${!todo.completed})">
                    ${todo.completed ? '↶ Undo' : '✓ Complete'}
                </button>
                <button class="delete-btn" onclick="deleteTodo(${todo.id})">🗑 Delete</button>
            </div>
        `;
        todoList.appendChild(todoElement);
    });
}

function updateStats() {
    const total = todos.length;
    const completed = todos.filter(todo => todo.completed).length;
    const pending = total - completed;

    document.getElementById('totalTodos').textContent = `Total: ${total}`;
    document.getElementById('completedTodos').textContent = `Completed: ${completed}`;
    document.getElementById('pendingTodos').textContent = `Pending: ${pending}`;
}

async function addTodo() {
    const taskInput = document.getElementById('taskInput');
    const task = taskInput.value.trim();

    if (!task) {
        showError('Please enter a task');
        taskInput.focus();
        return;
    }

    const addBtn = document.getElementById('addBtn');
    const originalText = addBtn.textContent;
    
    try {
        addBtn.textContent = 'Adding...';
        addBtn.disabled = true;

        const response = await fetch('/api/todos', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ task: task })
        });

        if (response.ok) {
            taskInput.value = '';
            await loadTodos();
            showSuccess('Todo added successfully!');
        } else {
            const error = await response.json();
            showError(error.error || 'Failed to add todo');
        }
    } catch (error) {
        console.error('Error adding todo:', error);
        showError('Error adding todo. Please try again.');
    } finally {
        addBtn.textContent = originalText;
        addBtn.disabled = false;
        taskInput.focus();
    }
}

async function toggleTodo(id, completed) {
    try {
        const response = await fetch(`/api/todos/${id}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ completed: completed })
        });

        if (response.ok) {
            await loadTodos();
            showSuccess('Todo updated successfully!');
        } else {
            showError('Failed to update todo');
        }
    } catch (error) {
        console.error('Error updating todo:', error);
        showError('Error updating todo');
    }
}

async function deleteTodo(id) {
    if (!confirm('Are you sure you want to delete this todo?')) {
        return;
    }

    try {
        const response = await fetch(`/api/todos/${id}`, {
            method: 'DELETE'
        });

        if (response.ok) {
            await loadTodos();
            showSuccess('Todo deleted successfully!');
        } else {
            showError('Failed to delete todo');
        }
    } catch (error) {
        console.error('Error deleting todo:', error);
        showError('Error deleting todo');
    }
}

// Utility functions
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function showLoading() {
    // You can implement a loading spinner here
    console.log('Loading...');
}

function hideLoading() {
    // Hide loading spinner
    console.log('Loading complete');
}

function showError(message) {
    alert('Error: ' + message);
}

function showSuccess(message) {
    // You can implement a toast notification here
    console.log('Success: ' + message);
}

// Health check function
async function checkHealth() {
    try {
        const response = await fetch('/health');
        if (response.ok) {
            console.log('Application is healthy');
        } else {
            console.warn('Application health check failed');
        }
    } catch (error) {
        console.error('Health check failed:', error);
    }
}

// Periodic health check (every 5 minutes)
setInterval(checkHealth, 300000);