#!/usr/bin/env python3
"""Debug script to test PDF generation."""

import sys
import os
sys.path.append('src')

from pdf_generator import PDFReportGenerator
from datetime import datetime, timedelta

def test_pdf_generation():
    """Test PDF generation with sample data."""
    try:
        # Sample data
        reseller_id = "r1"
        reseller_name = "SpeedServe"
        plan_mbps = 500
        month = "2024-01"
        
        # Generate sample usage data
        usage_data = []
        start_date = datetime.strptime(f"{month}-01", "%Y-%m-%d")
        for i in range(5):  # Just 5 days for testing
            timestamp = start_date + timedelta(days=i)
            usage_data.append({
                'ts': timestamp.isoformat() + 'Z',
                'rx_mbps': 300.0,
                'tx_mbps': 60.0
            })
        
        # Generate sample alerts
        alerts_data = [
            {
                'level': 'YELLOW',
                'message': 'Usage exceeded 80% threshold',
                'sent_at': start_date.isoformat() + 'Z'
            }
        ]
        
        print("Testing PDF generation...")
        pdf_generator = PDFReportGenerator()
        report_path = pdf_generator.generate_monthly_report(
            reseller_id,
            reseller_name,
            plan_mbps,
            usage_data,
            alerts_data,
            month
        )
        
        print(f"✓ PDF generated successfully: {report_path}")
        return True
        
    except Exception as e:
        print(f"✗ PDF generation failed: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    success = test_pdf_generation()
    sys.exit(0 if success else 1) 