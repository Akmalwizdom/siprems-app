import pandas as pd
import numpy as np
from prophet import Prophet
from prophet.serialize import model_to_json, model_from_json
import os
import json
import logging
from sqlalchemy import text
from sklearn.metrics import mean_absolute_error, mean_absolute_percentage_error
from utils.config import get_config

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(message)s")

# Use config for model directories
config = get_config()
MODELS_DIR = config.MODELS_DIR
META_DIR = config.MODELS_META_DIR

os.makedirs(MODELS_DIR, exist_ok=True)
os.makedirs(META_DIR, exist_ok=True)

class MLEngine:
    def __init__(self, db_engine_func):
        self.get_db_engine = db_engine_func

    def get_sales_data(self, product_sku):
        """
        Fetch sales data with promo status, aggregated by day.
        Returns DataFrame with ds (date), y (quantity), and promo (status) columns.
        """
        query = text("""
            SELECT
                DATE(t.transaction_date) as ds,
                SUM(t.quantity_sold) as y,
                MAX(CASE WHEN t.is_promo THEN 1 ELSE 0 END) as promo
            FROM transactions t
            JOIN products p ON t.product_id = p.product_id
            WHERE p.sku = :sku
            GROUP BY DATE(t.transaction_date)
            ORDER BY ds ASC
        """)
        try:
            engine = self.get_db_engine()
            with engine.connect() as conn:
                result = conn.execute(query, {"sku": product_sku}).fetchall()
                df = pd.DataFrame(result) if result else pd.DataFrame()

                if not df.empty:
                    df['ds'] = pd.to_datetime(df['ds'])
                    df['y'] = pd.to_numeric(df['y'], errors='coerce').fillna(0).astype(int)
                    df['promo'] = pd.to_numeric(df['promo'], errors='coerce').fillna(0).astype(int)

                return df
        except Exception as e:
            logging.error(f"Error fetching sales data for {product_sku}: {e}")
            return pd.DataFrame()

    def get_holidays(self):
        """Fetch holiday data from events table."""
        query = text("""
            SELECT event_name as holiday, event_date as ds
            FROM events
            WHERE include_in_prediction = TRUE
        """)
        try:
            engine = self.get_db_engine()
            with engine.connect() as conn:
                result = conn.execute(query).fetchall()
                df = pd.DataFrame(result) if result else pd.DataFrame()
                if not df.empty:
                    df['ds'] = pd.to_datetime(df['ds'])
                    df['lower_window'] = -2
                    df['upper_window'] = 1
                return df if not df.empty else None
        except Exception as e:
            logging.error(f"Error fetching holidays: {e}")
            return None

    def train_product_model(self, product_sku):
        """
        Train model with promo regressor and accuracy metrics.
        Includes log transformation, outlier removal, and correction factor calculation.
        """
        df = self.get_sales_data(product_sku)
        holidays = self.get_holidays()

        if df.empty or len(df) < 5:
            return {"status": "skipped", "reason": "Not enough data"}

        try:
            # 1. Log Transform (to stabilize variance)
            df['y_log'] = np.log1p(df['y'])

            # 2. Outlier Removal (3.5 sigma)
            mu = df['y_log'].mean()
            std = df['y_log'].std()
            if std > 0:
                df = df[np.abs(df['y_log'] - mu) <= (3.5 * std)].copy()

            # Ensure we still have minimum data
            if len(df) < 5:
                return {"status": "skipped", "reason": "Not enough data after outlier removal"}

            # 3. Configure Prophet model
            model = Prophet(
                yearly_seasonality=True,
                weekly_seasonality=True,
                daily_seasonality=False,
                seasonality_mode='multiplicative',
                changepoint_prior_scale=0.05,
                holidays=holidays,
                holidays_prior_scale=10.0,
                interval_width=0.95
            )

            model.add_seasonality(name='monthly', period=30.5, fourier_order=15)
            model.add_regressor('promo')

            # 4. Prepare data and fit
            df_fit = df[['ds', 'y_log', 'promo']].rename(columns={'y_log': 'y'})

            # Suppress Prophet warnings during training
            import warnings
            with warnings.catch_warnings():
                warnings.simplefilter("ignore")
                model.fit(df_fit)

            # 5. Evaluate and calculate correction factor
            forecast = model.predict(df_fit)
            y_pred = np.expm1(forecast['yhat'].values)
            y_true = np.expm1(df_fit['y'].values)

            # Calculate correction factor (median ratio)
            ratios = y_true / (y_pred + 1e-6)
            correction_factor = float(np.median(ratios))
            correction_factor = max(0.85, min(1.15, correction_factor))  # Clamp between 0.85 and 1.15

            # 6. Calculate accuracy metrics
            mae = mean_absolute_error(y_true, y_pred)
            mape = mean_absolute_percentage_error(y_true, y_pred)
            accuracy_score = max(0, 100 * (1 - min(mape, 1.0)))  # Cap MAPE at 100%

            # 7. Save model
            with open(os.path.join(MODELS_DIR, f"model_{product_sku}.json"), "w") as f:
                f.write(model_to_json(model))

            # 8. Save metadata
            with open(os.path.join(META_DIR, f"meta_{product_sku}.json"), "w") as f:
                json.dump({
                    "correction_factor": correction_factor,
                    "mae": float(mae),
                    "mape_percent": float(mape * 100),
                    "accuracy_score": float(accuracy_score)
                }, f, indent=2)

            logging.info(f"Model trained for {product_sku}: accuracy={accuracy_score:.1f}%, correction_factor={correction_factor:.3f}")

            return {
                "status": "success",
                "factor": correction_factor,
                "accuracy": accuracy_score
            }

        except Exception as e:
            logging.error(f"Error training model for {product_sku}: {e}")
            return {"status": "error", "reason": str(e)}

    def predict(self, product_sku, days=7):
        """
        Prediksi dengan handling Promo Masa Depan & Correction Factor
        """
        model_path = os.path.join(MODELS_DIR, f"model_{product_sku}.json")
        meta_path = os.path.join(META_DIR, f"meta_{product_sku}.json")

        # Train model if it doesn't exist
        if not os.path.exists(model_path):
            res = self.train_product_model(product_sku)
            if res['status'] != 'success':
                raise Exception(f"Insufficient data to train model for product {product_sku}. Need at least 5 days of sales history.")

        # Load Model
        with open(model_path, 'r') as f:
            model = model_from_json(f.read())

        # Load Correction Factor & Accuracy (defaults if not found)
        correction_factor = 1.0
        accuracy_score = 0.0

        if os.path.exists(meta_path):
            try:
                with open(meta_path, 'r') as f:
                    meta = json.load(f)
                    correction_factor = float(meta.get('correction_factor', 1.0))
                    accuracy_score = float(meta.get('accuracy_score', 0.0))
            except Exception as e:
                logging.warning(f"Could not load metadata for {product_sku}: {e}. Using defaults.")

        # Create future dataframe
        future = model.make_future_dataframe(periods=days)

        # Handle promo status for future dates
        df_history = self.get_sales_data(product_sku)
        if not df_history.empty and 'promo' in df_history.columns:
            promo_map = dict(zip(df_history['ds'], df_history['promo']))
            future['promo'] = future['ds'].map(promo_map).fillna(0)
        else:
            future['promo'] = 0

        # Run prediction
        forecast = model.predict(future)

        # Apply correction factor and inverse log transform
        forecast['yhat_corrected'] = np.expm1(forecast['yhat'].values) * correction_factor
        forecast['yhat_lower_corrected'] = np.expm1(forecast['yhat_lower'].values) * correction_factor
        forecast['yhat_upper_corrected'] = np.expm1(forecast['yhat_upper'].values) * correction_factor

        # Ensure no negative values
        cols = ['yhat_corrected', 'yhat_lower_corrected', 'yhat_upper_corrected']
        for col in cols:
            forecast[col] = forecast[col].clip(lower=0)

        # Add accuracy for frontend display
        forecast['accuracy_score'] = accuracy_score

        return forecast
