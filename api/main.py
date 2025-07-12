"""FastAPI backend for Reseller Monitoring System."""
from __future__ import annotations

import os
from datetime import datetime, timedelta
from typing import List, Optional

from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import sys
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from src.supabase_client import get_client
from fastapi.responses import FileResponse
import random
import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from src.config import load_config
from src.aggregator import Aggregator
from src.ping_monitor import PingMonitor
from apscheduler.schedulers.background import BackgroundScheduler

from src.pdf_generator import PDFReportGenerator

app = FastAPI(title="Reseller Monitor API", version="1.0.0")

# --- Scheduler setup ---
def start_scheduler():
    """Start background tasks for aggregation and ping monitoring."""
    cfg = load_config()
    
    # Initialize services
    aggregator = Aggregator(cfg)
    ping_monitor = PingMonitor(cfg)
    
    # Create scheduler
    scheduler = BackgroundScheduler()
    
    # Add jobs
    scheduler.add_job(aggregator.run_cycle, "interval", minutes=5, id="aggregator_cycle")
    scheduler.add_job(ping_monitor.run_forever, "interval", seconds=10, id="ping_monitor_cycle")
    
    # Start scheduler
    scheduler.start()
    print("Scheduler started with aggregation and ping monitoring jobs.")

@app.on_event("startup")
async def startup_event():
    """Run scheduler on application startup."""
    print("Application startup: Starting background scheduler...")
    start_scheduler()

# Enable CORS for frontend
allowed_origins = [
    "http://localhost:3000",
    "https://*.vercel.app",
    "https://vercel.app",
]

# Add environment-specific origins
frontend_url = os.getenv("FRONTEND_URL")
if frontend_url:
    allowed_origins.append(frontend_url)

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Pydantic models
class Reseller(BaseModel):
    id: str
    name: str
    plan_mbps: int
    threshold: float
    phone: Optional[str] = None

class UsagePoint(BaseModel):
    ts: datetime
    reseller_id: str
    rx_mbps: float
    tx_mbps: float

class Alert(BaseModel):
    id: str
    reseller_id: Optional[str]
    level: str
    message: str
    sent_at: datetime

class LinkState(BaseModel):
    reseller_id: str
    state: str
    since: datetime

# Add these models after the existing ones
class CreateResellerRequest(BaseModel):
    name: str
    plan_mbps: int
    threshold: float = 0.8
    phone: str

class UpdateResellerRequest(BaseModel):
    name: Optional[str] = None
    plan_mbps: Optional[int] = None
    threshold: Optional[float] = None
    phone: Optional[str] = None

# Mock data for development
MOCK_RESELLERS = [
    {"id": "r1", "name": "SpeedServe", "plan_mbps": 500, "threshold": 0.8, "phone": "+8801000000001"},
    {"id": "r2", "name": "OptiLine", "plan_mbps": 100, "threshold": 0.8, "phone": "+8801000000002"},
    {"id": "r3", "name": "LowCostISP", "plan_mbps": 50, "threshold": 0.8, "phone": "+8801000000003"},
    {"id": "r4", "name": "DownTownNet", "plan_mbps": 200, "threshold": 0.8, "phone": "+8801000000004"},
]

