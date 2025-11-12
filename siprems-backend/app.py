import pandas as pd
from flask import Flask, jsonify, request
from flask_cors import CORS
from prophet import Prophet
import os
import psycopg2
import psycopg2.extras  # <-- Import tambahan untuk RealDictCursor
from dotenv import load_dotenv
import numpy as np
import datetime

# --- Inisialisasi Aplikasi Flask & Database ---
load_dotenv()  # Memuat variabel dari file .env

app = Flask(__name__)
CORS(app)  # Mengizinkan frontend di localhost:3000 untuk mengakses

def get_db_connection():
    """Mendapatkan koneksi ke database PostgreSQL."""
    conn = psycopg2.connect(
        host=os.getenv('DB_HOST'),
        database=os.getenv('DB_NAME'),
        user=os.getenv('DB_USER'),
        password=os.getenv('DB_PASSWORD')
    )
    return conn

# --- HELPER DATABASE BARU ---
def db_query(query, params=None, fetch_all=True):
    """Fungsi helper untuk menjalankan query dan mengembalikan hasil sebagai dict."""
    conn = None
    try:
        conn = get_db_connection()
        # Menggunakan RealDictCursor agar hasil query berupa [ {'key': 'value'} ]
        cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
        
        if params:
            cur.execute(query, params)
        else:
            cur.execute(query)
        
        if fetch_all:
            result = cur.fetchall()
        else:
            result = cur.fetchone()
        
        conn.commit()  # Commit perubahan (penting untuk POST/PUT/DELETE)
        return result
    
    except Exception as e:
        if conn:
            conn.rollback()  # Batalkan jika ada error
        print(f"Database error: {e}")
        # Lempar error ke endpoint untuk ditangani
        # Ini akan membantu debugging di frontend
        raise e 
    
    finally:
        if conn:
            cur.close()
            conn.close()

# --- ENDPOINT CRUD UNTUK HALAMAN PRODUCTS ---

@app.route('/products', methods=['GET'])
def get_products():
    """
    [READ] - Mengambil semua produk dari database.
    Ini akan dipanggil oleh ProductsPage.tsx saat memuat.
    """
    try:
        query = "SELECT * FROM products ORDER BY created_at DESC;"
        # Konversi hasil query (list of RealDictRow) menjadi list of dict murni
        products = [dict(row) for row in db_query(query, fetch_all=True)]
        return jsonify(products)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/products', methods=['POST'])
def add_product():
    """
    [CREATE] - Menambah produk baru ke database.
    Ini akan dipanggil saat menekan 'Add Product' di dialog.
    """
    try:
        data = request.get_json()
        query = """
            INSERT INTO products (name, category, variation, price, stock, sku)
            VALUES (%s, %s, %s, %s, %s, %s)
            RETURNING *;
        """
        params = (
            data['name'], data['category'], data.get('variation'), 
            float(data['price']), int(data['stock']), data['sku']
        )
        new_product = dict(db_query(query, params, fetch_all=False))
        return jsonify(new_product), 201
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/products/<string:sku>', methods=['PUT'])
def update_product(sku):
    """
    [UPDATE] - Memperbarui produk berdasarkan SKU.
    Ini akan dipanggil saat menekan 'Save Changes' di dialog edit.
    """
    try:
        data = request.get_json()
        query = """
            UPDATE products
            SET name = %s, category = %s, variation = %s, price = %s, stock = %s, sku = %s
            WHERE sku = %s
            RETURNING *;
        """
        params = (
            data['name'], data['category'], data.get('variation'), 
            float(data['price']), int(data['stock']), data['sku'],
            sku  # SKU lama untuk klausa WHERE
        )
        updated_product = db_query(query, params, fetch_all=False)
        if updated_product:
            return jsonify(dict(updated_product))
        return jsonify({'error': 'Product not found'}), 404
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/products/<string:sku>', methods=['DELETE'])
def delete_product(sku):
    """
    [DELETE] - Menghapus produk berdasarkan SKU.
    Ini akan dipanggil saat konfirmasi 'Delete Product'.
    """
    try:
        query = "DELETE FROM products WHERE sku = %s RETURNING *;"
        deleted_product = db_query(query, (sku,), fetch_all=False)
        if deleted_product:
            return jsonify({'message': 'Product deleted successfully'})
        return jsonify({'error': 'Product not found'}), 404
    except Exception as e:
        # Tangani error jika produk tidak bisa dihapus (misal: karena ada di tabel 'transactions')
        if 'foreign key constraint' in str(e).lower():
            return jsonify({'error': 'Tidak dapat menghapus produk, produk ini sudah memiliki riwayat transaksi.'}), 400
        return jsonify({'error': str(e)}), 500

