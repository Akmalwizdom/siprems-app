import pandas as pd
from flask import Flask, jsonify, request
from flask_cors import CORS
from prophet import Prophet
import os
import psycopg2
import psycopg2.extras # Untuk mengubah hasil query menjadi dict
from dotenv import load_dotenv
import numpy as np
import datetime

# --- Inisialisasi Aplikasi Flask & Database ---
load_dotenv() # Memuat variabel dari file .env

app = Flask(__name__)
CORS(app) # Mengizinkan frontend di localhost:3000 untuk mengakses

def get_db_connection():
    """Mendapatkan koneksi ke database PostgreSQL."""
    conn = psycopg2.connect(
        host=os.getenv('DB_HOST'),
        database=os.getenv('DB_NAME'),
        user=os.getenv('DB_USER'),
        password=os.getenv('DB_PASSWORD')
    )
    return conn

# Helper untuk menjalankan query dan mendapatkan hasil sebagai dictionary
def db_query(query, params=None, fetch_all=True):
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
        
        conn.commit() # Commit perubahan (penting untuk POST/PUT/DELETE)
        return result
    
    except Exception as e:
        if conn:
            conn.rollback() # Batalkan jika ada error
        print(f"Database error: {e}")
        raise e # Lempar error ke endpoint untuk ditangani
    
    finally:
        if conn:
            cur.close()
            conn.close()

# --- TAHAP 1: FUNGSI MODEL PROPHET (TIDAK BERUBAH) ---

def get_sales_data_from_db(product_sku):
    query = """
        SELECT DATE(t.transaction_date) as ds, SUM(t.quantity_sold) as y
        FROM transactions t
        JOIN products p ON t.product_id = p.product_id
        WHERE p.sku = %s
        GROUP BY DATE(t.transaction_date)
        ORDER BY ds;
    """
    sales_data = db_query(query, (product_sku,), fetch_all=True)
    df = pd.DataFrame(sales_data, columns=['ds', 'y'])
    df['ds'] = pd.to_datetime(df['ds'])
    return df

def get_holidays_from_db():
    query = """
        SELECT event_name as holiday, event_date as ds, -7 as lower_window, 2 as upper_window
        FROM events
        WHERE include_in_prediction = TRUE;
    """
    holidays_df = pd.DataFrame(db_query(query, fetch_all=True))
    if not holidays_df.empty:
        holidays_df['ds'] = pd.to_datetime(holidays_df['ds'])
    return holidays_df

def get_current_stock_from_db(product_sku):
    query = "SELECT stock, name FROM products WHERE sku = %s;"
    result = db_query(query, (product_sku,), fetch_all=False)
    if result:
        return {'stock': result['stock'], 'name': result['name']}
    return {'stock': 0, 'name': 'Unknown'}

def run_prediction(sales_data_df, holidays_df, days_to_forecast=7):
    m = Prophet(
        holidays=holidays_df,
        seasonality_mode='multiplicative',
        daily_seasonality=False,
        weekly_seasonality=True,
        yearly_seasonality=True
    )
    m.fit(sales_data_df)
    future = m.make_future_dataframe(periods=days_to_forecast)
    forecast = m.predict(future)
    return forecast

# --- TAHAP 2: ENDPOINT PREDIKSI (TIDAK BERUBAH) ---

