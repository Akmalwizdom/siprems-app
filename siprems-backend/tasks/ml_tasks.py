from celery import shared_task
from celery_app import celery_app
import os
import json
import logging
import pandas as pd
import numpy as np
from datetime import datetime
from prophet import Prophet
from prophet.serialize import model_to_json, model_from_json
from sklearn.metrics import mean_absolute_error, mean_absolute_percentage_error

from utils.config import get_config
from utils.db import get_db_connection, db_query
from models.product_model import ProductModel

logger = logging.getLogger(__name__)
config = get_config()

# Ensure model directories exist
os.makedirs(config.MODELS_DIR, exist_ok=True)
os.makedirs(config.MODELS_META_DIR, exist_ok=True)


def get_sales_data_for_task(product_sku):
    """Fetch sales data for a product"""
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
    try:
        result = db_query(query, (product_sku,), fetch_all=True)
        df = pd.DataFrame(result) if result else pd.DataFrame()

        if not df.empty:
            df['ds'] = pd.to_datetime(df['ds'])
            df['y'] = pd.to_numeric(df['y'], errors='coerce').fillna(0).astype(int)
            df['promo'] = pd.to_numeric(df['promo'], errors='coerce').fillna(0).astype(int)

        return df
    except Exception as e:
        logger.error(f"Error fetching sales data for {product_sku}: {e}")
        return pd.DataFrame()


def get_holidays_for_task():
    """Fetch holiday/event data"""
    query = """
        SELECT event_name as holiday, event_date as ds 
        FROM events 
        WHERE include_in_prediction = TRUE
        AND event_type IN ('holiday', 'promotion', 'seasonal');
    """
    try:
        result = db_query(query, fetch_all=True)
        df = pd.DataFrame(result) if result else pd.DataFrame()
        if not df.empty:
            df['ds'] = pd.to_datetime(df['ds'])
            df['lower_window'] = -2
            df['upper_window'] = 1
        return df if not df.empty else None
    except Exception as e:
        logger.error(f"Error fetching holidays: {e}")
        return None


@celery_app.task(bind=True, max_retries=3)
def train_product_model_task(self, product_sku):
    """
    Celery task for training a Prophet model for a product.
    
    Args:
        product_sku: SKU of the product to train model for
        
    Returns:
        dict with training status and results
    """
    try:
        logger.info(f"Starting model training for product {product_sku}")
        
        df = get_sales_data_for_task(product_sku)
        holidays = get_holidays_for_task()

        if df.empty or len(df) < 5:
            logger.warning(f"Insufficient data for {product_sku}: {len(df)} records")
            return {
                "status": "skipped",
                "reason": "Not enough data",
                "product_sku": product_sku,
                "timestamp": datetime.utcnow().isoformat()
            }

        # Log transform
        df['y_log'] = np.log1p(df['y'])

        # Outlier removal (3.5 sigma)
        mu = df['y_log'].mean()
        std = df['y_log'].std()
        if std > 0:
            df = df[np.abs(df['y_log'] - mu) <= (3.5 * std)].copy()

        if len(df) < 5:
            logger.warning(f"Insufficient data after outlier removal for {product_sku}")
            return {
                "status": "skipped",
                "reason": "Not enough data after outlier removal",
                "product_sku": product_sku,
                "timestamp": datetime.utcnow().isoformat()
            }

        # Configure Prophet model
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

        # Prepare data and fit
        df_fit = df[['ds', 'y_log', 'promo']].rename(columns={'y_log': 'y'})

        # Suppress Prophet warnings
        import warnings
        with warnings.catch_warnings():
            warnings.simplefilter("ignore")
            model.fit(df_fit)

        # Evaluate model
        forecast = model.predict(df_fit)
        y_pred = np.expm1(forecast['yhat'].values)
        y_true = np.expm1(df_fit['y'].values)

        # Calculate correction factor
        ratios = y_true / (y_pred + 1e-6)
        correction_factor = float(np.median(ratios))
        correction_factor = max(0.85, min(1.15, correction_factor))

        # Calculate accuracy metrics
        mae = mean_absolute_error(y_true, y_pred)
        mape = mean_absolute_percentage_error(y_true, y_pred)
        accuracy_score = max(0, 100 * (1 - min(mape, 1.0)))

        # Save model
        model_path = os.path.join(config.MODELS_DIR, f"model_{product_sku}.json")
        with open(model_path, "w") as f:
            f.write(model_to_json(model))

        # Save metadata
        meta_path = os.path.join(config.MODELS_META_DIR, f"meta_{product_sku}.json")
        with open(meta_path, "w") as f:
            json.dump({
                "correction_factor": correction_factor,
                "mae": float(mae),
                "mape_percent": float(mape * 100),
                "accuracy_score": float(accuracy_score),
                "trained_at": datetime.utcnow().isoformat(),
                "training_samples": len(df)
            }, f, indent=2)

        logger.info(f"Model trained for {product_sku}: accuracy={accuracy_score:.1f}%")

        return {
            "status": "success",
            "product_sku": product_sku,
            "accuracy": accuracy_score,
            "correction_factor": correction_factor,
            "mae": float(mae),
            "mape_percent": float(mape * 100),
            "timestamp": datetime.utcnow().isoformat()
        }

    except Exception as exc:
        logger.error(f"Error training model for {product_sku}: {exc}", exc_info=True)
        # Retry with exponential backoff
        raise self.retry(exc=exc, countdown=min(2 ** self.request.retries, 600))


