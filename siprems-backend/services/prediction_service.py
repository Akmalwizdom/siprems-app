import pandas as pd
import os
import json
from models.product_model import ProductModel
from models.transaction_model import TransactionModel

class PredictionService:
    """Business logic layer for prediction operations"""
    
    def __init__(self, ml_engine):
        """Initialize with ML engine instance"""
        self.ml_engine = ml_engine
    
    def predict_stock(self, data):
        """
        Predict stock levels for a product.
        
        Args:
            data: dict with 'product_sku' and optional 'days'
        
        Returns:
            dict with chartData, recommendations, and accuracy
        """
        # Validation
        if 'product_sku' not in data:
            raise ValueError("Product SKU is required")
        
        product_sku = data['product_sku']
        forecast_days = int(data.get('days', 7))
        
        # Validate product exists
        product_info = ProductModel.get_product_by_sku(product_sku)
        if not product_info:
            raise ValueError(f"Product with SKU {product_sku} not found")
        
        # Run prediction using ML Engine
        forecast = self.ml_engine.predict(product_sku, days=forecast_days)
        
        # Ensure ds column is datetime
        forecast['ds'] = pd.to_datetime(forecast['ds'])
        
        # Get actual historical data
        actual_df = self.ml_engine.get_sales_data(product_sku)
        if not actual_df.empty:
            actual_df['ds'] = pd.to_datetime(actual_df['ds'])
        
        # Determine earliest date for chart
        if not actual_df.empty:
            earliest_actual = actual_df['ds'].min()
        else:
            earliest_actual = forecast['ds'].min() - pd.Timedelta(days=30)
        
        # Build chart data
        chart_df = forecast[forecast['ds'] >= earliest_actual].copy()
        
        # Create mapping of actual values by date
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
        
        if not chart_data:
            raise ValueError("No forecast data could be generated")
        
        # Generate restock recommendations
        future_forecast = forecast.tail(forecast_days)
        total_predicted_sales = future_forecast['yhat_corrected'].sum()
        
        # Calculate buffer based on forecast window
        buffer_percent = 1.2 if forecast_days <= 7 else 1.1
        optimal_stock = int(round(total_predicted_sales * buffer_percent))
        current_stock = int(product_info['stock'])
        
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
            'optimal': optimal_stock,
            'trend': trend,
            'suggestion': suggestion,
            'urgency': urgency
        }]
        
        # Get model accuracy from metadata
        accuracy_score = self._get_model_accuracy(product_sku)
        
        return {
            'chartData': chart_data,
            'recommendations': recommendations,
            'accuracy': round(accuracy_score, 1)
        }
    
    @staticmethod
    def _get_model_accuracy(product_sku):
        """Get model accuracy from metadata file"""
        accuracy_score = 0.0
        meta_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "models", "meta")
        meta_path = os.path.join(meta_dir, f"meta_{product_sku}.json")
        
        if os.path.exists(meta_path):
            try:
                with open(meta_path, 'r') as f:
                    meta = json.load(f)
                    accuracy_score = meta.get('accuracy_score', 0.0)
            except Exception as e:
                print(f"Warning: Could not load metadata for {product_sku}: {e}")
        
        return accuracy_score
    
    def train_all_models(self):
        """Train models for all products (batch operation)"""
        products = ProductModel.get_all_products()
        results = {}
        
        for product in products:
            try:
                result = self.ml_engine.train_product_model(product['sku'])
                results[product['sku']] = result
            except Exception as e:
                results[product['sku']] = {'status': 'error', 'reason': str(e)}
        
        return results