@app.route('/predict', methods=['POST'])
def predict_stock():
    try:
        data = request.get_json() or {}
        product_sku_to_predict = data.get('product_sku', 'LAP-001')
        time_range = data.get('time_range', 7)

        if time_range not in [7, 30, 90]:
            time_range = 7

        product_sales_df = get_sales_data_from_db(product_sku_to_predict)
        holidays_df = get_holidays_from_db()
        product_info = get_current_stock_from_db(product_sku_to_predict)

        if product_sales_df.empty:
            return jsonify({'error': f'Tidak ada data penjualan untuk SKU {product_sku_to_predict}'}), 404

        forecast = run_prediction(product_sales_df, holidays_df, days_to_forecast=time_range)

        actual_data = product_sales_df.rename(columns={'y': 'actual'})
        forecast_with_actual = forecast.merge(actual_data, on='ds', how='left')

        lookback_days = min(12, len(product_sales_df))
        chart_data_raw = forecast_with_actual.iloc[-(lookback_days + time_range):]

        chart_data = []
        for _, row in chart_data_raw.iterrows():
            chart_data.append({
                'date': row['ds'].strftime('%Y-%m-%d'),
                'actual': round(row['actual']) if pd.notna(row['actual']) else None,
                'predicted': round(row['yhat']),
                'lower': round(row['yhat_lower']),
                'upper': round(row['yhat_upper'])
            })

        prediction_only = forecast.iloc[-time_range:]
        total_predicted_sales = prediction_only['yhat'].sum()

        safety_stock_factor = 1.20
        optimal_stock = round(total_predicted_sales * safety_stock_factor)

        current_product_stock = product_info['stock']
        suggestion_amount = optimal_stock - current_product_stock

        if suggestion_amount <= 0:
            suggestion_text = "Stok Cukup"
            urgency = "low"
        else:
            suggestion_text = f"Restock +{suggestion_amount} unit"
            urgency = "high" if suggestion_amount > optimal_stock * 0.5 else "medium"

        recommendations = [
            {
                'product': product_info['name'],
                'current': current_product_stock,
                'optimal': optimal_stock,
                'trend': 'up' if prediction_only.iloc[-1]['yhat'] > prediction_only.iloc[0]['yhat'] else 'down',
                'suggestion': suggestion_text,
                'urgency': urgency
            }
        ]

        return jsonify({
            'chartData': chart_data,
            'recommendations': recommendations,
            'timeRange': time_range
        })

    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/predict/explain', methods=['POST'])
def predict_explain():
    try:
        data = request.get_json() or {}
        product_sku = data.get('product_sku', 'LAP-001')
        time_range = data.get('time_range', 7)

        product_sales_df = get_sales_data_from_db(product_sku)
        holidays_df = get_holidays_from_db()

        if product_sales_df.empty:
            return jsonify({'error': 'No sales data available'}), 404

        forecast = run_prediction(product_sales_df, holidays_df, days_to_forecast=time_range)

        prediction_only = forecast.iloc[-time_range:]
        avg_predicted = prediction_only['yhat'].mean()
        trend = 'upward' if prediction_only.iloc[-1]['yhat'] > prediction_only.iloc[0]['yhat'] else 'downward'

        explanations = []

        holidays = holidays_df if not holidays_df.empty else pd.DataFrame()
        holiday_impact = False
        holiday_names = []

        if not holidays.empty:
            for _, holiday in holidays.iterrows():
                holiday_date = pd.to_datetime(holiday['ds'])
                if holiday_date in prediction_only['ds'].values:
                    holiday_impact = True
                    holiday_names.append(holiday['holiday'])

        if holiday_impact:
            explanations.append({
                'factor': 'Holiday/Event Impact',
                'description': f"Upcoming holidays ({', '.join(holiday_names)}) are factored into the forecast. These typically influence sales patterns.",
                'icon': 'calendar'
            })

        recent_sales_df = product_sales_df.iloc[-30:] if len(product_sales_df) >= 30 else product_sales_df
        if len(recent_sales_df) > 0:
            recent_avg = recent_sales_df['y'].mean()
            recent_trend_direction = 'increasing' if recent_sales_df['y'].iloc[-1] > recent_sales_df['y'].iloc[0] else 'decreasing'
            explanations.append({
                'factor': 'Recent Sales Trend',
                'description': f"Based on the last 30 days, sales show a {recent_trend_direction} trend with average of {round(recent_avg)} units/day.",
                'icon': 'trend'
            })

        if trend == 'upward':
            explanations.append({
                'factor': 'Demand Growth',
                'description': f"The prediction shows an {trend} trend over the next {time_range} days, with average forecasted sales of {round(avg_predicted)} units/day.",
                'icon': 'arrow-up'
            })
        else:
            explanations.append({
                'factor': 'Demand Decline',
                'description': f"The prediction shows a {trend} trend over the next {time_range} days. Consider reviewing your promotion strategy.",
                'icon': 'arrow-down'
            })

        volatility = forecast['yhat'].std()
        if volatility > forecast['yhat'].mean() * 0.5:
            explanations.append({
                'factor': 'High Seasonality',
                'description': 'This product exhibits strong weekly or seasonal patterns, making demand more variable.',
                'icon': 'wave'
            })
        else:
            explanations.append({
                'factor': 'Stable Demand',
                'description': 'This product has consistent, predictable demand patterns.',
                'icon': 'check'
            })

        return jsonify({
            'explanations': explanations,
            'summary': f"{trend.capitalize()} trend with average forecast of {round(avg_predicted)} units/day over {time_range} days"
        })

    except Exception as e:
        return jsonify({'error': str(e)}), 500

