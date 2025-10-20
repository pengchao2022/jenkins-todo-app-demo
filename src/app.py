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
            # You might want to handle this differently based on your requirements

@app.route('/')
def index():
    logger.info("Serving index.html")
    logger.info(f"Static folder: {app.static_folder}")
    logger.info(f"Template folder: {app.template_folder}")
    return render_template('index.html')

@app.route('/api/todos', methods=['GET'])
def get_todos():
    try:
        logger.info("📥 Fetching all todos from database")
        todos = db.get_all_todos()
        logger.info(f"✅ Retrieved {len(todos)} todos from database")
        return jsonify(todos)
    except Exception as e:
        logger.error(f"❌ Error in get_todos: {e}")
        return jsonify({'error': 'Failed to fetch todos'}), 500

@app.route('/api/todos', methods=['POST'])
def add_todo():
    try:
        data = request.get_json()
        logger.info(f"📝 Received add todo request: {data}")
        
        if not data or 'task' not in data:
            logger.warning("Missing task in request data")
            return jsonify({'error': 'Task is required'}), 400
        
        task = data['task'].strip()
        if not task:
            logger.warning("Empty task received")
            return jsonify({'error': 'Task cannot be empty'}), 400
        
        logger.info(f"➕ Adding new todo: '{task}'")
        todo_id = db.add_todo(task)
        
        if todo_id:
            logger.info(f"✅ Todo added successfully with ID: {todo_id}")
            return jsonify({
                'id': todo_id, 
                'task': task, 
                'completed': False,
                'message': 'Todo added successfully'
            }), 201
        else:
            logger.error("❌ Failed to add todo to database")
            return jsonify({'error': 'Failed to add todo'}), 500
            
    except Exception as e:
        logger.error(f"💥 Error in add_todo: {e}")
        return jsonify({'error': 'Internal server error'}), 500

@app.route('/api/todos/<int:todo_id>', methods=['PUT'])
def update_todo(todo_id):
    try:
        logger.info(f"🔄 Attempting to update todo ID: {todo_id}")
        
        data = request.get_json()
        logger.info(f"📨 Request data: {data}")
        
        if not data or 'completed' not in data:
            logger.warning(f"❌ Missing completed status for todo {todo_id}")
            return jsonify({'error': 'Completed status is required'}), 400
        
        new_completed_status = data['completed']
        logger.info(f"🎯 Updating todo {todo_id} to completed: {new_completed_status}")
        
        # 先检查所有现有的任务ID
        all_todos = db.get_all_todos()
        existing_ids = [todo['id'] for todo in all_todos]
        logger.info(f"📋 Existing todo IDs in database: {existing_ids}")
        logger.info(f"🔍 Requested todo ID {todo_id} exists: {todo_id in existing_ids}")
        
        if todo_id not in existing_ids:
            logger.warning(f"❌ Todo ID {todo_id} not found in database")
            return jsonify({'error': 'Todo not found'}), 404
        
        success = db.update_todo(todo_id, new_completed_status)
        logger.info(f"📊 Database update result for todo {todo_id}: {success}")
        
        if success:
            logger.info(f"✅ Todo {todo_id} updated successfully to completed={new_completed_status}")
            return jsonify({'message': 'Todo updated successfully'}), 200
        else:
            logger.warning(f"❌ Database update failed for todo {todo_id}")
            return jsonify({'error': 'Todo not found'}), 404
            
    except Exception as e:
        logger.error(f"💥 Error in update_todo for ID {todo_id}: {e}")
        return jsonify({'error': 'Internal server error'}), 500

@app.route('/api/todos/<int:todo_id>', methods=['DELETE'])
def delete_todo(todo_id):
    try:
        logger.info(f"🗑️ Attempting to delete todo ID: {todo_id}")
        
        # 先检查任务是否存在
        all_todos = db.get_all_todos()
        existing_ids = [todo['id'] for todo in all_todos]
        logger.info(f"📋 Existing todo IDs before delete: {existing_ids}")
        
        success = db.delete_todo(todo_id)
        logger.info(f"📊 Database delete result for todo {todo_id}: {success}")
        
        if success:
            logger.info(f"✅ Todo {todo_id} deleted successfully")
            return jsonify({'message': 'Todo deleted successfully'}), 200
        else:
            logger.warning(f"❌ Todo {todo_id} not found for deletion")
            return jsonify({'error': 'Todo not found'}), 404
            
    except Exception as e:
        logger.error(f"💥 Error in delete_todo: {e}")
        return jsonify({'error': 'Internal server error'}), 500

@app.route('/health')
def health():
    try:
        logger.info("🏥 Health check requested")
        # Check database connection
        db_healthy = db.health_check()
        if db_healthy:
            logger.info("✅ Health check passed")
            return jsonify({
                'status': 'healthy',
                'database': 'connected',
                'timestamp': '2024-01-01T00:00:00Z'
            }), 200
        else:
            logger.warning("❌ Health check failed - database disconnected")
            return jsonify({
                'status': 'unhealthy',
                'database': 'disconnected',
                'timestamp': '2024-01-01T00:00:00Z'
            }), 503
    except Exception as e:
        logger.error(f"💥 Health check failed: {e}")
        return jsonify({
            'status': 'unhealthy',
            'error': str(e)
        }), 503

@app.route('/api/status')
def status():
    logger.info("📊 Status check requested")
    return jsonify({
        'status': 'running',
        'service': 'todo-app',
        'version': '1.0.0'
    })

if __name__ == '__main__':
    logger.info("🚀 Starting Todo App Flask server")
    app.run(host='0.0.0.0', port=5000, debug=False)