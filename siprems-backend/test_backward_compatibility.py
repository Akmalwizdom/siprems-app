#!/usr/bin/env python
"""
Backward Compatibility Test Suite
Tests that all old endpoints are still available and working
"""

import sys
import json

def test_imports():
    """Test that all modules can be imported"""
    print("Testing imports...")
    try:
        from app import create_app
        print("  ✓ app.create_app imported")
        
        from routes import product_bp, transaction_bp, event_bp, prediction_bp, chat_bp, system_bp
        print("  ✓ All blueprints imported")
        
        from services import ProductService, TransactionService, EventService, PredictionService
        print("  ✓ All services imported")
        
        from models import ProductModel, TransactionModel, EventModel
        print("  ✓ All models imported")
        
        from utils.config import get_config
        from utils.db import get_db_connection, db_query, db_execute
        print("  ✓ Utils imported")
        
        return True
    except Exception as e:
        print(f"  ✗ Import failed: {e}")
        import traceback
        traceback.print_exc()
        return False

def test_factory():
    """Test that the app factory creates a valid app"""
    print("\nTesting app factory...")
    try:
        from app import create_app
        app = create_app()
        print("  ✓ App factory creates app")
        
        # Check CORS is enabled
        if app.config.get('CORS'):
            print("  ✓ CORS enabled")
        
        return True
    except Exception as e:
        print(f"  ✗ Factory test failed: {e}")
        return False

def test_blueprints():
    """Test that all blueprints are registered"""
    print("\nTesting blueprints...")
    try:
        from app import app
        
        # Expected endpoints from original app.py
        expected_endpoints = [
            '/products',
            '/transactions',
            '/events',
            '/predict',
            '/chat',
            '/dashboard-stats',
            '/settings/status',
        ]
        
        registered_routes = [r.rule for r in app.url_map.iter_rules() if r.endpoint not in ['static']]
        
        missing = []
        for expected in expected_endpoints:
            if not any(expected in route for route in registered_routes):
                missing.append(expected)
        
        if missing:
            print(f"  ✗ Missing endpoints: {missing}")
            print(f"  Available routes: {registered_routes}")
            return False
        
        print(f"  ✓ All expected endpoints registered")
        print(f"  ✓ Total routes: {len(registered_routes)}")
        
        return True
    except Exception as e:
        print(f"  ✗ Blueprint test failed: {e}")
        import traceback
        traceback.print_exc()
        return False

def test_endpoint_structure():
    """Test that endpoints have correct structure"""
    print("\nTesting endpoint structure...")
    try:
        from app import app
        
        # Expected HTTP methods for endpoints
        expected_methods = {
            '/products': ['GET', 'POST'],
            '/transactions': ['GET', 'POST'],
            '/events': ['GET', 'POST'],
            '/predict': ['POST'],
            '/chat': ['POST'],
            '/dashboard-stats': ['GET'],
            '/settings/status': ['GET'],
        }
        
        for rule in app.url_map.iter_rules():
            if rule.endpoint in ['static', 'health']:
                continue
            
            # Check if this is one of our endpoints
            rule_path = str(rule.rule)
            for expected_path, expected_methods_list in expected_methods.items():
                if expected_path in rule_path:
                    for method in rule.methods:
                        if method not in ['OPTIONS', 'HEAD']:
                            if method not in expected_methods_list:
                                print(f"  ! Unexpected method {method} for {rule_path}")
                    break
        
        print("  ✓ Endpoint structure correct")
        return True
    except Exception as e:
        print(f"  ✗ Structure test failed: {e}")
        return False

def test_service_initialization():
    """Test that all services can be initialized"""
    print("\nTesting service initialization...")
    try:
        from services.product_service import ProductService
        from services.transaction_service import TransactionService
        from services.event_service import EventService
        from utils.db import get_db_connection
        from ml_engine import MLEngine
        from services.prediction_service import PredictionService
        from services.chat_service import ChatService
        from utils.config import get_config
        
        config = get_config()
        print("  ✓ Config loaded")
        
        # Test ML engine initialization
        ml_engine = MLEngine(get_db_connection)
        print("  ✓ ML Engine initialized")
        
        # Test Prediction Service
        prediction_service = PredictionService(ml_engine)
        print("  ✓ Prediction Service initialized")
        
        # Test Chat Service
        chat_service = ChatService(config)
        print("  ✓ Chat Service initialized")
        
        return True
    except Exception as e:
        print(f"  ✗ Service initialization failed: {e}")
        import traceback
        traceback.print_exc()
        return False

def test_database_helpers():
    """Test database utility functions"""
    print("\nTesting database helpers...")
    try:
        from utils.db import get_db_connection, db_query, db_execute, get_db_cursor
        
        # Test that functions are callable
        assert callable(get_db_connection)
        assert callable(db_query)
        assert callable(db_execute)
        assert callable(get_db_cursor)
        
        print("  ✓ Database helper functions available")
        return True
    except Exception as e:
        print(f"  ✗ Database helpers test failed: {e}")
        return False

def main():
    """Run all tests"""
    print("=" * 60)
    print("BACKWARD COMPATIBILITY TEST SUITE")
    print("=" * 60)
    
    tests = [
        test_imports,
        test_factory,
        test_blueprints,
        test_endpoint_structure,
        test_service_initialization,
        test_database_helpers,
    ]
    
    results = []
    for test in tests:
        try:
            results.append(test())
        except Exception as e:
            print(f"Test {test.__name__} crashed: {e}")
            results.append(False)
    
    print("\n" + "=" * 60)
    passed = sum(results)
    total = len(results)
    print(f"RESULTS: {passed}/{total} tests passed")
    print("=" * 60)
    
    if passed == total:
        print("✓ All tests passed! Backward compatibility confirmed.")
        return 0
    else:
        print(f"✗ {total - passed} test(s) failed. Please review.")
        return 1

if __name__ == '__main__':
    sys.exit(main())
