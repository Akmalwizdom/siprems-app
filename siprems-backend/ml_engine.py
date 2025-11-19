import pandas as pd
import numpy as np
from prophet import Prophet
from prophet.serialize import model_to_json, model_from_json
import os
import json
import logging
import psycopg2
import psycopg2.extras
from sklearn.metrics import mean_absolute_error, mean_absolute_percentage_error

# Konfigurasi Logging
logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(message)s")

# Folder untuk menyimpan model
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
MODELS_DIR = os.path.join(BASE_DIR, "models")
META_DIR = os.path.join(MODELS_DIR, "meta")

os.makedirs(MODELS_DIR, exist_ok=True)
os.makedirs(META_DIR, exist_ok=True)

# Helper untuk koneksi database
def db_query_wrapper(conn_func):
    def execute(query, params=None, fetch_all=True):
        conn = conn_func()
        try:
            cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
            cur.execute(query, params)
            if fetch_all:
                return cur.fetchall()
            return cur.fetchone()
        finally:
            conn.close()
    return execute

class MLEngine:
    def __init__(self, db_connection_func):
        self.get_db_connection = db_query_wrapper(db_connection_func)

    def get_sales_data(self, product_sku):
        """
        Mengambil data penjualan beserta status promo.
        """
        query = """
            SELECT 
                DATE(t.transaction_date) as ds,
                SUM(t.quantity_sold) as y,
                MAX(CASE WHEN t.is_promo THEN 1 ELSE 0 END) as promo
            FROM transactions t
            JOIN products p ON t.product_id = p.product_id
            WHERE p.sku = %s
            GROUP BY DATE(t.transaction_date)
            ORDER BY ds ASC;
        """
        df = pd.DataFrame(self.get_db_connection(query, (product_sku,), fetch_all=True))
        if not df.empty:
            df['ds'] = pd.to_datetime(df['ds'])
            df['y'] = pd.to_numeric(df['y'])
            df['promo'] = pd.to_numeric(df['promo'])
        return df

    def get_holidays(self):
        """Mengambil data hari libur."""
        query = "SELECT event_name as holiday, event_date as ds FROM events WHERE include_in_prediction = TRUE;"
        df = pd.DataFrame(self.get_db_connection(query, fetch_all=True))
        if not df.empty:
            df['ds'] = pd.to_datetime(df['ds'])
            df['lower_window'] = -2
            df['upper_window'] = 1
        return df if not df.empty else None

    def train_product_model(self, product_sku):
        """
        Logika Training V4 + Promo Regressor + Metrik Akurasi
        """
        df = self.get_sales_data(product_sku)
        holidays = self.get_holidays()

        if df.empty or len(df) < 5:
            return {"status": "skipped", "reason": "Not enough data"}

        # 1. Preprocessing: Log Transform
        df['y_log'] = np.log1p(df['y'])
        
        # 2. Preprocessing: Outlier Removal (Sigma 3.5)
        mu = df['y_log'].mean()
        std = df['y_log'].std()
        if std > 0:
            df = df[np.abs(df['y_log'] - mu) <= (3.5 * std)].copy()

        # 3. Konfigurasi Model Prophet
        model = Prophet(
            yearly_seasonality=True,
            weekly_seasonality=True,
            daily_seasonality=False,
            seasonality_mode='multiplicative', 
            changepoint_prior_scale=0.05, 
            holidays=holidays,
            holidays_prior_scale=10.0 
        )
        
        model.add_seasonality(name='monthly', period=30.5, fourier_order=15)
        model.add_regressor('promo')

        # Fit Model
        df_fit = df[['ds', 'y_log', 'promo']].rename(columns={'y_log': 'y'})
        model.fit(df_fit)

        # 4. Evaluasi Model & Hitung Faktor Koreksi
        forecast = model.predict(df_fit)
        y_pred = np.expm1(forecast['yhat'].values)
        y_true = np.expm1(df_fit['y'].values)
        
        # Hitung Faktor Koreksi (WAJIB DILAKUKAN SEBELUM DISIMPAN)
        ratios = y_true / (y_pred + 1e-6)
        correction_factor = float(np.median(ratios))
        correction_factor = max(0.90, min(1.10, correction_factor))

        # Hitung Metrik Akurasi (MAE & MAPE)
        mae = mean_absolute_error(y_true, y_pred)
        mape = mean_absolute_percentage_error(y_true, y_pred)
        accuracy_score = max(0, 100 * (1 - mape)) # Pastikan tidak negatif

        # Simpan Model
        with open(os.path.join(MODELS_DIR, f"model_{product_sku}.json"), "w") as f:
            f.write(model_to_json(model))
            
        # Simpan Metadata (Termasuk Correction Factor & Akurasi)
        with open(os.path.join(META_DIR, f"meta_{product_sku}.json"), "w") as f:
            json.dump({
                "correction_factor": correction_factor,
                "mae": mae,
                "mape_percent": mape * 100,
                "accuracy_score": accuracy_score
            }, f)

        return {
            "status": "success", 
            "factor": correction_factor,
            "accuracy": accuracy_score
        }

    def predict(self, product_sku, days=7):
        """
        Prediksi dengan handling Promo Masa Depan & Correction Factor
        """
        model_path = os.path.join(MODELS_DIR, f"model_{product_sku}.json")
        meta_path = os.path.join(META_DIR, f"meta_{product_sku}.json")

        # Latih model jika belum ada
        if not os.path.exists(model_path):
            res = self.train_product_model(product_sku)
            if res['status'] != 'success':
                raise Exception("Data tidak cukup untuk prediksi.")

        # Load Model
        with open(model_path, 'r') as f:
            model = model_from_json(f.read())
        
        # Load Correction Factor (Default 1.0 jika gagal load)
        correction_factor = 1.0
        accuracy_score = 0.0
        
        if os.path.exists(meta_path):
            with open(meta_path, 'r') as f:
                meta = json.load(f)
                correction_factor = meta.get('correction_factor', 1.0)
                accuracy_score = meta.get('accuracy_score', 0.0)

        # Buat DataFrame Masa Depan
        future = model.make_future_dataframe(periods=days)
        
        # Handling Promo Masa Depan
        df_history = self.get_sales_data(product_sku)
        promo_map = dict(zip(df_history['ds'], df_history['promo']))
        future['promo'] = future['ds'].map(promo_map).fillna(0)
        
        # Prediksi
        forecast = model.predict(future)

        # Terapkan Faktor Koreksi & Inverse Log
        forecast['yhat_corrected'] = np.expm1(forecast['yhat']) * correction_factor
        forecast['yhat_lower_corrected'] = np.expm1(forecast['yhat_lower']) * correction_factor
        forecast['yhat_upper_corrected'] = np.expm1(forecast['yhat_upper']) * correction_factor

        # Pastikan tidak ada nilai negatif
        cols = ['yhat_corrected', 'yhat_lower_corrected', 'yhat_upper_corrected']
        for col in cols:
            forecast[col] = forecast[col].clip(lower=0)
        
        # Kembalikan juga nilai akurasi untuk ditampilkan di Frontend (opsional)
        forecast['accuracy_score'] = accuracy_score

        return forecast