# Mock alerts for development
MOCK_ALERTS = [
    {
        "id": "alert_1",
        "reseller_id": "r1",
        "level": "YELLOW",
        "message": "Bandwidth usage exceeded 80% threshold (420/500 Mbps)",
        "sent_at": datetime.now() - timedelta(hours=1)
    },
    {
        "id": "alert_2",
        "reseller_id": "r2",
        "level": "RED",
        "message": "Bandwidth usage exceeded 100% threshold (105/100 Mbps)",
        "sent_at": datetime.now() - timedelta(hours=2)
    },
    {
        "id": "alert_3",
        "reseller_id": "r4",
        "level": "LINK_DOWN",
        "message": "Connection lost to reseller equipment",
        "sent_at": datetime.now() - timedelta(hours=3)
    },
    {
        "id": "alert_4",
        "reseller_id": "r3",
        "level": "YELLOW",
        "message": "Bandwidth usage exceeded 80% threshold (42/50 Mbps)",
        "sent_at": datetime.now() - timedelta(hours=4)
    },
    {
        "id": "alert_5",
        "reseller_id": "r1",
        "level": "RED",
        "message": "Bandwidth usage exceeded 100% threshold (520/500 Mbps)",
        "sent_at": datetime.now() - timedelta(hours=6)
    },
    {
        "id": "alert_6",
        "reseller_id": "r2",
        "level": "YELLOW",
        "message": "Bandwidth usage exceeded 80% threshold (85/100 Mbps)",
        "sent_at": datetime.now() - timedelta(hours=8)
    },
    {
        "id": "alert_7",
        "reseller_id": "r4",
        "level": "YELLOW",
        "message": "Bandwidth usage exceeded 80% threshold (165/200 Mbps)",
        "sent_at": datetime.now() - timedelta(hours=12)
    },
    {
        "id": "alert_8",
        "reseller_id": "r3",
        "level": "RED",
        "message": "Bandwidth usage exceeded 100% threshold (52/50 Mbps)",
        "sent_at": datetime.now() - timedelta(hours=18)
    }
]

@app.get("/")
async def root():
    return {"message": "Reseller Monitor API", "version": "1.0.0"}

@app.get("/health")
async def health_check():
    """Health check endpoint for Railway and other monitoring services."""
    return {"status": "healthy", "timestamp": datetime.now().isoformat()}

@app.get("/resellers", response_model=List[Reseller])
async def get_resellers():
    """Get all resellers from database."""
    try:
        client = get_client()
        result = client.table("resellers").select("*").execute()
        return result.data
    except Exception as e:
        print(f"Database error, falling back to mock data: {e}")
        return MOCK_RESELLERS

@app.get("/resellers/{reseller_id}", response_model=Reseller)
async def get_reseller(reseller_id: str):
    """Get specific reseller from database."""
    try:
        client = get_client()
        result = client.table("resellers").select("*").eq("id", reseller_id).execute()
        if not result.data:
            raise HTTPException(status_code=404, detail="Reseller not found")
        return result.data[0]
    except Exception as e:
        print(f"Database error, falling back to mock data: {e}")
        reseller = next((r for r in MOCK_RESELLERS if r["id"] == reseller_id), None)
        if not reseller:
            raise HTTPException(status_code=404, detail="Reseller not found")
        return reseller

@app.post("/resellers", response_model=Reseller)
async def create_reseller(request: CreateResellerRequest):
    """Create a new reseller in database."""
    try:
        client = get_client()
        
        # Generate a new ID based on existing resellers
        existing_result = client.table("resellers").select("id").execute()
        existing_ids = [r["id"] for r in existing_result.data]
        
        # Find the next available ID
        counter = 1
        while f"r{counter}" in existing_ids:
            counter += 1
        reseller_id = f"r{counter}"
        
        new_reseller = {
            "id": reseller_id,
            "name": request.name,
            "plan_mbps": request.plan_mbps,
            "threshold": request.threshold,
            "phone": request.phone
        }
        
        # Insert into database
        result = client.table("resellers").insert(new_reseller).execute()
        return result.data[0]
        
    except Exception as e:
        print(f"Database error: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to create reseller: {str(e)}")

