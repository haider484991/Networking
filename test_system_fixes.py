#!/usr/bin/env python3
"""Test script to validate all system fixes."""

import logging
import sys
from pathlib import Path

# Add src to path
sys.path.insert(0, str(Path(__file__).parent / "src"))

from src.supabase_client import get_client, insert_row
from src.mikrotik_client import RouterManager, MikroTikRouterClient
from src.config import load_config

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def test_database_connection():
    """Test Supabase database connection."""
    try:
        client = get_client()
        result = client.table("resellers").select("*").limit(1).execute()
        logger.info("✅ Database connection successful")
        return True
    except Exception as e:
        logger.error("❌ Database connection failed: %s", e)
        return False

def test_insert_row_function():
    """Test the fixed insert_row function."""
    try:
        test_alert = {
            "reseller_id": "test",
            "level": "WARNING", 
            "message": "Test alert for validation",
            "sent_at": "2024-01-01T00:00:00"
        }
        insert_row("alerts", test_alert)
        logger.info("✅ insert_row function working")
        
        # Clean up test data
        client = get_client()
        client.table("alerts").delete().eq("reseller_id", "test").execute()
        return True
    except Exception as e:
        logger.error("❌ insert_row function failed: %s", e)
        return False

def test_router_manager():
    """Test RouterManager initialization."""
    try:
        router_manager = RouterManager()
        logger.info("✅ RouterManager initialization successful")
        logger.info("Loaded routers: %s", list(router_manager.routers.keys()))
        return True
    except Exception as e:
        logger.error("❌ RouterManager initialization failed: %s", e)
        return False

def test_mikrotik_connection():
    """Test MikroTik router connection."""
    try:
        client = get_client()
        result = client.table("router_configs").select("*").eq("enabled", True).execute()
        
        if not result.data:
            logger.warning("⚠️ No router configs found")
            return False
            
        for router_config in result.data:
            router_client = MikroTikRouterClient(
                host=router_config['host'],
                username=router_config['username'],
                password=router_config['password'],
                port=router_config.get('port', 8728),
                use_ssl=router_config.get('use_ssl', False)
            )
            
            if router_client.connect():
                logger.info("✅ MikroTik connection successful to %s", router_config['host'])
                
                # Test basic command
                queues = router_client.get_simple_queues()
                logger.info("Found %d existing queues", len(queues))
                
                router_client.disconnect()
                return True
            else:
                logger.error("❌ MikroTik connection failed to %s", router_config['host'])
                return False
                
    except Exception as e:
        logger.error("❌ MikroTik connection test failed: %s", e)
        return False

def main():
    """Run all tests."""
    logger.info("Starting system validation tests...")
    
    tests = [
        ("Database Connection", test_database_connection),
        ("Insert Row Function", test_insert_row_function),
        ("RouterManager", test_router_manager),
        ("MikroTik Connection", test_mikrotik_connection),
    ]
    
    results = []
    for test_name, test_func in tests:
        logger.info(f"\n--- Running {test_name} Test ---")
        try:
            result = test_func()
            results.append((test_name, result))
        except Exception as e:
            logger.error("Test %s crashed: %s", test_name, e)
            results.append((test_name, False))
    
    logger.info("\n=== TEST RESULTS ===")
    passed = 0
    for test_name, result in results:
        status = "✅ PASS" if result else "❌ FAIL"
        logger.info("%s: %s", test_name, status)
        if result:
            passed += 1
    
    logger.info(f"\nPassed: {passed}/{len(results)} tests")
    
    if passed == len(results):
        logger.info("🎉 All systems operational!")
        return 0
    else:
        logger.error("❌ Some tests failed - check configuration")
        return 1

if __name__ == "__main__":
    sys.exit(main()) 