# --- TAHAP 3: ENDPOINT BARU UNTUK HALAMAN LAIN ---

# === HALAMAN PRODUK (ProductsPage.tsx) ===

@app.route('/products', methods=['GET'])
def get_products():
    """Mengambil semua produk dari database, dengan opsional filter search."""
    try:
        search = request.args.get('search', '').strip()

        if search:
            # Search by name or SKU
            query = """
                SELECT * FROM products
                WHERE name ILIKE %s OR sku ILIKE %s
                ORDER BY name ASC
                LIMIT 50;
            """
            search_pattern = f"%{search}%"
            products = db_query(query, (search_pattern, search_pattern), fetch_all=True)
        else:
            query = "SELECT * FROM products ORDER BY created_at DESC;"
            products = db_query(query, fetch_all=True)

        return jsonify(products)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/products', methods=['POST'])
def add_product():
    """Menambah produk baru ke database."""
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
        new_product = db_query(query, params, fetch_all=False)
        return jsonify(new_product), 201
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/products/<string:sku>', methods=['PUT'])
def update_product(sku):
    """Memperbarui produk berdasarkan SKU."""
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
            sku # SKU lama untuk klausa WHERE
        )
        updated_product = db_query(query, params, fetch_all=False)
        if updated_product:
            return jsonify(updated_product)
        return jsonify({'error': 'Product not found'}), 404
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/products/<string:sku>', methods=['DELETE'])
def delete_product(sku):
    """Menghapus produk berdasarkan SKU."""
    try:
        query = "DELETE FROM products WHERE sku = %s RETURNING *;"
        deleted_product = db_query(query, (sku,), fetch_all=False)
        if deleted_product:
            return jsonify({'message': 'Product deleted successfully'})
        return jsonify({'error': 'Product not found'}), 404
    except Exception as e:
        # Tangani error jika produk tidak bisa dihapus (misal: karena ada di tabel 'transactions')
        return jsonify({'error': 'Cannot delete product, it may have associated transactions.'}), 400

# === HALAMAN TRANSAKSI (TransactionsPage.tsx) ===

@app.route('/transactions', methods=['GET'])
def get_transactions():
    """Mengambil 100 transaksi terakhir."""
    try:
        query = """
            SELECT t.*, p.name as product_name
            FROM transactions t
            JOIN products p ON t.product_id = p.product_id
            ORDER BY t.transaction_date DESC
            LIMIT 100;
        """
        transactions = db_query(query, fetch_all=True)
        # Konversi datetime ke string agar bisa di-JSON-kan
        for t in transactions:
            t['transaction_date'] = t['transaction_date'].isoformat()
        return jsonify(transactions)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/transactions', methods=['POST'])
def add_transaction():
    """Menambah transaksi baru."""
    try:
        data = request.get_json()
        
        # Dapatkan product_id dan harga dari 'sku' yang dikirim
        product_query = "SELECT product_id, price FROM products WHERE sku = %s;"
        product = db_query(product_query, (data['product_sku'],), fetch_all=False)
        
        if not product:
            return jsonify({'error': 'Product SKU not found'}), 404
            
        query = """
            INSERT INTO transactions (product_id, quantity_sold, price_per_unit, transaction_date)
            VALUES (%s, %s, %s, %s)
            RETURNING *;
        """
        params = (
            product['product_id'],
            int(data['quantity']),
            product['price'], # Gunakan harga dari database
            datetime.datetime.now(datetime.timezone.utc) # Selalu gunakan UTC
        )
        new_transaction = db_query(query, params, fetch_all=False)
        new_transaction['transaction_date'] = new_transaction['transaction_date'].isoformat()
        
        # Kurangi stok produk
        stock_query = """
            UPDATE products SET stock = stock - %s WHERE product_id = %s;
        """
        db_query(stock_query, (int(data['quantity']), product['product_id']), fetch_all=False)
        
        return jsonify(new_transaction), 201
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# === HALAMAN KALENDER (CalendarPage.tsx) ===

@app.route('/events', methods=['GET'])
def get_events():
    """Mengambil semua event kalender."""
    try:
        query = "SELECT * FROM events ORDER BY event_date DESC;"
        events = db_query(query, fetch_all=True)
        for e in events:
            e['event_date'] = e['event_date'].isoformat() # Konversi date ke string
        return jsonify(events)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/events', methods=['POST'])