@app.put("/resellers/{reseller_id}", response_model=Reseller)
async def update_reseller(reseller_id: str, request: UpdateResellerRequest):
    """Update an existing reseller in database."""
    try:
        client = get_client()
        
        # Check if reseller exists
        existing = client.table("resellers").select("*").eq("id", reseller_id).execute()
        if not existing.data:
            raise HTTPException(status_code=404, detail="Reseller not found")
        
        # Build update data
        update_data = {}
        if request.name is not None:
            update_data["name"] = request.name
        if request.plan_mbps is not None:
            update_data["plan_mbps"] = request.plan_mbps
        if request.threshold is not None:
            update_data["threshold"] = request.threshold
        if request.phone is not None:
            update_data["phone"] = request.phone
        
        # Update in database
        result = client.table("resellers").update(update_data).eq("id", reseller_id).execute()
        return result.data[0]
        
    except Exception as e:
        print(f"Database error: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to update reseller: {str(e)}")

@app.delete("/resellers/{reseller_id}")
async def delete_reseller(reseller_id: str):
    """Delete a reseller from database."""
    try:
        client = get_client()
        
        # Check if reseller exists
        existing = client.table("resellers").select("*").eq("id", reseller_id).execute()
        if not existing.data:
            raise HTTPException(status_code=404, detail="Reseller not found")
        
        # Delete from database
        client.table("resellers").delete().eq("id", reseller_id).execute()
        return {"message": f"Reseller {reseller_id} deleted successfully"}
        
    except Exception as e:
        print(f"Database error: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to delete reseller: {str(e)}")

@app.get("/resellers/{reseller_id}/usage", response_model=List[UsagePoint])
async def get_reseller_usage(reseller_id: str, hours: int = 24):
    """Get usage data for a reseller over the last N hours."""
    try:
        client = get_client()
        since = datetime.now() - timedelta(hours=hours)
        
        response = client.table("usage_5m").select("*").eq("reseller_id", reseller_id).gte("ts", since.isoformat()).order("ts").execute()
        
        if not response.data:
            # Return mock data if no real data
            return _generate_mock_usage(reseller_id, hours)
            
        return response.data
    except Exception as e:
        # Fallback to mock data
        return _generate_mock_usage(reseller_id, hours)

@app.get("/alerts", response_model=List[Alert])
async def get_alerts(limit: int = 50):
    """Get recent alerts."""
    try:
        client = get_client()
        response = client.table("alerts").select("*").order("sent_at", desc=True).limit(limit).execute()
        if response.data:
            return response.data
    except Exception as e:
        print(f"Database error: {e}")
    
    # Return mock alerts if database fails
    return sorted(MOCK_ALERTS, key=lambda x: x["sent_at"], reverse=True)[:limit]

@app.get("/resellers/{reseller_id}/alerts", response_model=List[Alert])
async def get_reseller_alerts(reseller_id: str, limit: int = 20):
    """Get alerts for a specific reseller."""
    try:
        client = get_client()
        response = client.table("alerts").select("*").eq("reseller_id", reseller_id).order("sent_at", desc=True).limit(limit).execute()
        if response.data:
            return response.data
    except Exception as e:
        print(f"Database error: {e}")
    
    # Return mock alerts for this reseller if database fails
    reseller_alerts = [alert for alert in MOCK_ALERTS if alert["reseller_id"] == reseller_id]
    return sorted(reseller_alerts, key=lambda x: x["sent_at"], reverse=True)[:limit]

@app.get("/link-state", response_model=List[LinkState])
async def get_link_states():
    """Get current link states for all resellers."""
    try:
        client = get_client()
        response = client.table("link_state").select("*").execute()
        if response.data:
            return response.data
    except Exception as e:
        print(f"Database error: {e}")
    
    # Return mock link states if database fails
    return [
        {"reseller_id": "r1", "state": "UP", "since": datetime.now().isoformat()},
        {"reseller_id": "r2", "state": "UP", "since": datetime.now().isoformat()},
        {"reseller_id": "r3", "state": "IDLE", "since": datetime.now().isoformat()},
        {"reseller_id": "r4", "state": "DOWN", "since": datetime.now().isoformat()},
    ]

