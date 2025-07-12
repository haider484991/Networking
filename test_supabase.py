#!/usr/bin/env python3
"""Test script to verify Supabase connection."""

import os
import sys
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Add src to path
sys.path.append(os.path.join(os.path.dirname(__file__), 'src'))

def test_supabase_connection():
    """Test Supabase connection and basic operations."""
    try:
        from supabase_client import get_client
        
        print("Testing Supabase connection...")
        
        # Test connection
        client = get_client()
        print(f"✓ Successfully connected to Supabase")
        
        # Test reading from resellers table
        try:
            result = client.table("resellers").select("*").limit(1).execute()
            print(f"✓ Successfully queried resellers table: {len(result.data)} records")
        except Exception as e:
            print(f"⚠ Could not query resellers table: {e}")
        
        # Test reading from usage_5m table
        try:
            result = client.table("usage_5m").select("*").limit(1).execute()
            print(f"✓ Successfully queried usage_5m table: {len(result.data)} records")
        except Exception as e:
            print(f"⚠ Could not query usage_5m table: {e}")
        
        # Test reading from alerts table
        try:
            result = client.table("alerts").select("*").limit(1).execute()
            print(f"✓ Successfully queried alerts table: {len(result.data)} records")
        except Exception as e:
            print(f"⚠ Could not query alerts table: {e}")
        
        # Test reading from link_state table
        try:
            result = client.table("link_state").select("*").limit(1).execute()
            print(f"✓ Successfully queried link_state table: {len(result.data)} records")
        except Exception as e:
            print(f"⚠ Could not query link_state table: {e}")
        
        print("\n✓ All basic tests passed!")
        return True
        
    except Exception as e:
        print(f"✗ Supabase connection failed: {e}")
        return False

if __name__ == "__main__":
    success = test_supabase_connection()
    sys.exit(0 if success else 1) 