def add_event():
    """Menambah event kustom baru."""
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
        new_event = db_query(query, params, fetch_all=False)
        new_event['event_date'] = new_event['event_date'].isoformat()
        return jsonify(new_event), 201
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/events/<int:event_id>', methods=['DELETE'])
def delete_event(event_id):
    """Menghapus event kustom."""
    try:
        # Pastikan hanya event 'custom' yang bisa dihapus
        query = "DELETE FROM events WHERE event_id = %s AND type = 'custom' RETURNING *;"
        deleted_event = db_query(query, (event_id,), fetch_all=False)
        if deleted_event:
            return jsonify({'message': 'Event deleted successfully'})
        return jsonify({'error': 'Event not found or is not a custom event'}), 404
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# === HALAMAN DASBOR (Dashboard.tsx) ===

@app.route('/dashboard-stats', methods=['GET'])
def get_dashboard_stats():
    """Mengambil data statistik untuk kartu di dasbor."""
    try:
        # 1. Statistik Kartu
        query_cards = """
            SELECT
                (SELECT COUNT(*) FROM transactions WHERE DATE(transaction_date) = CURRENT_DATE) as daily_transactions,
                (SELECT COUNT(*) FROM products) as active_products,
                (SELECT COUNT(*) FROM products WHERE stock <= 5) as low_stock_items;
        """
        cards_data = db_query(query_cards, fetch_all=False)

        # 2. Tren Penjualan 7 Hari (Line Chart)
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
        sales_trend = db_query(query_sales_trend, fetch_all=True)
        # Format data untuk Recharts
        formatted_sales_trend = [
            {'date': r['date'].strftime('%a'), 'sales': int(r['sales'])}
            for r in sales_trend
        ]

        # 3. Perbandingan Stok (Bar Chart)
        # Ambil 5 produk dengan stok terendah
        query_stock_comp = """
            SELECT
                name as product,
                stock as current,
                (stock + 20) as optimal -- Logika optimal dummy, bisa diganti
            FROM products
            ORDER BY stock ASC
            LIMIT 5;
        """
        stock_comparison = db_query(query_stock_comp, fetch_all=True)

        return jsonify({
            'cards': cards_data,
            'salesTrend': formatted_sales_trend,
            'stockComparison': stock_comparison
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# === HALAMAN INSIGHTS (InsightsPage.tsx) - CHATBOT ===

@app.route('/api/chatbot/query', methods=['POST'])
def chatbot_query():
    """Endpoint untuk chatbot AI yang memberikan insights interaktif."""
    try:
        data = request.get_json() or {}
        query = data.get('query', '').lower()
        last_product = data.get('lastProduct', 'LAP-001')

        response_text = ""
        chart_data = None

        # Deteksi intent dari query user
        if 'top' in query and ('product' in query or 'selling' in query or 'sales' in query):
            # Intent: Show top-selling products
            q = """
                SELECT
                    p.name,
                    p.sku,
                    SUM(t.quantity_sold) as total_sold,
                    SUM(t.quantity_sold * t.price_per_unit) as total_revenue
                FROM products p
                LEFT JOIN transactions t ON p.product_id = t.product_id
                GROUP BY p.product_id, p.name, p.sku
                ORDER BY total_sold DESC
                LIMIT 5;
            """
            top_products = db_query(q, fetch_all=True)

            response_text = "Based on historical sales data, here are your top 5 performing products:\n\n"
            for idx, product in enumerate(top_products, 1):
                sold = product['total_sold'] or 0
                revenue = product['total_revenue'] or 0
                response_text += f"{idx}. **{product['name']}** (SKU: {product['sku']})\n   - Total Sold: {int(sold)} units\n   - Total Revenue: ${revenue:,.2f}\n\n"

            # Prepare chart data
            chart_data = {
                'type': 'bar',
                'data': [
                    {
                        'name': p['name'],
                        'sold': int(p['total_sold'] or 0),
                        'revenue': float(p['total_revenue'] or 0)
                    }
                    for p in top_products
                ]
            }

        elif 'forecast' in query and 'next' in query and 'month' in query:
            # Intent: Forecast next month
            product_sku = last_product
            product_sales_df = get_sales_data_from_db(product_sku)
            holidays_df = get_holidays_from_db()

            if not product_sales_df.empty:
                forecast = run_prediction(product_sales_df, holidays_df, days_to_forecast=30)
                prediction_only = forecast.iloc[-30:]

                avg_forecast = prediction_only['yhat'].mean()
                total_forecast = prediction_only['yhat'].sum()
                trend = 'upward' if prediction_only.iloc[-1]['yhat'] > prediction_only.iloc[0]['yhat'] else 'downward'

                product_info = get_current_stock_from_db(product_sku)

                response_text = f"**30-Day Forecast for {product_info['name']} (SKU: {product_sku})**\n\n"
                response_text += f"📊 **Trend**: {trend.capitalize()}\n"
                response_text += f"📈 **Average Daily Sales**: {int(avg_forecast)} units\n"
                response_text += f"🎯 **Total Forecasted Sales**: {int(total_forecast)} units\n"
                response_text += f"📦 **Current Stock**: {int(product_info['stock'])} units\n\n"

                if total_forecast > product_info['stock']:
                    response_text += f"⚠️ **Action**: Recommend restocking {int(total_forecast - product_info['stock'])} units to meet expected demand."
                else:
                    response_text += f"✅ **Status**: Current stock is sufficient for the forecasted demand."

                # Prepare chart data
                chart_data = {
                    'type': 'line',
                    'data': [
                        {
                            'day': i,
                            'forecast': round(float(row['yhat']), 2),
                            'lower': round(float(row['yhat_lower']), 2),
                            'upper': round(float(row['yhat_upper']), 2)
                        }
                        for i, (_, row) in enumerate(prediction_only.iterrows(), 1)
                    ]
                }

        elif 'spike' in query or 'demand' in query and 'increase' in query or 'rise' in query:
            # Intent: Explain demand spike
            product_sku = last_product
            product_sales_df = get_sales_data_from_db(product_sku)

            if not product_sales_df.empty:
                product_info = get_current_stock_from_db(product_sku)

                # Analyze recent trends
                recent_sales = product_sales_df.iloc[-30:] if len(product_sales_df) >= 30 else product_sales_df
                avg_recent = recent_sales['y'].mean()
                avg_historical = product_sales_df['y'].mean()

                spike_percentage = ((avg_recent - avg_historical) / avg_historical * 100) if avg_historical > 0 else 0

                response_text = f"**Demand Analysis for {product_info['name']}**\n\n"
                response_text += f"📊 **Recent Activity (Last 30 Days)**\n"
                response_text += f"- Average Daily Sales: {int(avg_recent)} units\n"
                response_text += f"- Historical Average: {int(avg_historical)} units\n"
                response_text += f"- Change: {spike_percentage:+.1f}%\n\n"

                # Check for patterns
                holidays_df = get_holidays_from_db()
                if not holidays_df.empty:
                    response_text += "📅 **Upcoming Events**: Check calendar for holidays or events that may impact demand.\n\n"

                response_text += "💡 **Recommendations**:\n"
                if spike_percentage > 20:
                    response_text += "- Strong demand growth detected. Prepare for increased orders.\n"
                    response_text += "- Ensure adequate inventory levels to avoid stockouts.\n"
                elif spike_percentage > 0:
                    response_text += "- Moderate demand increase. Monitor inventory levels closely.\n"
                else:
                    response_text += "- Demand is declining. Review marketing strategy and promotions.\n"

                # Prepare chart data
                chart_data = {
                    'type': 'bar',
                    'data': [
                        {
                            'period': 'Last 30 Days',
                            'average': round(avg_recent, 2)
                        },
                        {
                            'period': 'Historical',
                            'average': round(avg_historical, 2)
                        }
                    ]
                }

        else:
            # Default helpful response
            response_text = f"I'm your AI inventory assistant. I can help you with:\n\n"
            response_text += "🔝 **'Show top-selling products'** - View your best-performing items\n"
            response_text += "📅 **'Forecast next month'** - Get 30-day sales predictions\n"
            response_text += "📈 **'Explain demand spike'** - Analyze demand trends and changes\n"
            response_text += "❓ **Ask any question** about {last_product} or inventory management!\n\n"
            response_text += "What would you like to know?"

        return jsonify({
            'response': response_text,
            'chartData': chart_data,
            'lastProduct': last_product
        })

    except Exception as e:
        return jsonify({'error': str(e)}), 500


# --- Menjalankan Server ---
if __name__ == '__main__':
    app.run(debug=True, port=5000)
