import mysql.connector
from mysql.connector import Error
import os
import time
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class Database:
    def __init__(self):
        self.host = os.getenv('MYSQL_HOST', 'mysql-service')
        self.user = os.getenv('MYSQL_USER', 'todo_user')
        self.password = os.getenv('MYSQL_PASSWORD', 'todopassword123')
        self.database = os.getenv('MYSQL_DATABASE', 'todoapp')
        self.port = os.getenv('MYSQL_PORT', '3306')
        self.connection = None
        
    def get_connection(self, retries=5, delay=5):
        for attempt in range(retries):
            try:
                if not self.connection or not self.connection.is_connected():
                    logger.info(f"🔗 Attempting to connect to MySQL database (attempt {attempt + 1}/{retries})")
                    self.connection = mysql.connector.connect(
                        host=self.host,
                        user=self.user,
                        password=self.password,
                        database=self.database,
                        port=int(self.port),
                        connection_timeout=10,
                        buffered=True
                    )
                    logger.info("✅ Successfully connected to MySQL database")
                return self.connection
            except Error as e:
                logger.warning(f"⚠️ Attempt {attempt + 1}/{retries} - Error connecting to MySQL: {e}")
                if attempt < retries - 1:
                    logger.info(f"⏳ Waiting {delay} seconds before retry...")
                    time.sleep(delay)
                else:
                    logger.error(f"❌ Failed to connect to MySQL after {retries} attempts")
                    return None
    
    def init_db(self):
        connection = self.get_connection()
        if connection:
            try:
                cursor = connection.cursor()
                logger.info("🔄 Initializing database tables...")
                cursor.execute('''
                    CREATE TABLE IF NOT EXISTS todos (
                        id INT AUTO_INCREMENT PRIMARY KEY,
                        task VARCHAR(255) NOT NULL,
                        completed BOOLEAN DEFAULT FALSE,
                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                    )
                ''')
                connection.commit()
                logger.info("✅ Database initialized successfully")
            except Error as e:
                logger.error(f"❌ Error initializing database: {e}")
            finally:
                if cursor:
                    cursor.close()
    
    def get_all_todos(self):
        connection = self.get_connection()
        if connection:
            try:
                cursor = connection.cursor(dictionary=True)
                logger.info("📥 Executing SELECT * FROM todos")
                cursor.execute("SELECT * FROM todos ORDER BY created_at DESC")
                todos = cursor.fetchall()
                logger.info(f"✅ Retrieved {len(todos)} todos from database")
                
                # Convert datetime to string for JSON serialization
                for todo in todos:
                    if todo.get('created_at'):
                        todo['created_at'] = todo['created_at'].isoformat()
                return todos
            except Error as e:
                logger.error(f"❌ Error fetching todos: {e}")
                return []
            finally:
                if cursor:
                    cursor.close()
        return []
    
    def add_todo(self, task):
        connection = self.get_connection()
        if connection:
            try:
                cursor = connection.cursor()
                logger.info(f"➕ Executing INSERT INTO todos (task) VALUES ('{task}')")
                cursor.execute("INSERT INTO todos (task) VALUES (%s)", (task,))
                connection.commit()
                todo_id = cursor.lastrowid
                logger.info(f"✅ Todo added with ID: {todo_id}")
                return todo_id
            except Error as e:
                logger.error(f"❌ Error adding todo: {e}")
                return None
            finally:
                if cursor:
                    cursor.close()
        return None
    
    def update_todo(self, todo_id, completed):
        connection = self.get_connection()
        if connection:
            try:
                cursor = connection.cursor()
                
                # 先检查记录是否存在
                logger.info(f"🔍 Checking if todo {todo_id} exists")
                cursor.execute("SELECT id FROM todos WHERE id = %s", (todo_id,))
                existing_todo = cursor.fetchone()
                
                if not existing_todo:
                    logger.warning(f"❌ Todo {todo_id} not found in database")
                    return False
                
                logger.info(f"✅ Todo {todo_id} exists, proceeding with update")
                logger.info(f"🔄 Executing UPDATE todos SET completed = {completed} WHERE id = {todo_id}")
                
                cursor.execute("UPDATE todos SET completed = %s WHERE id = %s", (completed, todo_id))
                connection.commit()
                
                rows_affected = cursor.rowcount
                logger.info(f"📊 Update affected {rows_affected} row(s)")
                
                success = rows_affected > 0
                if success:
                    logger.info(f"✅ Successfully updated todo {todo_id} to completed={completed}")
                else:
                    logger.warning(f"⚠️ No rows affected when updating todo {todo_id}")
                
                return success
                
            except Error as e:
                logger.error(f"❌ Error updating todo {todo_id}: {e}")
                return False
            finally:
                if cursor:
                    cursor.close()
        else:
            logger.error("❌ No database connection for update_todo")
        return False
    
    def delete_todo(self, todo_id):
        connection = self.get_connection()
        if connection:
            try:
                cursor = connection.cursor()
                logger.info(f"🗑️ Executing DELETE FROM todos WHERE id = {todo_id}")
                cursor.execute("DELETE FROM todos WHERE id = %s", (todo_id,))
                connection.commit()
                
                rows_affected = cursor.rowcount
                logger.info(f"📊 Delete affected {rows_affected} row(s)")
                
                success = rows_affected > 0
                if success:
                    logger.info(f"✅ Successfully deleted todo {todo_id}")
                else:
                    logger.warning(f"⚠️ No rows affected when deleting todo {todo_id}")
                
                return success
            except Error as e:
                logger.error(f"❌ Error deleting todo: {e}")
                return False
            finally:
                if cursor:
                    cursor.close()
        return False
    

    
    def health_check(self):
        try:
            logger.info("🏥 Performing database health check")
            connection = self.get_connection(retries=1, delay=1)
            if connection and connection.is_connected():
                cursor = connection.cursor()
                cursor.execute("SELECT 1")
                cursor.fetchone()
                cursor.close()
                logger.info("✅ Database health check passed")
                return True
            logger.warning("❌ Database health check failed")
            return False
        except Error as e:
            logger.error(f"❌ Database health check error: {e}")
            return False