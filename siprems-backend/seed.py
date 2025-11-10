import psycopg2
import os
import datetime
import random
import numpy as np
from dotenv import load_dotenv

# Muat variabel dari .env
load_dotenv()

# Data awal produk dari ProductsPage.tsx
INITIAL_PRODUCTS = [
    ('Laptop', 'Electronics', '15-inch', 999.99, 12, 'LAP-001'),
    ('Mouse', 'Electronics', 'Wireless', 29.99, 45, 'MOU-001'),
    ('Keyboard', 'Electronics', 'Mechanical', 129.99, 8, 'KEY-001'),
    ('Monitor', 'Electronics', '27-inch 4K', 599.99, 5, 'MON-001'),
    ('Desk Lamp', 'Office', 'LED', 49.99, 2, 'LAM-001'),
]

# Data hari libur dari CalendarPage.tsx
NATIONAL_HOLIDAYS = [
    ('New Year Day', '2023-01-01', 'holiday', 'National holiday'),
    ('Independence Day', '2023-07-04', 'holiday', 'National holiday'),
    ('Thanksgiving', '2023-11-23', 'holiday', 'National holiday'),
    ('Christmas', '2023-12-25', 'holiday', 'National holiday'),
    ('New Year Day', '2024-01-01', 'holiday', 'National holiday'),
    ('Independence Day', '2024-07-04', 'holiday', 'National holiday'),
    ('Thanksgiving', '2024-11-28', 'holiday', 'National holiday'),
    ('Christmas', '2024-12-25', 'holiday', 'National holiday'),
    ('New Year Day', '2025-01-01', 'holiday', 'National holiday'),
    ('Independence Day', '2025-07-04', 'holiday', 'National holiday'),
    ('Thanksgiving', '2025-11-27', 'holiday', 'National holiday'),
    ('Christmas', '2025-12-25', 'holiday', 'National holiday'),
]

def get_db_connection():
    """Mendapatkan koneksi ke database PostgreSQL."""
    conn = psycopg2.connect(
        host=os.getenv('DB_HOST'),
        database=os.getenv('DB_NAME'),
        user=os.getenv('DB_USER'),
        password=os.getenv('DB_PASSWORD')
    )
    return conn

def seed_products(cur):
    """Mengisi tabel products dengan data awal."""
    cur.executemany(
        """
        INSERT INTO products (name, category, variation, price, stock, sku)
        VALUES (%s, %s, %s, %s, %s, %s)
        ON CONFLICT (sku) DO NOTHING;
        """,
        INITIAL_PRODUCTS
    )
    print("-> Tabel 'products' berhasil di-seed.")

def seed_events(cur):
    """Mengisi tabel events dengan data hari libur."""
    cur.executemany(
        """
        INSERT INTO events (event_name, event_date, type, description, include_in_prediction)
        VALUES (%s, %s::date, %s::event_type, %s, TRUE)
        ON CONFLICT (event_name, event_date) DO NOTHING;
        """,
        NATIONAL_HOLIDAYS
    )
    print("-> Tabel 'events' berhasil di-seed.")

def generate_sales_data(cur):
    """
    Membuat data penjualan tiruan yang realistis untuk 'Laptop' (LAP-001)
    selama 2 tahun terakhir untuk data training Prophet.
    """
    print("Membuat data transaksi (penjualan)... Ini mungkin perlu waktu sejenak.")
    
    # Dapatkan product_id dan harga untuk 'Laptop'
    cur.execute("SELECT product_id, price FROM products WHERE sku = 'LAP-001';")
    result = cur.fetchone()
    if not result:
        print("Error: Product 'LAP-001' tidak ditemukan. Pastikan sudah ada di tabel products.")
        return
        
    product_id, product_price = result
    
    start_date = datetime.date(2023, 1, 1)
    end_date = datetime.date(2025, 11, 9) # Sesuai dengan data mock sebelumnya
    delta = end_date - start_date
    
    sales_data = []
    
    for i in range(delta.days + 1):
        date = start_date + datetime.timedelta(days=i)
        
        # 1. Base sales
        base_sales = 10 + np.sin(i * 0.02) * 5  # Pola sinus sederhana
        
        # 2. Musiman Mingguan (Weekend lebih tinggi)
        weekly_seasonality = [0, 0, 1, 2, 5, 15, 12] # Mon=0, ..., Sat=15, Sun=12
        sales = base_sales + weekly_seasonality[date.weekday()]
        
        # 3. Musiman Tahunan (Lonjakan di Nov/Des)
        if date.month in [11, 12]:
            sales *= 1.8  # Lonjakan 80%
            
        # 4. Acak (noise)
        sales += random.randint(-2, 3)
        
        # Pastikan penjualan tidak negatif dan merupakan integer
        final_sales = max(0, int(sales))
        
        if final_sales > 0:
            # Simulasikan beberapa transaksi per hari
            for _ in range(random.randint(1, final_sales // 2 or 1)):
                qty = random.randint(1, 2)
                if final_sales <= 0: break
                
                # Tambahkan sedikit variasi waktu dalam sehari
                time = datetime.time(random.randint(9, 20), random.randint(0, 59))
                transaction_date = datetime.datetime.combine(date, time)
                
                sales_data.append((product_id, qty, product_price, transaction_date))
                final_sales -= qty

    # Masukkan semua data penjualan ke database
    cur.executemany(
        """
        INSERT INTO transactions (product_id, quantity_sold, price_per_unit, transaction_date)
        VALUES (%s, %s, %s, %s);
        """,
        sales_data
    )
    print(f"-> Tabel 'transactions' berhasil di-seed dengan {len(sales_data)} record penjualan.")


def main():
    """Fungsi utama untuk menjalankan seeder."""
    conn = None
    try:
        conn = get_db_connection()
        cur = conn.cursor()
        
        print("Menjalankan seeder...")
        
        # Hapus data lama agar bisa dijalankan ulang
        print("Menghapus data lama (TRUNCATE)...")
        cur.execute("TRUNCATE TABLE transactions, products, events RESTART IDENTITY CASCADE;")
        
        # Seed data
        seed_products(cur)
        seed_events(cur)
        generate_sales_data(cur)
        
        # Commit perubahan
        conn.commit()
        
        print("\nSeeding database selesai!")
        
    except Exception as e:
        print(f"Terjadi error: {e}")
        if conn:
            conn.rollback() # Batalkan perubahan jika ada error
    finally:
        if conn:
            cur.close()
            conn.close()
            print("Koneksi database ditutup.")

if __name__ == "__main__":
    main()