@app.route('/transactions', methods=['GET'])
def get_transactions():
    """
    [READ] - Mengambil 100 transaksi terakhir.
    Bergabung dengan tabel products untuk mendapatkan nama produk.
    """
    try:
        query = """
            SELECT 
                t.transaction_id, 
                t.transaction_date,
                p.name as product_name, 
                t.quantity_sold, 
                t.price_per_unit
            FROM transactions t
            JOIN products p ON t.product_id = p.product_id
            ORDER BY t.transaction_date DESC
            LIMIT 100;
        """
        transactions = [dict(row) for row in db_query(query, fetch_all=True)]
        # Konversi datetime ke string agar bisa di-JSON-kan
        for t in transactions:
            t['transaction_date'] = t['transaction_date'].isoformat()
        return jsonify(transactions)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/transactions', methods=['POST'])
def add_transaction():
    """
    [CREATE] - Menambah transaksi baru.
    Ini juga akan mengurangi stok produk terkait.
    """
    try:
        data = request.get_json()
        
        # 1. Dapatkan product_id dan harga dari 'sku' yang dikirim
        product_query = "SELECT product_id, price, stock FROM products WHERE sku = %s;"
        product = db_query(product_query, (data['product_sku'],), fetch_all=False)
        
        if not product:
            return jsonify({'error': 'Product SKU not found'}), 404
        
        quantity_to_sell = int(data['quantity'])
        
        # 2. Cek apakah stok mencukupi
        if product['stock'] < quantity_to_sell:
            return jsonify({'error': f"Stok tidak mencukupi. Sisa stok: {product['stock']}"}), 400
            
        # 3. Masukkan ke tabel transactions
        insert_query = """
            INSERT INTO transactions (product_id, quantity_sold, price_per_unit, transaction_date)
            VALUES (%s, %s, %s, %s)
            RETURNING *;
        """
        params = (
            product['product_id'],
            quantity_to_sell,
            product['price'],  # Gunakan harga dari database
            datetime.datetime.now(datetime.timezone.utc)  # Selalu gunakan UTC
        )
        new_transaction = dict(db_query(insert_query, params, fetch_all=False))
        new_transaction['transaction_date'] = new_transaction['transaction_date'].isoformat()
        
        # 4. Kurangi stok produk
        stock_query = """
            UPDATE products SET stock = stock - %s WHERE product_id = %s;
        """
        db_query(stock_query, (quantity_to_sell, product['product_id']), fetch_all=False)
        
        # Mengembalikan data transaksi yang baru saja dibuat
        # Kita tambahkan 'product_name' secara manual untuk frontend
        new_transaction['product_name'] = product['name'] 
        
        return jsonify(new_transaction), 201
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/dashboard-stats', methods=['GET'])
def get_dashboard_stats():
    """
    [READ] - Mengambil data statistik agregat untuk kartu dan grafik di dasbor.
    """
    try:
        # 1. Statistik Kartu
        # Kita gabungkan 3 query count menjadi satu untuk efisiensi
        query_cards = """
            SELECT
                (SELECT COUNT(*) FROM transactions 
                 WHERE DATE(transaction_date) = CURRENT_DATE) as daily_transactions,
                
                (SELECT COUNT(*) FROM products) as active_products,
                
                (SELECT COUNT(*) FROM products WHERE stock <= 5) as low_stock_items;
        """
        cards_data = db_query(query_cards, fetch_all=False)
        
        # 2. Tren Penjualan 7 Hari (Line Chart)
        # Kita gunakan generate_series untuk memastikan ada data 7 hari, 
        # walaupun tidak ada penjualan (sales = 0).
        query_sales_trend = """
            SELECT 
                DATE(gs.day) as date,
                COALESCE(SUM(t.quantity_sold), 0) as sales
            FROM 
                generate_series(CURRENT_DATE - INTERVAL '6 days', CURRENT_DATE, '1 day') as gs(day)
            LEFT JOIN 
                transactions t ON DATE(t.transaction_date) = gs.day
            GROUP BY 
                gs.day
            ORDER BY 
                gs.day;
        """
        sales_trend_raw = db_query(query_sales_trend, fetch_all=True)
        # Format data untuk Recharts (['Mon', 'Tue', ...])
        formatted_sales_trend = [
            {'date': r['date'].strftime('%a'), 'sales': int(r['sales'])} 
            for r in sales_trend_raw
        ]
        
        # 3. Perbandingan Stok (Bar Chart)
        # Ambil 5 produk dengan stok terendah
        query_stock_comp = """
            SELECT 
                name as product, 
                stock as current,
                -- Kita buat logika "optimal" dummy di sini, misal 2x lipat stok rendah
                CASE
                    WHEN stock < 20 THEN 40
                    ELSE stock + 20
                END as optimal
            FROM products
            ORDER BY stock ASC
            LIMIT 5;
        """
        stock_comparison = [dict(row) for row in db_query(query_stock_comp, fetch_all=True)]

        # Gabungkan semua data menjadi satu respons JSON
        return jsonify({
            'cards': dict(cards_data),
            'salesTrend': formatted_sales_trend,
            'stockComparison': stock_comparison
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500
# --- Menjalankan Server ---
if __name__ == '__main__':
    # 'port=5000' adalah port standar untuk backend Flask
    # 'debug=True' agar server otomatis restart saat ada perubahan kode
    app.run(debug=True, port=5000)