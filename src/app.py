from flask import Flask, render_template, request, jsonify
from database import Database
import os
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# 获取当前文件的绝对路径
BASE_DIR = os.path.dirname(os.path.abspath(__file__))

app = Flask(__name__,
    static_folder=os.path.join(BASE_DIR, 'static'),
    static_url_path='/static',
    template_folder=os.path.join(BASE_DIR, 'templates')
)

db = Database()

# Track if database is initialized
database_initialized = False

@app.before_request
def initialize_database_on_first_request():
    global database_initialized
    if not database_initialized:
        logger.info("Initializing database on first request...")
        try:
            db.init_db()
            database_initialized = True
            logger.info("Database initialized successfully")
        except Exception as e:
            logger.error(f"Failed to initialize database: {e}")

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/todos', methods=['GET'])
def get_todos():
    try:
        todos = db.get_all_todos()
        return jsonify(todos)
    except Exception as e:
        logger.error(f"Error in get_todos: {e}")
        return jsonify({'error': 'Failed to fetch todos'}), 500

@app.route('/api/todos', methods=['POST'])
def add_todo():
    try:
        data = request.get_json()
        if not data or 'task' not in data:
            return jsonify({'error': 'Task is required'}), 400
        
        task = data['task'].strip()
        if not task:
            return jsonify({'error': 'Task cannot be empty'}), 400
        
        todo_id = db.add_todo(task)
        if todo_id:
            return jsonify({
                'id': todo_id, 
                'task': task, 
                'completed': False,
                'message': 'Todo added successfully'
            }), 201
        else:
            return jsonify({'error': 'Failed to add todo'}), 500
    except Exception as e:
        logger.error(f"Error in add_todo: {e}")
        return jsonify({'error': 'Internal server error'}), 500

@app.route('/api/todos/<int:todo_id>', methods=['PUT'])
def update_todo(todo_id):
    try:
        logger.info(f"Updating todo {todo_id}")
        
        data = request.get_json()
        if not data or 'completed' not in data:
            return jsonify({'error': 'Completed status is required'}), 400
        
        # 添加调试信息
        all_todos = db.get_all_todos()
        existing_ids = [todo['id'] for todo in all_todos]
        logger.info(f"Existing IDs: {existing_ids}, Requested ID: {todo_id}")
        
        success = db.update_todo(todo_id, data['completed'])
        if success:
            return jsonify({'message': 'Todo updated successfully'}), 200
        else:
            logger.error(f"Todo {todo_id} not found in database")
            return jsonify({'error': 'Todo not found'}), 404
    except Exception as e:
        logger.error(f"Error in update_todo: {e}")
        return jsonify({'error': 'Internal server error'}), 500

@app.route('/api/todos/<int:todo_id>', methods=['DELETE'])
def delete_todo(todo_id):
    try:
        success = db.delete_todo(todo_id)
        if success:
            return jsonify({'message': 'Todo deleted successfully'}), 200
        else:
            return jsonify({'error': 'Todo not found'}), 404
    except Exception as e:
        logger.error(f"Error in delete_todo: {e}")
        return jsonify({'error': 'Internal server error'}), 500

@app.route('/health')
def health():
    try:
        db_healthy = db.health_check()
        if db_healthy:
            return jsonify({
                'status': 'healthy',
                'database': 'connected'
            }), 200
        else:
            return jsonify({
                'status': 'unhealthy',
                'database': 'disconnected'
            }), 503
    except Exception as e:
        logger.error(f"Health check failed: {e}")
        return jsonify({
            'status': 'unhealthy',
            'error': str(e)
        }), 503

@app.route('/api/status')
def status():
    return jsonify({
        'status': 'running',
        'service': 'todo-app',
        'version': '1.0.0'
    })

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=False)