@celery_app.task(bind=True, max_retries=3)
def predict_stock_task(self, product_sku, forecast_days=7):
    """
    Celery task for async stock prediction.
    
    Args:
        product_sku: SKU of the product to predict
        forecast_days: Number of days to forecast
        
    Returns:
        dict with prediction results
    """
    try:
        logger.info(f"Starting prediction for {product_sku} (days: {forecast_days})")
        
        model_path = os.path.join(config.MODELS_DIR, f"model_{product_sku}.json")
        meta_path = os.path.join(config.MODELS_META_DIR, f"meta_{product_sku}.json")

        # Train if model doesn't exist
        if not os.path.exists(model_path):
            logger.info(f"Model not found for {product_sku}, training...")
            train_result = train_product_model_task(product_sku)
            if train_result.get('status') != 'success':
                raise Exception(f"Failed to train model: {train_result.get('reason')}")

        # Load model
        with open(model_path, 'r') as f:
            model = model_from_json(f.read())

        # Load metadata
        correction_factor = 1.0
        accuracy_score = 0.0

        if os.path.exists(meta_path):
            try:
                with open(meta_path, 'r') as f:
                    meta = json.load(f)
                    correction_factor = float(meta.get('correction_factor', 1.0))
                    accuracy_score = float(meta.get('accuracy_score', 0.0))
            except Exception as e:
                logger.warning(f"Could not load metadata for {product_sku}: {e}")

        # Create future dataframe
        future = model.make_future_dataframe(periods=forecast_days)

        # Handle promo status
        df_history = get_sales_data_for_task(product_sku)
        if not df_history.empty and 'promo' in df_history.columns:
            promo_map = dict(zip(df_history['ds'], df_history['promo']))
            future['promo'] = future['ds'].map(promo_map).fillna(0)
        else:
            future['promo'] = 0

        # Run prediction
        import warnings
        with warnings.catch_warnings():
            warnings.simplefilter("ignore")
            forecast = model.predict(future)

        # Apply correction factor
        forecast['yhat_corrected'] = np.expm1(forecast['yhat'].values) * correction_factor
        forecast['yhat_lower_corrected'] = np.expm1(forecast['yhat_lower'].values) * correction_factor
        forecast['yhat_upper_corrected'] = np.expm1(forecast['yhat_upper'].values) * correction_factor

        # Ensure no negative values
        cols = ['yhat_corrected', 'yhat_lower_corrected', 'yhat_upper_corrected']
        for col in cols:
            forecast[col] = forecast[col].clip(lower=0)

        # Get actual historical data
        actual_df = get_sales_data_for_task(product_sku)
        if not actual_df.empty:
            actual_df['ds'] = pd.to_datetime(actual_df['ds'])

        # Determine earliest date
        if not actual_df.empty:
            earliest_actual = actual_df['ds'].min()
        else:
            earliest_actual = forecast['ds'].min() - pd.Timedelta(days=30)

        # Build chart data
        chart_df = forecast[forecast['ds'] >= earliest_actual].copy()
        actual_map = {}
        if not actual_df.empty:
            actual_map = {
                d.strftime('%Y-%m-%d'): val
                for d, val in zip(actual_df['ds'], actual_df['y'])
            }

        chart_data = []
        for _, row in chart_df.iterrows():
            date_str = row['ds'].strftime('%Y-%m-%d')
            actual_val = actual_map.get(date_str, None)

            chart_data.append({
                'date': date_str,
                'actual': actual_val,
                'predicted': float(row['yhat_corrected']),
                'lower': float(row['yhat_lower_corrected']),
                'upper': float(row['yhat_upper_corrected'])
            })

        logger.info(f"Prediction completed for {product_sku}")

        return {
            "status": "success",
            "product_sku": product_sku,
            "forecast_days": forecast_days,
            "chart_data": chart_data,
            "accuracy": accuracy_score,
            "timestamp": datetime.utcnow().isoformat()
        }

    except Exception as exc:
        logger.error(f"Error predicting for {product_sku}: {exc}", exc_info=True)
        raise self.retry(exc=exc, countdown=min(2 ** self.request.retries, 600))


@celery_app.task
def train_all_models():
    """
    Scheduled task to train all product models.
    Typically run nightly.
    """
    try:
        logger.info("Starting nightly training for all products")
        products = ProductModel.get_all_products()
        results = {}

        for product in products:
            try:
                result = train_product_model_task(product['sku'])
                results[product['sku']] = result
                logger.info(f"Training result for {product['sku']}: {result['status']}")
            except Exception as e:
                logger.error(f"Error training {product['sku']}: {e}")
                results[product['sku']] = {
                    'status': 'error',
                    'reason': str(e),
                    'timestamp': datetime.utcnow().isoformat()
                }

        logger.info(f"Nightly training completed. Processed {len(results)} products")
        
        return {
            "status": "completed",
            "total_products": len(results),
            "results": results,
            "timestamp": datetime.utcnow().isoformat()
        }

    except Exception as e:
        logger.error(f"Error in nightly training: {e}", exc_info=True)
        return {
            "status": "error",
            "reason": str(e),
            "timestamp": datetime.utcnow().isoformat()
        }
