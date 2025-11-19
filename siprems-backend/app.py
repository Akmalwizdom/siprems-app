import pandas as pd
from flask import Flask, jsonify, request
from flask_cors import CORS
import json
import os
import psycopg2
import psycopg2.extras 
from dotenv import load_dotenv
import numpy as np
import datetime
import random
import google.generativeai as genai
from ml_engine import MLEngine
# --- Inisialisasi Aplikasi Flask & Database ---
load_dotenv()  # Memuat variabel dari file .env
# --- KONFIGURASI GEMINI AI ---
try:
    GEMINI_API_KEY = os.getenv('GEMINI_API_KEY')
    if not GEMINI_API_KEY:
        print("PERINGATAN: GEMINI_API_KEY tidak ditemukan di .env. Endpoint /chat tidak akan berfungsi.")
        model = None
        chat = None
    else:
        genai.configure(api_key=GEMINI_API_KEY)
        
        # Definisikan instruksi sistem dan konfigurasi
        system_instruction = (
            "Anda adalah StockPredict AI, asisten inventaris AI yang ramah dan membantu. "
            "Tugas Anda adalah menjawab pertanyaan pengguna tentang data inventaris, "
            "prediksi stok, dan tren penjualan. Gunakan bahasa yang jelas dan profesional. "
            "Jangan menjawab pertanyaan di luar topik manajemen inventaris."
        )
        
        generation_config = genai.GenerationConfig(temperature=0.7)
        
        # Masukkan konfigurasi dan instruksi saat membuat model
        model = genai.GenerativeModel(
            'gemini-2.5-flash',
            generation_config=generation_config,
            system_instruction=system_instruction
        )
        
        # Mulai chat hanya dengan riwayat kosong
        chat = model.start_chat(history=[]) 
        
        print("Model Gemini AI berhasil dikonfigurasi.")
except Exception as e:
    print(f"Error saat mengkonfigurasi Gemini AI: {e}")
    model = None
    chat = None
# --- AKHIR KONFIGURASI GEMINI ---

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
ml_engine = MLEngine(get_db_connection)
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
                t.price_per_unit,
                t.is_promo
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
    try:
        data = request.get_json()
        product_query = "SELECT product_id, price, stock FROM products WHERE sku = %s;"
        product = db_query(product_query, (data['product_sku'],), fetch_all=False)
        
        if not product:
            return jsonify({'error': 'Product SKU not found'}), 404
        
        quantity_to_sell = int(data['quantity'])
        # [MODIFIKASI] Ambil status promo dari request, default False
        is_promo = data.get('is_promo', False) 
        
        if product['stock'] < quantity_to_sell:
            return jsonify({'error': f"Stok tidak mencukupi. Sisa stok: {product['stock']}"}), 400
            
        insert_query = """
            INSERT INTO transactions (product_id, quantity_sold, price_per_unit, transaction_date, is_promo)
            VALUES (%s, %s, %s, %s, %s)
            RETURNING *;
        """
        params = (
            product['product_id'],
            quantity_to_sell,
            product['price'],
            datetime.datetime.now(datetime.timezone.utc),
            is_promo # [MODIFIKASI] Simpan ke DB
        )
        new_transaction = dict(db_query(insert_query, params, fetch_all=False))
        new_transaction['transaction_date'] = new_transaction['transaction_date'].isoformat()
        
        stock_query = "UPDATE products SET stock = stock - %s WHERE product_id = %s;"
        db_query(stock_query, (quantity_to_sell, product['product_id']), fetch_all=False)
        
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
    
@app.route('/events', methods=['GET'])
def get_events():
    """
    [READ] - Mengambil semua event kalender (holidays & custom).
    """
    try:
        query = "SELECT * FROM events ORDER BY event_date DESC;"
        events = [dict(row) for row in db_query(query, fetch_all=True)]
        # Konversi date object ke string ISO (YYYY-MM-DD)
        for e in events:
            e['event_date'] = e['event_date'].isoformat()
        return jsonify(events)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/events', methods=['POST'])
def add_event():
    """
    [CREATE] - Menambah event kustom baru.
    """
    try:
        data = request.get_json()
        query = """
            INSERT INTO events (event_name, event_date, type, description, include_in_prediction)
            VALUES (%s, %s, 'custom', %s, %s)
            RETURNING *;
        """
        params = (
            data['name'], data['date'], data.get('description'), data['includeInPrediction']
        )
        new_event = dict(db_query(query, params, fetch_all=False))
        new_event['event_date'] = new_event['event_date'].isoformat()
        return jsonify(new_event), 201
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/events/<int:event_id>', methods=['DELETE'])
def delete_event(event_id):
    """
    [DELETE] - Menghapus event kustom (bukan 'holiday').
    """
    try:
        # Pastikan hanya event 'custom' yang bisa dihapus
        query = "DELETE FROM events WHERE event_id = %s AND type = 'custom' RETURNING *;"
        deleted_event = db_query(query, (event_id,), fetch_all=False)
        if deleted_event:
            return jsonify({'message': 'Event deleted successfully'})
        # Jika tidak ada yang terhapus (karena ID tidak ada atau tipenya 'holiday')
        return jsonify({'error': 'Event not found or is a national holiday (cannot be deleted)'}), 404
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# --- FUNGSI HELPER UNTUK PREDIKSI PROPHET ---