@app.get("/resellers/{reseller_id}/report")
async def generate_reseller_report(reseller_id: str, month: str = None):
    """Generate PDF report for a specific reseller."""
    try:
        print(f"DEBUG: Generating report for reseller_id: {reseller_id}")
        
        # Get reseller data from database
        try:
            client = get_client()
            result = client.table("resellers").select("*").eq("id", reseller_id).execute()
            if not result.data:
                print(f"DEBUG: Reseller {reseller_id} not found in database")
                raise HTTPException(status_code=404, detail="Reseller not found")
            reseller = result.data[0]
        except Exception as db_error:
            print(f"DEBUG: Database error, falling back to mock data: {db_error}")
            # Fallback to mock data
            reseller = None
            for r in MOCK_RESELLERS:
                if r["id"] == reseller_id:
                    reseller = r
                    break
            if not reseller:
                print(f"DEBUG: Reseller {reseller_id} not found in mock data either")
                raise HTTPException(status_code=404, detail="Reseller not found")
        
        print(f"DEBUG: Found reseller: {reseller}")
        
        # Get usage data for the month
        if month is None:
            month = datetime.now().strftime("%Y-%m")
        
        print(f"DEBUG: Generating report for month: {month}")
        
        # For demo, generate some sample usage data
        usage_data = []
        alerts_data = []
        
        # Generate sample usage data for the month
        start_date = datetime.strptime(f"{month}-01", "%Y-%m-%d")
        for i in range(30):  # 30 days of data
            for hour in range(0, 24, 4):  # Every 4 hours
                timestamp = start_date + timedelta(days=i, hours=hour)
                # Generate realistic usage data
                base_usage = reseller["plan_mbps"] * 0.6  # 60% base usage
                variation = reseller["plan_mbps"] * 0.3 * (0.5 - random.random())  # ±30% variation
                rx_mbps = max(0, base_usage + variation)
                tx_mbps = max(0, rx_mbps * 0.2)  # Upload is typically 20% of download
                
                usage_data.append({
                    'ts': timestamp.isoformat() + 'Z',
                    'rx_mbps': rx_mbps,
                    'tx_mbps': tx_mbps
                })
        
        print(f"DEBUG: Generated {len(usage_data)} usage data points")
        
        # Generate sample alerts
        if len(usage_data) > 0:
            # Add some threshold alerts
            high_usage_points = [u for u in usage_data if (u['rx_mbps'] + u['tx_mbps']) > reseller["plan_mbps"] * 0.8]
            for i, point in enumerate(high_usage_points[:5]):  # Max 5 alerts
                level = 'RED' if (point['rx_mbps'] + point['tx_mbps']) > reseller["plan_mbps"] else 'YELLOW'
                alerts_data.append({
                    'level': level,
                    'message': f"Usage exceeded {'100%' if level == 'RED' else '80%'} threshold",
                    'sent_at': point['ts']
                })
        
        print(f"DEBUG: Generated {len(alerts_data)} alerts")
        
        # Generate PDF report
        print("DEBUG: Creating PDF generator...")
        pdf_generator = PDFReportGenerator()
        
        print(f"DEBUG: Calling generate_monthly_report with: reseller_id={reseller_id}, name={reseller['name']}, plan_mbps={reseller['plan_mbps']}")
        report_path = pdf_generator.generate_monthly_report(
            reseller_id,
            reseller["name"],
            reseller["plan_mbps"],
            usage_data,
            alerts_data,
            month
        )
        
        print(f"DEBUG: PDF generated at: {report_path}")
        
        # Return the PDF file
        return FileResponse(
            path=report_path,
            filename=f"{reseller['name']}_report_{month}.pdf",
            media_type="application/pdf"
        )
        
    except Exception as e:
        print(f"DEBUG: Exception occurred: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Failed to generate report: {str(e)}")

