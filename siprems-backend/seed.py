import os
import pandas as pd
import psycopg2
import numpy as np
from datetime import datetime
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Konfigurasi Database
DB_HOST = os.getenv("DB_HOST", "localhost")
DB_NAME = os.getenv("DB_NAME", "siprems_db")
DB_USER = os.getenv("DB_USER", "postgres")
DB_PASS = os.getenv("DB_PASSWORD", "password")
DB_PORT = os.getenv("DB_PORT", "5432")

# Mapping Produk: ID Dataset -> Atribut Database
PRODUCT_MAPPING = {
    1: {"sku": "BRD-001", "name": "Roti Tawar (Bread)", "category": "Bread", "price": 4.00, "stock": 50},
    2: {"sku": "RLL-001", "name": "Roti Gulung (Rolls)", "category": "Rolls", "price": 2.50, "stock": 100},
    3: {"sku": "CRS-001", "name": "Croissant", "category": "Pastry", "price": 3.50, "stock": 40},
    4: {"sku": "CNF-001", "name": "Kue Sus (Confectionery)", "category": "Confectionery", "price": 5.00, "stock": 30},
    5: {"sku": "CKE-001", "name": "Kue Bolu (Cake)", "category": "Cake", "price": 8.00, "stock": 20},
    6: {"sku": "SEA-001", "name": "Roti Musiman (Seasonal)", "category": "Seasonal", "price": 6.00, "stock": 25},
}

def get_db_connection():
    conn = psycopg2.connect(
        host=DB_HOST,
        database=DB_NAME,
        user=DB_USER,
        password=DB_PASS,
        port=DB_PORT  
    )
    return conn

def seed_data():
    conn = get_db_connection()
    cursor = conn.cursor()

    try:
        print("🔄 Menghapus data lama...")
        # Reset data dan sequence ID
        cursor.execute("TRUNCATE TABLE transactions, products, events RESTART IDENTITY CASCADE;")
        
        # --- 1. SEED PRODUCTS ---
        print("🍞 Seeding Products...")
        for pid, data in PRODUCT_MAPPING.items():
            cursor.execute(
                """
                INSERT INTO products (product_id, sku, name, category, stock, price)
                VALUES (%s, %s, %s, %s, %s, %s)
                """,
                (pid, data['sku'], data['name'], data['category'], data['stock'], data['price'])
            )
        
        # --- 2. SEED EVENTS ---
        print("📅 Seeding Events from kiwo.csv...")
        if os.path.exists('kiwo.csv'):
            df_kiwo = pd.read_csv('kiwo.csv')
            # Ambil hanya yang KielerWoche == 1
            kiwo_events = df_kiwo[df_kiwo['KielerWoche'] == 1]
            
            for _, row in kiwo_events.iterrows():
                cursor.execute(
                    """
                    INSERT INTO events (event_date, event_name, type, include_in_prediction)
                    VALUES (%s, %s, %s, %s)
                    ON CONFLICT (event_name, event_date) DO NOTHING
                    """,
                    (row['Datum'], 'Kieler Woche Festival', 'custom', True) 
                    # Note: 'type' diisi 'custom' sesuai ENUM di schema
                )
        else:
            print("⚠️ File kiwo.csv tidak ditemukan. Melewati seeding events.")

        # --- 3. SEED TRANSACTIONS ---
        print("📈 Seeding Transactions from train.csv (Mohon tunggu)...")
        if os.path.exists('train.csv'):
            df_train = pd.read_csv('train.csv')
            
            transaction_values = []
            count = 0
            
            for _, row in df_train.iterrows():
                product_id = int(row['Warengruppe'])
                
                # Skip jika produk tidak ada di mapping kita
                if product_id not in PRODUCT_MAPPING:
                    continue
                
                price = PRODUCT_MAPPING[product_id]['price']
                umsatz = row['Umsatz']
                
                # Skip data kosong/error
                if pd.isna(umsatz) or umsatz <= 0:
                    continue
                    
                # Hitung quantity dari revenue
                quantity = max(1, int(np.ceil(umsatz / price)))
                is_promo = False 

                # Format data untuk Bulk Insert
                # Urutan: product_id, date, qty, price, promo
                transaction_values.append((
                    product_id,
                    row['Datum'],
                    quantity,
                    price,
                    is_promo
                ))
                
                count += 1
                if count % 10000 == 0:
                    print(f"   ...memproses {count} baris")

            # Lakukan Batch Insert untuk performa
            if transaction_values:
                # Membuat template string (%s, %s, ...)
                args_str = ','.join(cursor.mogrify("(%s, %s, %s, %s, %s)", x).decode('utf-8') for x in transaction_values)
                
                cursor.execute(
                    f"INSERT INTO transactions (product_id, transaction_date, quantity_sold, price_per_unit, is_promo) VALUES {args_str}"
                )
                print(f"✅ Berhasil memasukkan {len(transaction_values)} transaksi.")
            else:
                print("⚠️ Tidak ada data transaksi valid yang ditemukan.")
            
        else:
            print("⚠️ File train.csv tidak ditemukan. Melewati seeding transaksi.")

        conn.commit()
        print("🎉 Database SELESAI diperbarui!")

    except Exception as e:
        print(f"❌ Terjadi kesalahan: {e}")
        conn.rollback()
    finally:
        cursor.close()
        conn.close()

if __name__ == "__main__":
    seed_data()