def get_sales_data_from_db(product_sku):
    """
    Mengambil data penjualan historis untuk SKU tertentu dari tabel 'transactions'.
    Data diagregasi per hari (ds) dan jumlah penjualan (y) sesuai format Prophet.
    """
    try:
        query = """
            SELECT 
                DATE(t.transaction_date) as ds,
                SUM(t.quantity_sold) as y
            FROM transactions t
            JOIN products p ON t.product_id = p.product_id
            WHERE p.sku = %s
            GROUP BY DATE(t.transaction_date)
            ORDER BY ds ASC;
        """
        # db_query akan mengembalikan list of dicts
        data = db_query(query, (product_sku,), fetch_all=True)
        
        # Konversi ke DataFrame Pandas
        df = pd.DataFrame(data)
        
        # Pastikan kolom 'y' adalah numerik dan 'ds' adalah datetime
        if not df.empty:
            # Konversi kolom 'ds' (yang mungkin bertipe object/date) ke datetime64[ns]
            df['ds'] = pd.to_datetime(df['ds'])
            df['y'] = pd.to_numeric(df['y'])
        
        return df
        
    except Exception as e:
        print(f"Error saat mengambil data penjualan: {e}")
        return pd.DataFrame() 

def get_holidays_from_db():
    """
    Mengambil data hari libur dan acara kustom dari tabel 'events'
    untuk digunakan oleh model Prophet.
    """
    try:
        query = """
            SELECT 
                event_name as holiday, 
                event_date as ds 
            FROM events
            WHERE include_in_prediction = TRUE;
        """
        data = db_query(query, fetch_all=True)
        
        # Konversi ke DataFrame Pandas
        df = pd.DataFrame(data)
        
        # Pastikan 'ds' adalah datetime
        if not df.empty:
            df['ds'] = pd.to_datetime(df['ds'])
            
        return df
        
    except Exception as e:
        print(f"Error saat mengambil data hari libur: {e}")
        return pd.DataFrame() # Kembalikan DataFrame kosong jika error

def get_current_stock_from_db(product_sku):
    """
    Mengambil informasi nama dan stok produk saat ini berdasarkan SKU.
    """
    try:
        query = "SELECT name, stock FROM products WHERE sku = %s;"
        # fetch_all=False akan mengembalikan satu dict
        product_info = db_query(query, (product_sku,), fetch_all=False)
        
        if not product_info:
            raise Exception(f"Info produk tidak ditemukan untuk SKU: {product_sku}")
            
        # Konversi dari RealDictRow ke dict standar
        return dict(product_info)
        
    except Exception as e:
        print(f"Error saat mengambil info stok: {e}")
        return None

def run_prediction(product_sales_df, holidays_df, days_to_forecast=7):
    """
    Menjalankan model Prophet AI untuk memprediksi penjualan.
    """
    # Inisialisasi model dengan musiman (seasonality)
    model = Prophet(
        holidays=holidays_df if not holidays_df.empty else None,
        daily_seasonality=False,
        weekly_seasonality=True,  # Menangkap tren mingguan (misal: weekend vs weekday)
        yearly_seasonality=True,  # Menangkap tren tahunan (misal: liburan akhir tahun)
        changepoint_prior_scale=0.05
    )
    
    # Masukkan data penjualan ke model
    model.fit(product_sales_df)
    
    # Buat kerangka data (DataFrame) untuk 7 hari ke depan
    future = model.make_future_dataframe(periods=days_to_forecast)
    
    # Lakukan prediksi
    forecast = model.predict(future)
    
    return forecast

