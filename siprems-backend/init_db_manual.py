# siprems-backend/init_db_manual.py
import os
from app import create_app
from utils.db_session import get_db_engine
from models.orm.base import Base
# Import semua model agar terdeteksi oleh SQLAlchemy
from models.orm import user, product, transaction, event

# Pastikan env menggunakan development agar bisa connect ke localhost jika dijalankan manual
os.environ['FLASK_ENV'] = 'development'

def init_database():
    app = create_app()
    with app.app_context():
        try:
            engine = get_db_engine()
            print(f"Connecting to database at: {engine.url}")
            
            # Perintah ini akan membuat tabel jika belum ada
            print("Creating tables...")
            Base.metadata.create_all(bind=engine)
            print("✅ Tables created successfully!")
            
        except Exception as e:
            print(f"❌ Error creating tables: {e}")
            print("Ensure your PostgreSQL is running and credentials in .env are correct.")

if __name__ == "__main__":
    init_database()