// Todo App JavaScript
let todos = [];

// 转义 HTML 特殊字符
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// 显示消息
function showMessage(message, type) {
    // 移除现有消息
    const existingMessage = document.querySelector('.success-message, .error-message');
    if (existingMessage) {
        existingMessage.remove();
    }
    
    // 创建新消息
    const messageDiv = document.createElement('div');
    messageDiv.className = type === 'success' ? 'success-message' : 'error-message';
    messageDiv.textContent = message;
    
    // 插入到第一个 todo-card 之前
    const firstCard = document.querySelector('.todo-card');
    if (firstCard && firstCard.parentNode) {
        firstCard.parentNode.insertBefore(messageDiv, firstCard);
    }
    
    // 3秒后自动消失
    setTimeout(() => {
        if (messageDiv.parentNode) {
            messageDiv.remove();
        }
    }, 3000);
}

// DOM 加载完成后初始化
document.addEventListener('DOMContentLoaded', function() {
    console.log('✅ Todo App initialized');
    loadTodos();
    
    // 添加按钮点击事件
    document.getElementById('addBtn').addEventListener('click', addTodo);
    
    // 添加回车键支持
    document.getElementById('taskInput').addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            addTodo();
        }
    });
});

// 加载所有待办事项
async function loadTodos() {
    try {
        console.log('📥 Loading todos...');
        const response = await fetch('/api/todos');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        todos = await response.json();
        console.log('✅ Todos loaded:', todos);
        updateTodoList();
        updateStats();
    } catch (error) {
        console.error('❌ Error loading todos:', error);
        showMessage('Error loading todos. Please refresh the page.', 'error');
    }
}

// 添加新的待办事项
async function addTodo() {
    console.log('🎯 addTodo function called');
    const taskInput = document.getElementById('taskInput');
    const task = taskInput.value.trim();
    
    if (!task) {
        showMessage('Please enter a task!', 'error');
        return;
    }
    
    if (task.length > 255) {
        showMessage('Task is too long! Maximum 255 characters.', 'error');
        return;
    }
    
    try {
        // 禁用按钮防止重复点击
        const addBtn = document.getElementById('addBtn');
        addBtn.disabled = true;
        addBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Adding...';
        
        const response = await fetch('/api/todos', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ task: task })
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const newTodo = await response.json();
        console.log('✅ Todo added:', newTodo);
        
        // 清空输入框
        taskInput.value = '';
        
        // 重新加载所有待办事项
        await loadTodos();
        
        showMessage('Task added successfully!', 'success');
        
    } catch (error) {
        console.error('❌ Error adding todo:', error);
        showMessage('Error adding task. Please try again.', 'error');
    } finally {
        // 重新启用按钮
        const addBtn = document.getElementById('addBtn');
        addBtn.disabled = false;
        addBtn.innerHTML = '<i class="fas fa-plus"></i> Add';
    }
}

// 切换待办事项完成状态
async function toggleTodo(id) {
    try {
        const todo = todos.find(t => t.id === id);
        if (!todo) {
            console.log('❌ Todo not found:', id);
            return;
        }
        
        console.log('🔄 Toggling todo:', id, 'from', todo.completed, 'to', !todo.completed);
        
        const response = await fetch(`/api/todos/${id}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ completed: !todo.completed })
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        await loadTodos();
        showMessage('Task updated!', 'success');
        
    } catch (error) {
        console.error('❌ Error updating todo:', error);
        showMessage('Error updating task. Please try again.', 'error');
    }
}

// 删除待办事项
async function deleteTodo(id) {
    if (!confirm('Are you sure you want to delete this task?')) {
        return;
    }
    
    try {
        console.log('🗑️ Deleting todo:', id);
        
        const response = await fetch(`/api/todos/${id}`, {
            method: 'DELETE'
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        await loadTodos();
        showMessage('Task deleted!', 'success');
        
    } catch (error) {
        console.error('❌ Error deleting todo:', error);
        showMessage('Error deleting task. Please try again.', 'error');
    }
}

// 更新待办事项列表显示
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

// 更新统计信息
function updateStats() {
    const totalTodos = todos.length;
    const completedTodos = todos.filter(todo => todo.completed).length;
    const pendingTodos = totalTodos - completedTodos;
    
    document.getElementById('totalTodos').textContent = totalTodos;
    document.getElementById('completedTodos').textContent = completedTodos;
    document.getElementById('pendingTodos').textContent = pendingTodos;
    
    console.log('📊 Stats updated - Total:', totalTodos, 'Completed:', completedTodos, 'Pending:', pendingTodos);
}