# --- ENDPOINT PREDIKSI ---
@app.route('/predict', methods=['POST'])
def predict_stock():
    try:
        data = request.get_json()
        if not data or 'product_sku' not in data:
            return jsonify({'error': 'Product SKU is required.'}), 400
            
        product_sku = data['product_sku']
        forecast_days = int(data.get('days', 7))
        
        # 1. Jalankan Prediksi
        forecast = ml_engine.predict(product_sku, days=forecast_days)
        
        # Pastikan kolom ds bertipe datetime
        forecast['ds'] = pd.to_datetime(forecast['ds'])
        
        # 2. Ambil data aktual
        actual_df = ml_engine.get_sales_data(product_sku)
        if not actual_df.empty:
            actual_df['ds'] = pd.to_datetime(actual_df['ds'])
        
        # 3. Format Data untuk Grafik (Logic View Dinamis)
        # Gunakan tanggal terakhir dari PREDIKSI, bukan hari ini
        last_date = forecast['ds'].max()
        view_range_days = forecast_days + 30 # Lihat 30 hari ke belakang
        
        # Hitung start date relatif terhadap data terakhir
        start_view_date = last_date - pd.Timedelta(days=view_range_days)
        
        # Filter data
        view_df = forecast[forecast['ds'] >= start_view_date].copy()
        
        actual_map = {}
        if not actual_df.empty:
            actual_map = {d.strftime('%Y-%m-%d'): val for d, val in zip(actual_df['ds'], actual_df['y'])}
        
        chart_data = []
        for _, row in view_df.iterrows():
            date_str = row['ds'].strftime('%Y-%m-%d')
            actual_val = actual_map.get(date_str, None)
            
            chart_data.append({
                'date': date_str,
                'actual': actual_val,
                'predicted': round(row['yhat_corrected']),
                'lower': round(row['yhat_lower_corrected']),
                'upper': round(row['yhat_upper_corrected'])
            })

        # 4. Buat Rekomendasi Restock (PERBAIKAN LOGIKA)
        product_info_query = "SELECT name, stock FROM products WHERE sku = %s"
        product_info = db_query(product_info_query, (product_sku,), fetch_all=False)
        
        # [FIX] Ambil n hari terakhir sebagai prediksi masa depan
        # Karena Prophet append future dates di akhir dataframe
        future_days_df = forecast.tail(forecast_days)
        
        # Hitung total prediksi
        total_predicted_sales = future_days_df['yhat_corrected'].sum()
        
        # Buffer stok
        buffer_percent = 1.2 if forecast_days <= 7 else 1.1
        optimal_stock = round(total_predicted_sales * buffer_percent)
        current_stock = product_info['stock']
        
        gap = optimal_stock - current_stock
        
        if gap > 0:
            suggestion = f"Restock +{int(gap)} unit"
            urgency = "high" if gap > current_stock else "medium"
            trend = "up"
        else:
            suggestion = "Stok Aman"
            urgency = "low"
            trend = "down"

        recommendations = [{
            'product': product_info['name'],
            'current': current_stock,
            'optimal': int(optimal_stock),
            'trend': trend,
            'suggestion': suggestion,
            'urgency': urgency
        }]

        # Ambil Akurasi
        accuracy_score = 0
        meta_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "models", "meta", f"meta_{product_sku}.json")
        if os.path.exists(meta_path):
            try:
                with open(meta_path, 'r') as f:
                    meta = json.load(f)
                    accuracy_score = meta.get('accuracy_score', 0)
            except:
                pass

        return jsonify({
            'chartData': chart_data,
            'recommendations': recommendations,
            'accuracy': round(accuracy_score, 1)
        })

    except Exception as e:
        print(f"Prediction Error: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500

@app.route('/chat', methods=['POST'])
def chat_with_ai():
    """
    [CREATE] - Meneruskan pesan ke Gemini AI dan mengembalikan responsnya.
    """
    # Periksa apakah model gagal diinisialisasi saat startup
    if not model or not chat:
        return jsonify({'error': 'Model Gemini AI tidak terkonfigurasi dengan benar di server.'}), 503 # Service Unavailable

    try:
        data = request.get_json()
        user_message = data.get('message', '').strip()

        if not user_message:
            return jsonify({'error': 'Pesan tidak boleh kosong.'}), 400
        
        # Kirim pesan ke Gemini
        # 'chat.send_message' akan mengingat riwayat percakapan sebelumnya
        response = chat.send_message(user_message)
        
        # Kembalikan respons teks murni dari model
        return jsonify({'role': 'assistant', 'content': response.text})

    except Exception as e:
        # Tangani error jika API call gagal
        print(f"Error saat memanggil Gemini API: {e}")
        return jsonify({'error': f'Terjadi masalah saat menghubungi AI: {str(e)}'}), 500

@app.route('/settings/status', methods=['GET'])
def get_system_status():
    """
    [READ] - Mengambil info status sistem.
    """
    try:
        # Coba kueri ke database untuk memeriksa koneksi
        db_query("SELECT 1", fetch_all=False)
        db_status = "Connected"
    except Exception:
        db_status = "Disconnected"

    return jsonify({
        'version': '1.0.0',
        'last_updated': 'November 12, 2025', # Anda bisa buat ini dinamis jika mau
        'ai_model': 'Prophet v1.1 (Python)',
        'database_status': db_status
    })
   
# --- Menjalankan Server ---
if __name__ == '__main__':
    # 'port=5000' adalah port standar untuk backend Flask
    # 'debug=True' agar server otomatis restart saat ada perubahan kode
    app.run(debug=True, port=5000)