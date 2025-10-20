// Todo App JavaScript
let todos = [];
let isAdding = false;
let isInitialized = false; // 防止重复初始化

// 转义 HTML 特殊字符
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// 显示消息
function showMessage(message, type) {
    const existingMessage = document.querySelector('.success-message, .error-message');
    if (existingMessage) {
        existingMessage.remove();
    }
    
    const messageDiv = document.createElement('div');
    messageDiv.className = type === 'success' ? 'success-message' : 'error-message';
    messageDiv.textContent = message;
    
    const firstCard = document.querySelector('.todo-card');
    if (firstCard && firstCard.parentNode) {
        firstCard.parentNode.insertBefore(messageDiv, firstCard);
    }
    
    setTimeout(() => {
        if (messageDiv.parentNode) {
            messageDiv.remove();
        }
    }, 3000);
}

// 添加新的待办事项
async function addTodo() {
    if (isAdding) {
        console.log('⏳ Already adding, please wait...');
        return;
    }
    
    console.log('🎯 addTodo function called - SHOULD ONLY SEE THIS ONCE PER CLICK');
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
    
    isAdding = true;
    
    try {
        const addBtn = document.getElementById('addBtn');
        addBtn.disabled = true;
        addBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Adding...';
        
        console.log('📤 Sending ONE request to add todo:', task);
        
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
        console.log('✅ Todo added, response:', newTodo);
        
        // 清空输入框
        taskInput.value = '';
        
        // 重新加载列表（这里应该只看到一个新任务）
        await loadTodos();
        
        showMessage('Task added successfully!', 'success');
        
    } catch (error) {
        console.error('❌ Error adding todo:', error);
        showMessage('Error adding task. Please try again.', 'error');
    } finally {
        const addBtn = document.getElementById('addBtn');
        addBtn.disabled = false;
        addBtn.innerHTML = '<i class="fas fa-plus"></i> Add';
        isAdding = false;
    }
}

// 一次性初始化 - 确保只运行一次
function initializeApp() {
    if (isInitialized) {
        console.log('⚠️ App already initialized, skipping...');
        return;
    }
    
    console.log('✅ INITIALIZING APP - THIS SHOULD ONLY RUN ONCE');
    isInitialized = true;
    
    // 移除所有可能重复的事件监听器
    const addBtn = document.getElementById('addBtn');
    const taskInput = document.getElementById('taskInput');
    
    // 克隆并替换元素来移除所有事件监听器
    const newAddBtn = addBtn.cloneNode(true);
    addBtn.parentNode.replaceChild(newAddBtn, addBtn);
    
    const newTaskInput = taskInput.cloneNode(true);
    taskInput.parentNode.replaceChild(newTaskInput, taskInput);
    
    // 重新绑定事件 - 只绑定一次
    document.getElementById('addBtn').addEventListener('click', function(event) {
        console.log('🖱️ Add button CLICKED - EVENT LISTENER');
        event.preventDefault();
        event.stopImmediatePropagation();
        addTodo();
    }, { once: false }); // 确保不是一次性监听器
    
    document.getElementById('taskInput').addEventListener('keypress', function(event) {
        if (event.key === 'Enter') {
            console.log('↵ Enter key PRESSED - EVENT LISTENER');
            event.preventDefault();
            event.stopImmediatePropagation();
            addTodo();
        }
    }, { once: false });
    
    loadTodos();
}

// DOM 加载完成后初始化
document.addEventListener('DOMContentLoaded', function() {
    console.log('📄 DOM Content Loaded - Setting up initialization');
    // 使用 setTimeout 确保所有元素都已加载
    setTimeout(initializeApp, 100);
});

// 加载所有待办事项
async function loadTodos() {
    try {
        console.log('📥 Loading todos from server...');
        const response = await fetch('/api/todos');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        todos = await response.json();
        console.log('✅ Todos loaded. Count:', todos.length, 'Tasks:', todos.map(t => t.task));
        updateTodoList();
        updateStats();
    } catch (error) {
        console.error('❌ Error loading todos:', error);
        showMessage('Error loading todos. Please refresh the page.', 'error');
    }
}

// 切换待办事项完成状态
async function toggleTodo(id) {
    try {
        const todo = todos.find(t => t.id === id);
        if (!todo) return;
        
        const response = await fetch(`/api/todos/${id}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ completed: !todo.completed })
        });
        
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        
        await loadTodos();
        
    } catch (error) {
        console.error('❌ Error updating todo:', error);
        showMessage('Error updating task. Please try again.', 'error');
    }
}

// 删除待办事项
async function deleteTodo(id) {
    if (!confirm('Are you sure you want to delete this task?')) return;
    
    try {
        const response = await fetch(`/api/todos/${id}`, { method: 'DELETE' });
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        
        await loadTodos();
        
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

// 创建待办事项元素
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
}