@app.get("/reports/generate-all")
async def generate_all_reports(month: str = None):
    """Generate PDF reports for all resellers."""
    try:
        if month is None:
            month = datetime.now().strftime("%Y-%m")
        
        pdf_generator = PDFReportGenerator()
        generated_files = []
        
        for reseller in MOCK_RESELLERS:
            try:
                # Generate sample data for each reseller (same logic as above)
                usage_data = []
                alerts_data = []
                
                start_date = datetime.strptime(f"{month}-01", "%Y-%m-%d")
                for i in range(30):
                    for hour in range(0, 24, 4):
                        timestamp = start_date + timedelta(days=i, hours=hour)
                        base_usage = reseller["plan_mbps"] * 0.6
                        variation = reseller["plan_mbps"] * 0.3 * (0.5 - random.random())
                        rx_mbps = max(0, base_usage + variation)
                        tx_mbps = max(0, rx_mbps * 0.2)
                        
                        usage_data.append({
                            'ts': timestamp.isoformat() + 'Z',
                            'rx_mbps': rx_mbps,
                            'tx_mbps': tx_mbps
                        })
                
                # Generate alerts
                high_usage_points = [u for u in usage_data if (u['rx_mbps'] + u['tx_mbps']) > reseller["plan_mbps"] * 0.8]
                for point in high_usage_points[:3]:
                    level = 'RED' if (point['rx_mbps'] + point['tx_mbps']) > reseller["plan_mbps"] else 'YELLOW'
                    alerts_data.append({
                        'level': level,
                        'message': f"Usage exceeded {'100%' if level == 'RED' else '80%'} threshold",
                        'sent_at': point['ts']
                    })
                
                report_path = pdf_generator.generate_monthly_report(
                    reseller["id"],
                    reseller["name"],
                    reseller["plan_mbps"],
                    usage_data,
                    alerts_data,
                    month
                )
                
                generated_files.append({
                    'reseller_id': reseller["id"],
                    'reseller_name': reseller["name"],
                    'report_path': report_path,
                    'month': month
                })
                
            except Exception as e:
                print(f"Failed to generate report for {reseller['name']}: {e}")
        
        return {
            'message': f'Generated {len(generated_files)} reports for {month}',
            'reports': generated_files
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate reports: {str(e)}")

@app.get("/test-pdf")
async def test_pdf():
    """Test PDF generation endpoint."""
    try:
        from src.pdf_generator import PDFReportGenerator
        
        # Test data
        reseller_id = "r1"
        reseller_name = "SpeedServe"
        plan_mbps = 500
        month = "2024-01"
        
        usage_data = [{
            'ts': '2024-01-01T00:00:00Z',
            'rx_mbps': 300.0,
            'tx_mbps': 60.0
        }]
        
        alerts_data = [{
            'level': 'YELLOW',
            'message': 'Test alert',
            'sent_at': '2024-01-01T00:00:00Z'
        }]
        
        pdf_generator = PDFReportGenerator()
        report_path = pdf_generator.generate_monthly_report(
            reseller_id,
            reseller_name,
            plan_mbps,
            usage_data,
            alerts_data,
            month
        )
        
        return {"success": True, "report_path": str(report_path)}
        
    except Exception as e:
        import traceback
        return {
            "success": False,
            "error": str(e),
            "traceback": traceback.format_exc()
        }

def _generate_mock_usage(reseller_id: str, hours: int) -> List[dict]:
    """Generate mock usage data for development."""
    import random
    
    usage_points = []
    base_rx = {"r1": 300, "r2": 60, "r3": 30, "r4": 120}.get(reseller_id, 50)
    base_tx = base_rx * 0.4
    
    for i in range(hours * 12):  # 5-minute intervals
        ts = datetime.now() - timedelta(minutes=i * 5)
        rx_mbps = base_rx + random.uniform(-20, 40)
        tx_mbps = base_tx + random.uniform(-10, 20)
        
        usage_points.append({
            "ts": ts.isoformat(),
            "reseller_id": reseller_id,
            "rx_mbps": max(0, rx_mbps),
            "tx_mbps": max(0, tx_mbps)
        })
    
    return list(reversed(usage_points))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000) 