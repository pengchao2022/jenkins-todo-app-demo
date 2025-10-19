// 更新 todo 项创建函数
function createTodoElement(todo) {
    const todoDiv = document.createElement('div');
    todoDiv.className = 'todo-item';
    todoDiv.innerHTML = `
        <div class="todo-checkbox ${todo.completed ? 'checked' : ''}" 
             onclick="toggleTodo(${todo.id})">
            ${todo.completed ? '<i class="fas fa-check"></i>' : ''}
        </div>
        <span class="todo-text ${todo.completed ? 'completed' : ''}">
            ${escapeHtml(todo.task)}
        </span>
        <div class="todo-actions">
            <button class="btn-icon" onclick="deleteTodo(${todo.id})" title="Delete">
                <i class="fas fa-trash"></i>
            </button>
        </div>
    `;
    return todoDiv;
}

// 添加空状态处理
function updateTodoList() {
    const todoList = document.getElementById('todoList');
    
    if (todos.length === 0) {
        todoList.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-clipboard-list"></i>
                <p>No tasks yet. Add your first todo above!</p>
            </div>
        `;
    } else {
        todoList.innerHTML = '';
        todos.forEach(todo => {
            todoList.appendChild(createTodoElement(todo));
        });
    }
    
    updateStats();
}