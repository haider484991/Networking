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
from src.nttn_monitor import NTTNMonitor
from src.bandwidth_manager import BandwidthManager
from apscheduler.schedulers.background import BackgroundScheduler

from src.pdf_generator import PDFReportGenerator
from src.mikrotik_client import RouterManager

app = FastAPI(title="Reseller Monitor API", version="1.0.0")

# --- Scheduler setup ---
def start_scheduler():
    """Start background tasks for aggregation, ping monitoring, NTTN monitoring, and bandwidth management."""
    cfg = load_config()
    
    # Initialize services
    aggregator = Aggregator(cfg)
    ping_monitor = PingMonitor(cfg)
    nttn_monitor = NTTNMonitor(cfg)
    bandwidth_manager = BandwidthManager(cfg)
    
    # Create scheduler
    scheduler = BackgroundScheduler()
    
    # Add jobs
    scheduler.add_job(aggregator.run_cycle, "interval", minutes=5, id="aggregator_cycle")
    scheduler.add_job(ping_monitor.run_forever, "interval", seconds=10, id="ping_monitor_cycle")
    scheduler.add_job(nttn_monitor.run_monitoring_cycle, "interval", minutes=5, id="nttn_monitor_cycle")
    scheduler.add_job(bandwidth_manager.run_monitoring_cycle, "interval", minutes=1, id="bandwidth_manager_cycle")
    
    # Start scheduler
    scheduler.start()
    print("Scheduler started with aggregation, ping monitoring, NTTN monitoring, and bandwidth management jobs.")

# Start the scheduler when the app starts
start_scheduler()

# Health check endpoint
@app.get("/health")
async def health_check():
    """Health check endpoint for deployment monitoring."""
    return {"status": "healthy", "timestamp": datetime.now().isoformat()}

# Enable CORS for frontend
# CORS origins – include localhost, Vercel preview URLs, and allow all as fallback
allowed_origins = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "https://*.vercel.app",
    "https://vercel.app",
]

# Add dashboard URL if set via env
frontend_url = os.getenv("FRONTEND_URL")
if frontend_url:
    allowed_origins.append(frontend_url)

# In self-hosted deployments we may not know the exact hostname ahead of time;
# fallback to allow all origins so the dashboard can communicate.
allowed_origins.append("*")

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
    since: str

# Add these models after the existing ones
class CreateResellerRequest(BaseModel):
    name: str
    plan_mbps: int
    threshold: float = 0.8
    phone: str
    router_id: str
    target_ip: str

class UpdateResellerRequest(BaseModel):
    name: Optional[str] = None
    plan_mbps: Optional[int] = None
    threshold: Optional[float] = None
    phone: Optional[str] = None

# New models for router and NTTN functionality
class RouterConfig(BaseModel):
    id: str
    name: str
    host: str
    device_type: str
    enabled: bool
    port: Optional[int] = 8728
    use_ssl: Optional[bool] = False

class RouterStatus(BaseModel):
    router_id: str
    host: str
    connected: bool
    active_queues: int
    total_resellers: int
    last_check: Optional[str]
    error: Optional[str] = None

class BandwidthUpdateRequest(BaseModel):
    reseller_id: str
    target_ip: str
    plan_mbps: int
    router_id: str = "mikrotik_main"

class NTTNLinkStatus(BaseModel):
    link_id: str
    name: str
    device_ip: str
    total_capacity_mbps: int
    threshold_mbps: int
    current_usage_mbps: float
    utilization_percent: float
    last_updated: Optional[str]
    status: str  # OK, WARNING, CRITICAL

class NTTNAlert(BaseModel):
    id: int
    nttn_link_id: str
    alert_level: str
    message: str
    total_mbps: float
    threshold_mbps: float
    sent_at: datetime
    whatsapp_sent: bool

# Mock data for development - REMOVED - Using database only
# MOCK_RESELLERS and MOCK_ALERTS removed

# Mock alerts for development - REMOVED - Using database only
# MOCK_ALERTS removed

@app.get("/")
async def root():
    return {"message": "Reseller Monitor API", "version": "1.0.0"}

# ==============================================================================
# EXISTING ENDPOINTS (Resellers, Alerts, etc.)
# ==============================================================================

@app.get("/resellers", response_model=List[Reseller])
@app.get("/api/resellers", response_model=List[Reseller])
async def get_resellers():
    """Get all resellers from database."""
    try:
        print("Fetching all resellers from database...")
        client = get_client()
        response = client.table("resellers").select("*").execute()
        print(f"Database response: {response}")
        
        resellers = response.data if response.data else []
        print(f"Found {len(resellers)} resellers")
        return resellers
    except Exception as e:
        print(f"Database error when fetching resellers: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Failed to fetch resellers: {str(e)}")

@app.post("/resellers", response_model=Reseller)
@app.post("/api/resellers", response_model=Reseller)
async def create_reseller(request: CreateResellerRequest):
    """Create a new reseller and its router mapping."""
    client = get_client()
    try:
        # Validate request data
        if not request.name or not request.name.strip():
            raise HTTPException(status_code=422, detail="Name is required and cannot be empty")
        if not request.phone or not request.phone.strip():
            raise HTTPException(status_code=422, detail="Phone is required and cannot be empty")
        if not request.router_id or not request.router_id.strip():
            raise HTTPException(status_code=422, detail="Router ID is required and cannot be empty")
        if not request.target_ip or not request.target_ip.strip():
            raise HTTPException(status_code=422, detail="Target IP is required and cannot be empty")
        if request.plan_mbps <= 0:
            raise HTTPException(status_code=422, detail="Plan Mbps must be greater than 0")
        if request.threshold <= 0 or request.threshold > 1:
            raise HTTPException(status_code=422, detail="Threshold must be between 0 and 1")
            
        print(f"Creating reseller with data: {request.dict()}")

        # 1. Check if router exists
        router_response = client.table("router_configs").select("id").eq("id", request.router_id).execute()
        if not router_response.data:
            raise HTTPException(status_code=404, detail=f"Router with ID '{request.router_id}' not found.")

        # 2. Create the reseller
        new_reseller_id = f"r{random.randint(1000, 9999)}" # Simple unique ID
        reseller_data = {
            "id": new_reseller_id,
            "name": request.name.strip(),
            "plan_mbps": request.plan_mbps,
            "threshold": request.threshold,
            "phone": request.phone.strip()
        }
        
        print(f"Inserting reseller data: {reseller_data}")
        insert_reseller_response = client.table("resellers").insert(reseller_data).execute()
        if not insert_reseller_response.data:
            raise HTTPException(status_code=500, detail="Failed to create reseller record.")

        # 3. Create the router mapping
        mapping_data = {
            "reseller_id": new_reseller_id,
            "router_id": request.router_id,
            "target_ip": request.target_ip.strip(),
            "queue_name": f"reseller_{new_reseller_id}"
        }
        print(f"Inserting mapping data: {mapping_data}")
        insert_mapping_response = client.table("reseller_router_mapping").insert(mapping_data).execute()

        if not insert_mapping_response.data:
            # Rollback: If mapping fails, delete the created reseller to avoid orphaned data
            print(f"Mapping failed, rolling back reseller {new_reseller_id}")
            client.table("resellers").delete().eq("id", new_reseller_id).execute()
            raise HTTPException(status_code=500, detail="Failed to create router mapping. Rolled back reseller creation.")

        print(f"Successfully created reseller {new_reseller_id}")
        return insert_reseller_response.data[0]

    except HTTPException as http_exc:
        print(f"HTTP Exception in create_reseller: {http_exc.status_code} - {http_exc.detail}")
        raise http_exc # Re-raise HTTPException to preserve status code and detail
    except Exception as e:
        # Catch any other unexpected errors
        print(f"Unexpected error in create_reseller: {str(e)}")
        raise HTTPException(status_code=500, detail=f"An unexpected error occurred: {str(e)}")

@app.get("/resellers/{reseller_id}", response_model=Reseller)
@app.get("/api/resellers/{reseller_id}", response_model=Reseller)
async def get_reseller(reseller_id: str):
    """Get a specific reseller from database."""
    try:
        print(f"Fetching reseller with ID: {reseller_id}")
        client = get_client()
        response = client.table("resellers").select("*").eq("id", reseller_id).execute()
        print(f"Database response for reseller {reseller_id}: {response}")
        
        if response.data and len(response.data) > 0:
            # Also check if a router mapping exists
            mapping_response = client.table("reseller_router_mapping").select("reseller_id").eq("reseller_id", reseller_id).execute()
            if not mapping_response.data:
                print(f"No router mapping found for reseller {reseller_id}, treating as not found.")
                raise HTTPException(status_code=404, detail=f"Reseller '{reseller_id}' found but has no router mapping.")

            reseller_data = response.data[0]
            print(f"Found reseller: {reseller_data}")
            return reseller_data
        else:
            print(f"Reseller {reseller_id} not found in database")
            raise HTTPException(status_code=404, detail=f"Reseller '{reseller_id}' not found")
    except HTTPException:
        raise
    except Exception as e:
        print(f"Database error when fetching reseller {reseller_id}: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Failed to fetch reseller: {str(e)}")


@app.put("/resellers/{reseller_id}", response_model=Reseller)
@app.put("/api/resellers/{reseller_id}", response_model=Reseller)
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

        if not result.data:
            raise HTTPException(status_code=404, detail=f"Failed to update reseller '{reseller_id}' or reseller not found.")
        
        # If plan_mbps was updated, trigger bandwidth update on router
        if request.plan_mbps is not None:
            try:
                cfg = load_config()
                manager = BandwidthManager(cfg)
                success = manager.router_manager.update_reseller_bandwidth(reseller_id, request.plan_mbps)
                if success:
                    print(f"Successfully updated router bandwidth for reseller {reseller_id}")
                else:
                    print(f"Failed to update router bandwidth for reseller {reseller_id}")
            except Exception as e:
                print(f"Error updating router bandwidth: {e}")
        
        return result.data[0]
        
    except Exception as e:
        print(f"Database error: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to update reseller: {str(e)}")

@app.delete("/resellers/{reseller_id}")
@app.delete("/api/resellers/{reseller_id}")
async def delete_reseller(reseller_id: str):
    """Delete a reseller from database."""
    try:
        client = get_client()
        
        # Check if reseller exists
        existing = client.table("resellers").select("*").eq("id", reseller_id).execute()
        if not existing.data:
            raise HTTPException(status_code=404, detail="Reseller not found")
        
        # Remove from router first
        try:
            cfg = load_config()
            manager = BandwidthManager(cfg)
            # Get router mappings for this reseller to remove from all routers
            mapping_result = client.table("reseller_router_mapping").select("router_id").eq("reseller_id", reseller_id).execute()
            
            for mapping in mapping_result.data:
                router_id = mapping["router_id"]
                success = manager.remove_reseller_from_router(reseller_id, router_id)
                if success:
                    print(f"Successfully removed reseller {reseller_id} from router {router_id}")
                else:
                    print(f"Failed to remove reseller {reseller_id} from router {router_id}")
        except Exception as e:
            print(f"Error removing from router: {e}")
        
        # Delete from database
        client.table("resellers").delete().eq("id", reseller_id).execute()
        return {"message": f"Reseller {reseller_id} deleted successfully"}
        
    except Exception as e:
        print(f"Database error: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to delete reseller: {str(e)}")

@app.get("/resellers/{reseller_id}/usage", response_model=List[UsagePoint])
@app.get("/api/resellers/{reseller_id}/usage", response_model=List[UsagePoint])
async def get_reseller_usage(reseller_id: str, hours: int = 24):
    """Get reseller usage from database for the last N hours."""
    try:
        print(f"Fetching usage data for reseller {reseller_id} for last {hours} hours")
        client = get_client()
        since = datetime.now() - timedelta(hours=hours)
        
        result = client.table("usage_5m").select("*").eq("reseller_id", reseller_id).gte("ts", since.isoformat()).order("ts").execute()
        print(f"Usage query result for {reseller_id}: found {len(result.data) if result.data else 0} records")
        
        return result.data if result.data else []
    except Exception as e:
        print(f"Database error when fetching usage for {reseller_id}: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Failed to get usage data: {str(e)}")

@app.get("/alerts", response_model=List[Alert])
@app.get("/api/alerts", response_model=List[Alert])
async def get_alerts(limit: int = 50):
    """Get recent alerts from database."""
    try:
        client = get_client()
        response = client.table("alerts").select("*").order("sent_at", desc=True).limit(limit).execute()
        return response.data if response.data else []
    except Exception as e:
        print(f"Database error: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch alerts: {str(e)}")

@app.get("/resellers/{reseller_id}/alerts", response_model=List[Alert])
@app.get("/api/resellers/{reseller_id}/alerts", response_model=List[Alert])
async def get_reseller_alerts(reseller_id: str, limit: int = 10):
    """Get alerts for a specific reseller from database."""
    try:
        client = get_client()
        response = client.table("alerts").select("*").eq("reseller_id", reseller_id).order("sent_at", desc=True).limit(limit).execute()
        return response.data if response.data else []
    except Exception as e:
        print(f"Database error: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch reseller alerts: {str(e)}")

@app.get("/link-state", response_model=List[LinkState])
@app.get("/api/link-states", response_model=List[LinkState])
async def get_link_states():
    """Get current link states for all resellers from database."""
    try:
        client = get_client()
        response = client.table("link_state").select("*").execute()
        return response.data if response.data else []
    except Exception as e:
        print(f"Database error: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch link states: {str(e)}")

@app.get("/resellers/{reseller_id}/report")
async def download_reseller_report(reseller_id: str):
    """Download PDF report for a reseller."""
    try:
        print(f"Generating report for reseller {reseller_id}")
        client = get_client()

        # 1. Fetch Reseller Info
        reseller_response = client.table("resellers").select("*").eq("id", reseller_id).execute()
        if not reseller_response.data:
            raise HTTPException(status_code=404, detail=f"Reseller '{reseller_id}' not found")
        reseller_info = reseller_response.data[0]

        # 2. Fetch Usage Data (last 30 days)
        since = datetime.now() - timedelta(days=30)
        usage_response = client.table("usage_5m").select("*").eq("reseller_id", reseller_id).gte("ts", since.isoformat()).order("ts").execute()
        usage_data = usage_response.data if usage_response.data else []

        # 3. Fetch Alerts (last 30 days)
        alerts_response = client.table("alerts").select("*").eq("reseller_id", reseller_id).gte("sent_at", since.isoformat()).order("sent_at", desc=True).execute()
        alerts_data = alerts_response.data if alerts_response.data else []

        # 4. Generate Report
        generator = PDFReportGenerator()
        pdf_path = generator.generate_monthly_report(
            reseller_id=reseller_id,
            reseller_name=reseller_info['name'],
            plan_mbps=reseller_info['plan_mbps'],
            usage_data=usage_data,
            alerts=alerts_data
        )

        print(f"Report generated successfully for {reseller_id}: {pdf_path}")

        return FileResponse(
            pdf_path,
            media_type="application/pdf",
            filename=f"reseller_{reseller_id}_report.pdf"
        )
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error generating report for {reseller_id}: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Failed to generate report: {str(e)}")

# ==============================================================================
# NEW ROUTER API ENDPOINTS
# ==============================================================================

@app.get("/router/status", response_model=RouterStatus)
async def get_router_status():
    """Get current router status and queue information."""
    try:
        cfg = load_config()
        manager = BandwidthManager(cfg)
        status = manager.get_router_status()
        return status
    except Exception as e:
        print(f"Error getting router status: {e}")
        return {"error": str(e)}

@app.get("/router/configs", response_model=List[RouterConfig])
async def get_router_configs():
    """Get all router configurations."""
    try:
        client = get_client()
        result = client.table("router_configs").select("*").execute()
        return result.data
    except Exception as e:
        print(f"Database error: {e}")
        raise HTTPException(status_code=500, detail="Failed to get router configs")

@app.post("/router/setup-reseller")
async def setup_reseller_on_router(request: BandwidthUpdateRequest):
    """Set up a new reseller's bandwidth limit on the router."""
    try:
        cfg = load_config()
        manager = BandwidthManager(cfg)
        success = manager.setup_reseller_on_router(
            request.reseller_id, 
            request.target_ip, 
            request.plan_mbps, 
            request.router_id
        )
        
        if success:
            return {"message": f"Successfully set up reseller {request.reseller_id} on router"}
        else:
            raise HTTPException(status_code=500, detail="Failed to set up reseller on router")
            
    except Exception as e:
        print(f"Error setting up reseller on router: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/router/update-bandwidth")
async def update_reseller_bandwidth(reseller_id: str, new_plan_mbps: int):
    """Update a reseller's bandwidth limit on the router."""
    try:
        cfg = load_config()
        manager = BandwidthManager(cfg)
        success = manager.router_manager.update_reseller_bandwidth(reseller_id, new_plan_mbps)
        
        if success:
            return {"message": f"Successfully updated bandwidth for reseller {reseller_id}"}
        else:
            raise HTTPException(status_code=500, detail="Failed to update bandwidth on router")
            
    except Exception as e:
        print(f"Error updating bandwidth: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/router/recent-updates")
async def get_recent_bandwidth_updates(limit: int = 20):
    """Get recent bandwidth update logs."""
    try:
        cfg = load_config()
        manager = BandwidthManager(cfg)
        updates = manager.get_recent_updates(limit)
        return updates
    except Exception as e:
        print(f"Error getting recent updates: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# ==============================================================================
# VLAN MANAGEMENT MODELS
# ==============================================================================

class VLANConfigModel(BaseModel):
    vlan_id: int
    interface_name: Optional[str] = None
    capacity_mbps: float
    enabled: Optional[bool] = True
    description: Optional[str] = None

class NTTNVLANModel(VLANConfigModel):
    nttn_link_id: str

class ResellerVLANModel(VLANConfigModel):
    reseller_id: str

class VLANSyncRequest(BaseModel):
    router_id: str
    force_sync: Optional[bool] = False

# ==============================================================================
# NEW NTTN LINK ENDPOINTS
# ==============================================================================

@app.get("/nttn/status", response_model=List[NTTNLinkStatus])
async def get_nttn_status():
    """Get current status of all NTTN links."""
    try:
        cfg = load_config()
        monitor = NTTNMonitor(cfg)
        status = monitor.get_nttn_status()
        return status
    except Exception as e:
        print(f"Error getting NTTN status: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/nttn/links")
async def get_nttn_links():
    """Get all NTTN link configurations."""
    try:
        client = get_client()
        result = client.table("nttn_links").select("*").execute()
        return result.data
    except Exception as e:
        print(f"Database error: {e}")
        raise HTTPException(status_code=500, detail="Failed to get NTTN links")

@app.get("/nttn/links/{link_id}/usage")
async def get_nttn_usage(link_id: str, hours: int = 24):
    """Get NTTN usage data for the last N hours."""
    try:
        client = get_client()
        since = datetime.now() - timedelta(hours=hours)
        
        result = client.table("nttn_usage").select("*").eq("nttn_link_id", link_id).gte("timestamp", since.isoformat()).order("timestamp").execute()
        return result.data
    except Exception as e:
        print(f"Database error: {e}")
        raise HTTPException(status_code=500, detail="Failed to get NTTN usage")

@app.get("/nttn/alerts", response_model=List[NTTNAlert])
async def get_nttn_alerts(limit: int = 50):
    """Get recent NTTN alerts."""
    try:
        client = get_client()
        result = client.table("nttn_alerts").select("*").order("sent_at", desc=True).limit(limit).execute()
        return result.data
    except Exception as e:
        print(f"Database error: {e}")
        raise HTTPException(status_code=500, detail="Failed to get NTTN alerts")

@app.get("/nttn/links/{link_id}/alerts")
async def get_nttn_link_alerts(link_id: str, limit: int = 20):
    """Get alerts for a specific NTTN link."""
    try:
        client = get_client()
        result = client.table("nttn_alerts").select("*").eq("nttn_link_id", link_id).order("sent_at", desc=True).limit(limit).execute()
        return result.data
    except Exception as e:
        print(f"Database error: {e}")
        raise HTTPException(status_code=500, detail="Failed to get NTTN link alerts")

@app.post("/api/nttn/links")
async def create_nttn_link(link_data: dict):
    """Create a new NTTN link with default VLANs."""
    try:
        client = get_client()
        
        # Validate required fields
        required_fields = ['id', 'name', 'device_type', 'device_ip', 'total_capacity_mbps', 'threshold_mbps']
        for field in required_fields:
            if field not in link_data or not link_data[field]:
                raise HTTPException(status_code=422, detail=f"Field '{field}' is required")
        
        # Check if link ID already exists
        existing = client.table("nttn_links").select("id").eq("id", link_data['id']).execute()
        if existing.data:
            raise HTTPException(status_code=409, detail=f"NTTN link with ID '{link_data['id']}' already exists")
        
        # Create NTTN link
        link_result = client.table("nttn_links").insert(link_data).execute()
        if not link_result.data:
            raise HTTPException(status_code=500, detail="Failed to create NTTN link")
        
        created_link = link_result.data[0]
        link_id = created_link['id']
        
        # Create default VLANs (10, 20, 30, 40, 50) with 200 Mbps each
        default_vlans = [
            {
                "nttn_link_id": link_id,
                "vlan_id": 10,
                "vlan_name": "VLAN 10",
                "capacity_mbps": 200,
                "interface_name": "vlan10",
                "enabled": True
            },
            {
                "nttn_link_id": link_id,
                "vlan_id": 20,
                "vlan_name": "VLAN 20", 
                "capacity_mbps": 200,
                "interface_name": "vlan20",
                "enabled": True
            },
            {
                "nttn_link_id": link_id,
                "vlan_id": 30,
                "vlan_name": "VLAN 30",
                "capacity_mbps": 200,
                "interface_name": "vlan30", 
                "enabled": True
            },
            {
                "nttn_link_id": link_id,
                "vlan_id": 40,
                "vlan_name": "VLAN 40",
                "capacity_mbps": 200,
                "interface_name": "vlan40",
                "enabled": True
            },
            {
                "nttn_link_id": link_id,
                "vlan_id": 50,
                "vlan_name": "VLAN 50",
                "capacity_mbps": 200,
                "interface_name": "vlan50",
                "enabled": True
            }
        ]
        
        # Insert default VLANs
        vlan_result = client.table("nttn_vlans").insert(default_vlans).execute()
        
        return {
            "message": "NTTN link created successfully",
            "link": created_link,
            "vlans_created": len(vlan_result.data) if vlan_result.data else 0
        }
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error creating NTTN link: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to create NTTN link: {str(e)}")

# Manual trigger for testing
@app.post("/nttn/trigger-monitoring")
async def trigger_nttn_monitoring():
    """Manually trigger NTTN monitoring cycle (for testing)."""
    try:
        cfg = load_config()
        monitor = NTTNMonitor(cfg)
        monitor.run_monitoring_cycle()
        return {"message": "NTTN monitoring cycle triggered successfully"}
    except Exception as e:
        print(f"Error triggering NTTN monitoring: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# ==============================================================================
# VLAN MANAGEMENT ENDPOINTS
# ==============================================================================

@app.get("/api/vlans/nttn/{nttn_link_id}")
def get_nttn_vlans(nttn_link_id: str):
    """Get all VLAN configurations for an NTTN link."""
    try:
        client = get_client()
        result = client.table("nttn_vlans").select("*").eq("nttn_link_id", nttn_link_id).execute()
        return {"vlans": result.data or []}
    except Exception as e:
        print(f"Error fetching NTTN VLANs: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch NTTN VLANs")

@app.post("/api/vlans/nttn")
def create_nttn_vlan(vlan: NTTNVLANModel):
    """Create a new VLAN configuration for an NTTN link."""
    try:
        client = get_client()
        
        # Check if VLAN ID already exists for this NTTN link
        existing = client.table("nttn_vlans").select("id").eq("nttn_link_id", vlan.nttn_link_id).eq("vlan_id", vlan.vlan_id).execute()
        if existing.data:
            raise HTTPException(status_code=409, detail=f"VLAN {vlan.vlan_id} already exists for NTTN link {vlan.nttn_link_id}")
        
        # Create VLAN configuration
        vlan_data = {
            "nttn_link_id": vlan.nttn_link_id,
            "vlan_id": vlan.vlan_id,
            "interface_name": vlan.interface_name or f"vlan{vlan.vlan_id}",
            "capacity_mbps": vlan.capacity_mbps,
            "enabled": vlan.enabled,
            "description": vlan.description,
            "created_at": datetime.utcnow().isoformat()
        }
        
        result = client.table("nttn_vlans").insert(vlan_data).execute()
        return {"message": "NTTN VLAN created successfully", "vlan": result.data[0]}
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error creating NTTN VLAN: {e}")
        raise HTTPException(status_code=500, detail="Failed to create NTTN VLAN")

@app.get("/api/vlans/reseller/{reseller_id}")
def get_reseller_vlans(reseller_id: str):
    """Get all VLAN configurations for a reseller."""
    try:
        client = get_client()
        result = client.table("reseller_vlans").select("*").eq("reseller_id", reseller_id).execute()
        return {"vlans": result.data or []}
    except Exception as e:
        print(f"Error fetching reseller VLANs: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch reseller VLANs")

@app.post("/api/vlans/reseller")
def create_reseller_vlan(vlan: ResellerVLANModel):
    """Create a new VLAN configuration for a reseller."""
    try:
        client = get_client()
        
        # Check if VLAN ID already exists for this reseller
        existing = client.table("reseller_vlans").select("id").eq("reseller_id", vlan.reseller_id).eq("vlan_id", vlan.vlan_id).execute()
        if existing.data:
            raise HTTPException(status_code=409, detail=f"VLAN {vlan.vlan_id} already exists for reseller {vlan.reseller_id}")
        
        # Create VLAN configuration
        vlan_data = {
            "reseller_id": vlan.reseller_id,
            "vlan_id": vlan.vlan_id,
            "interface_name": vlan.interface_name or f"vlan{vlan.vlan_id}",
            "capacity_mbps": vlan.capacity_mbps,
            "enabled": vlan.enabled,
            "description": vlan.description,
            "created_at": datetime.utcnow().isoformat()
        }
        
        result = client.table("reseller_vlans").insert(vlan_data).execute()
        return {"message": "Reseller VLAN created successfully", "vlan": result.data[0]}
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error creating reseller VLAN: {e}")
        raise HTTPException(status_code=500, detail="Failed to create reseller VLAN")nt()
        result = client.table("nttn_vlans").select("*").eq("nttn_link_id", nttn_link_id).execute()
        return {"vlans": result.data or []}
    except Exception as e:
        print(f"Error fetching NTTN VLANs: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch NTTN VLANs")

@app.post("/api/vlans/nttn")
def create_nttn_vlan(vlan: NTTNVLANModel):
    """Create a new VLAN configuration for an NTTN link."""
    try:
        client = get_client()
        
        # Check if VLAN ID already exists for this NTTN link
        existing = client.table("nttn_vlans").select("id").eq("nttn_link_id", vlan.nttn_link_id).eq("vlan_id", vlan.vlan_id).execute()
        if existing.data:
            raise HTTPException(status_code=409, detail=f"VLAN {vlan.vlan_id} already exists for NTTN link {vlan.nttn_link_id}")
        
        # Create VLAN configuration
        vlan_data = {
            "nttn_link_id": vlan.nttn_link_id,
            "vlan_id": vlan.vlan_id,
            "interface_name": vlan.interface_name or f"vlan{vlan.vlan_id}",
            "capacity_mbps": vlan.capacity_mbps,
            "enabled": vlan.enabled,
            "description": vlan.description,
            "created_at": datetime.utcnow().isoformat()
        }
        
        result = client.table("nttn_vlans").insert(vlan_data).execute()
        return {"message": "NTTN VLAN created successfully", "vlan": result.data[0]}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating NTTN VLAN: {e}")
        raise HTTPException(status_code=500, detail="Failed to create NTTN VLAN")

@app.get("/api/vlans/reseller/{reseller_id}")
def get_reseller_vlans(reseller_id: str):
    """Get all VLAN configurations for a reseller."""
    try:
        client = get_client()
        result = client.table("reseller_vlans").select("*").eq("reseller_id", reseller_id).execute()
        return {"vlans": result.data or []}
    except Exception as e:
        logger.error(f"Error fetching reseller VLANs: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch reseller VLANs")

@app.post("/api/vlans/reseller")
def create_reseller_vlan(vlan: ResellerVLANModel):
    """Create a new VLAN configuration for a reseller."""
    try:
        client = get_client()
        
        # Check if VLAN ID already exists for this reseller
        existing = client.table("reseller_vlans").select("id").eq("reseller_id", vlan.reseller_id).eq("vlan_id", vlan.vlan_id).execute()
        if existing.data:
            raise HTTPException(status_code=409, detail=f"VLAN {vlan.vlan_id} already exists for reseller {vlan.reseller_id}")
        
        # Create VLAN configuration
        vlan_data = {
            "reseller_id": vlan.reseller_id,
            "vlan_id": vlan.vlan_id,
            "interface_name": vlan.interface_name or f"vlan{vlan.vlan_id}",
            "capacity_mbps": vlan.capacity_mbps,
            "enabled": vlan.enabled,
            "description": vlan.description,
            "created_at": datetime.utcnow().isoformat()
        }
        
        result = client.table("reseller_vlans").insert(vlan_data).execute()
        return {"message": "Reseller VLAN created successfully", "vlan": result.data[0]}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating reseller VLAN: {e}")
        raise HTTPException(status_code=500, detail="Failed to create reseller VLAN")

@app.post("/api/vlans/sync")
def sync_vlan_interfaces(request: VLANSyncRequest):
    """Sync VLAN interfaces from MikroTik router."""
    try:
        client = get_client()
        
        # Get router configuration
        router_result = client.table("router_configs").select("*").eq("id", request.router_id).eq("enabled", True).execute()
        if not router_result.data:
            raise HTTPException(status_code=404, detail="Router not found or disabled")
        
        router_config = router_result.data[0]
        
        # Connect to MikroTik router
        from src.mikrotik_client import MikroTikRouterClient
        router_client = MikroTikRouterClient(
            host=router_config['host'],
            username=router_config['username'], 
            password=router_config['password'],
            port=router_config.get('port', 8728),
            use_ssl=router_config.get('use_ssl', False)
        )
        
        if not router_client.connect():
            raise HTTPException(status_code=503, detail="Failed to connect to router")
        
        # Get VLAN interfaces from router
        vlan_interfaces = router_client.get_vlan_interfaces()
        router_client.disconnect()
        
        synced_vlans = []
        for interface in vlan_interfaces:
            if 'vlan-id' in interface and interface.get('name'):
                vlan_info = {
                    "vlan_id": int(interface['vlan-id']),
                    "interface_name": interface['name'],
                    "disabled": interface.get('disabled', 'false') == 'true',
                    "mtu": interface.get('mtu', '1500'),
                    "arp": interface.get('arp', 'enabled')
                }
                synced_vlans.append(vlan_info)
        
        return {
            "message": f"Successfully synced {len(synced_vlans)} VLAN interfaces from router",
            "router_id": request.router_id,
            "vlans": synced_vlans
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error syncing VLAN interfaces: {e}")
        raise HTTPException(status_code=500, detail="Failed to sync VLAN interfaces")

# ==============================================================================
# COMPREHENSIVE ROUTER MANAGEMENT API
# ==============================================================================

class RouterConfigModel(BaseModel):
    id: str
    name: str
    host: str
    username: str
    password: str
    port: Optional[int] = 8728
    use_ssl: Optional[bool] = False
    device_type: Optional[str] = "mikrotik"
    enabled: Optional[bool] = True

class RouterConfigUpdateModel(BaseModel):
    name: Optional[str] = None
    host: Optional[str] = None
    username: Optional[str] = None
    password: Optional[str] = None
    port: Optional[int] = None
    use_ssl: Optional[bool] = None
    device_type: Optional[str] = None
    enabled: Optional[bool] = None

class ResellerRouterMappingModel(BaseModel):
    reseller_id: str
    router_id: str
    target_ip: str
    queue_name: Optional[str] = None

@app.get("/api/routers")
async def get_all_routers():
    """Get all router configurations."""
    try:
        client = get_client()
        result = client.table("router_configs").select("*").execute()
        return {"routers": result.data}
    except Exception as e:
        print(f"Error fetching routers: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/routers")
async def create_router(router: RouterConfigModel):
    """Create a new router configuration."""
    try:
        client = get_client()
        result = client.table("router_configs").insert({
            "id": router.id,
            "name": router.name,
            "host": router.host,
            "username": router.username,
            "password": router.password,
            "port": router.port,
            "use_ssl": router.use_ssl,
            "device_type": router.device_type,
            "enabled": router.enabled
        }).execute()
        return {"message": "Router created successfully", "router": result.data[0]}
    except Exception as e:
        print(f"Error creating router: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.put("/api/routers/{router_id}")
async def update_router(router_id: str, router: RouterConfigUpdateModel):
    """Update a router configuration."""
    try:
        client = get_client()
        update_data = {k: v for k, v in router.dict().items() if v is not None}
        update_data["updated_at"] = datetime.now().isoformat()
        
        result = client.table("router_configs").update(update_data).eq("id", router_id).execute()
        if not result.data:
            raise HTTPException(status_code=404, detail="Router not found")
        return {"message": "Router updated successfully", "router": result.data[0]}
    except Exception as e:
        print(f"Error updating router: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.delete("/api/routers/{router_id}")
async def delete_router(router_id: str):
    """Delete a router configuration."""
    try:
        client = get_client()
        result = client.table("router_configs").delete().eq("id", router_id).execute()
        if not result.data:
            raise HTTPException(status_code=404, detail="Router not found")
        return {"message": "Router deleted successfully"}
    except Exception as e:
        print(f"Error deleting router: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/routers/{router_id}/test-connection")
async def test_router_connection(router_id: str):
    """Test connection to a specific router."""
    try:
        router_manager = RouterManager()
        
        # Get router config
        client = get_client()
        result = client.table("router_configs").select("*").eq("id", router_id).execute()
        if not result.data:
            raise HTTPException(status_code=404, detail="Router not found")
        
        router_config = result.data[0]
        
        # Test connection
        success, message = router_manager.test_router_connection(router_config)
        return {
            "success": success,
            "message": message,
            "router_id": router_id,
            "host": router_config["host"]
        }
    except Exception as e:
        print(f"Error testing router connection: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/routers/{router_id}/devices")
async def get_router_devices(router_id: str):
    """Get all devices/queues from a specific router."""
    try:
        router_manager = RouterManager()
        
        # Get router config
        client = get_client()
        result = client.table("router_configs").select("*").eq("id", router_id).execute()
        if not result.data:
            raise HTTPException(status_code=404, detail="Router not found")
        
        router_config = result.data[0]
        
        # Get devices from router
        devices = router_manager.get_router_devices(router_config)
        return {
            "router_id": router_id,
            "router_name": router_config["name"],
            "devices": devices
        }
    except Exception as e:
        print(f"Error fetching router devices: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/router-mappings")
async def get_router_mappings():
    """Get all reseller-router mappings."""
    try:
        client = get_client()
        result = client.table("reseller_router_mapping").select("""
            *,
            resellers:reseller_id(*),
            router_configs:router_id(*)
        """).execute()
        return {"mappings": result.data}
    except Exception as e:
        print(f"Error fetching router mappings: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/router-mappings")
async def create_router_mapping(mapping: ResellerRouterMappingModel):
    """Create a new reseller-router mapping."""
    try:
        client = get_client()
        
        # Validate that reseller exists
        reseller_check = client.table("resellers").select("id").eq("id", mapping.reseller_id).execute()
        if not reseller_check.data:
            raise HTTPException(status_code=404, detail=f"Reseller with ID '{mapping.reseller_id}' not found")
        
        # Validate that router exists
        router_check = client.table("router_configs").select("id").eq("id", mapping.router_id).execute()
        if not router_check.data:
            raise HTTPException(status_code=404, detail=f"Router with ID '{mapping.router_id}' not found")
        
        # Check if mapping already exists
        existing_mapping = client.table("reseller_router_mapping").select("id").eq("reseller_id", mapping.reseller_id).eq("router_id", mapping.router_id).execute()
        if existing_mapping.data:
            raise HTTPException(status_code=409, detail=f"Mapping already exists between reseller '{mapping.reseller_id}' and router '{mapping.router_id}'")
        
        result = client.table("reseller_router_mapping").insert({
            "reseller_id": mapping.reseller_id,
            "router_id": mapping.router_id,
            "target_ip": mapping.target_ip,
            "queue_name": mapping.queue_name or f"reseller_{mapping.reseller_id}"
        }).execute()
        return {"message": "Router mapping created successfully", "mapping": result.data[0]}
    except HTTPException as http_exc:
        raise http_exc
    except Exception as e:
        print(f"Error creating router mapping: {e}")
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")

@app.delete("/api/router-mappings/{mapping_id}")
async def delete_router_mapping(mapping_id: int):
    """Delete a reseller-router mapping."""
    try:
        client = get_client()
        result = client.table("reseller_router_mapping").delete().eq("id", mapping_id).execute()
        if not result.data:
            raise HTTPException(status_code=404, detail="Router mapping not found")
        return {"message": "Router mapping deleted successfully"}
    except Exception as e:
        print(f"Error deleting router mapping: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/network-devices")
async def discover_network_devices():
    """Discover all devices connected to routers."""
    try:
        router_manager = RouterManager()
        
        # Get all active routers
        client = get_client()
        result = client.table("router_configs").select("*").eq("enabled", True).execute()
        
        all_devices = []
        router_statuses = []
        
        for router_config in result.data:
            try:
                devices = router_manager.get_router_devices(router_config)
                all_devices.extend([{
                    **device,
                    "router_id": router_config["id"],
                    "router_name": router_config["name"],
                    "router_host": router_config["host"]
                } for device in devices])
                
                router_statuses.append({
                    "router_id": router_config["id"],
                    "name": router_config["name"],
                    "host": router_config["host"],
                    "status": "online",
                    "device_count": len(devices)
                })
            except Exception as e:
                router_statuses.append({
                    "router_id": router_config["id"],
                    "name": router_config["name"],
                    "host": router_config["host"],
                    "status": "offline",
                    "error": str(e),
                    "device_count": 0
                })
        
        return {
            "devices": all_devices,
            "router_statuses": router_statuses,
            "summary": {
                "total_routers": len(result.data),
                "online_routers": len([r for r in router_statuses if r["status"] == "online"]),
                "total_devices": len(all_devices)
            }
        }
    except Exception as e:
        print(f"Error discovering network devices: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# ==============================================================================
# ROUTER BACKUP ENDPOINTS
# ==============================================================================

@app.get("/api/routers/{router_id}/backups")
async def list_router_backups(router_id: str):
    """List all backups on a specific router."""
    try:
        router_manager = RouterManager()
        client = get_client()
        result = client.table("router_configs").select("*").eq("id", router_id).execute()
        if not result.data:
            raise HTTPException(status_code=404, detail="Router not found")
        
        router_config = result.data[0]
        
        # Create temporary router client
        router_client = router_manager.get_router_client(router_config)
        
        if not router_client.connect():
            raise HTTPException(status_code=503, detail="Failed to connect to router")
        
        backups = router_client.list_backups()
        router_client.disconnect()
        
        return {"backups": backups}
    except Exception as e:
        print(f"Error listing router backups: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/routers/{router_id}/backups")
async def create_router_backup(router_id: str):
    """Create a new backup on a specific router."""
    try:
        router_manager = RouterManager()
        client = get_client()
        result = client.table("router_configs").select("*").eq("id", router_id).execute()
        if not result.data:
            raise HTTPException(status_code=404, detail="Router not found")
        
        router_config = result.data[0]
        
        # Create temporary router client
        router_client = router_manager.get_router_client(router_config)
        
        if not router_client.connect():
            raise HTTPException(status_code=503, detail="Failed to connect to router")
        
        backup_name = router_client.create_backup()
        router_client.disconnect()
        
        if backup_name:
            return {"message": "Backup created successfully", "backup_name": backup_name}
        else:
            raise HTTPException(status_code=500, detail="Failed to create backup")
    except Exception as e:
        print(f"Error creating router backup: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.delete("/api/routers/{router_id}/backups/{backup_name}")
async def delete_router_backup(router_id: str, backup_name: str):
    """Delete a backup from a specific router."""
    try:
        router_manager = RouterManager()
        client = get_client()
        result = client.table("router_configs").select("*").eq("id", router_id).execute()
        if not result.data:
            raise HTTPException(status_code=404, detail="Router not found")
        
        router_config = result.data[0]
        
        # Create temporary router client
        router_client = router_manager.get_router_client(router_config)
        
        if not router_client.connect():
            raise HTTPException(status_code=503, detail="Failed to connect to router")
        
        success = router_client.remove_backup(backup_name)
        router_client.disconnect()
        
        if success:
            return {"message": "Backup deleted successfully"}
        else:
            raise HTTPException(status_code=500, detail="Failed to delete backup")
    except Exception as e:
        print(f"Error deleting router backup: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# ==============================================================================
# BULK ACTION ENDPOINTS
# ==============================================================================

class BulkActionRequest(BaseModel):
    router_ids: List[str]
    action: str
    payload: Optional[Dict[str, Any]] = None

@app.post("/api/routers/bulk-action")
async def bulk_router_action(request: BulkActionRequest):
    """Perform a bulk action on multiple routers."""
    router_manager = RouterManager()
    client = get_client()
    
    results = []
    
    for router_id in request.router_ids:
        result = {"router_id": router_id, "success": False, "message": ""}
        try:
            res = client.table("router_configs").select("*").eq("id", router_id).execute()
            if not res.data:
                result["message"] = "Router not found"
                results.append(result)
                continue
            
            router_config = res.data[0]
            router_client = router_manager.get_router_client(router_config)
            
            if not router_client.connect():
                result["message"] = "Failed to connect"
                results.append(result)
                continue

            if request.action == "reboot":
                success = router_client.reboot_router()
                if success:
                    result["success"] = True
                    result["message"] = "Reboot command sent successfully"
                else:
                    result["message"] = "Failed to send reboot command"
            elif request.action == "add_firewall_rule":
                if not request.payload:
                    result["message"] = "Payload is required for adding firewall rule"
                else:
                    success = router_client.add_firewall_rule(request.payload)
                    if success:
                        result["success"] = True
                        result["message"] = "Firewall rule added successfully"
                    else:
                        result["message"] = "Failed to add firewall rule"
            elif request.action == "update_qos_rule":
                if not request.payload or 'name' not in request.payload or 'limits' not in request.payload:
                    result["message"] = "Payload with queue name and limits is required for updating QoS rule"
                else:
                    success = router_client.update_qos_rule(request.payload['name'], request.payload['limits'])
                    if success:
                        result["success"] = True
                        result["message"] = "QoS rule updated successfully"
                    else:
                        result["message"] = "Failed to update QoS rule"
            else:
                result["message"] = f"Unknown action: {request.action}"

            router_client.disconnect()
        except Exception as e:
            result["message"] = str(e)
        
        results.append(result)
        
    return {"results": results}

@app.get("/api/routers/{router_id}/os-version")
async def get_router_os_version(router_id: str):
    """Get the RouterOS version for a specific router."""
    router_manager = RouterManager()
    client = get_client()
    
    try:
        res = client.table("router_configs").select("*").eq("id", router_id).execute()
        if not res.data:
            raise HTTPException(status_code=404, detail="Router not found")
        
        router_config = res.data[0]
        router_client = router_manager.get_router_client(router_config)
        
        if not router_client.connect():
            raise HTTPException(status_code=503, detail="Failed to connect to router")

        os_version = router_client.get_router_os_version()
        router_client.disconnect()

        if os_version:
            # Update the database with the new version
            client.table("router_configs").update({"os_version": os_version}).eq("id", router_id).execute()
            return {"os_version": os_version}
        else:
            raise HTTPException(status_code=500, detail="Failed to get RouterOS version")

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ==============================================================================
# IPAM ENDPOINTS
# ==============================================================================

class SubnetModel(BaseModel):
    subnet: str
    description: str

class AllocationModel(BaseModel):
    subnet_id: str
    reseller_id: str
    ip_address: str

@app.get("/api/ipam/subnets")
async def get_subnets():
    client = get_client()
    try:
        res = client.table("ipam_subnets").select("*").execute()
        return {"subnets": res.data}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/ipam/subnets")
async def create_subnet(subnet: SubnetModel):
    client = get_client()
    try:
        res = client.table("ipam_subnets").insert(subnet.dict()).execute()
        return {"subnet": res.data[0]}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/ipam/allocations")
async def get_allocations():
    client = get_client()
    try:
        res = client.table("ipam_allocations").select("*").execute()
        return {"allocations": res.data}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/ipam/allocations")
async def create_allocation(allocation: AllocationModel):
    client = get_client()
    try:
        res = client.table("ipam_allocations").insert(allocation.dict()).execute()
        return {"allocation": res.data[0]}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ==============================================================================
# AUTOMATED SERVICE CONTROL ENDPOINTS
# ==============================================================================

class ResellerActionRequest(BaseModel):
    reseller_id: str

@app.post("/api/resellers/suspend")
async def suspend_reseller(request: ResellerActionRequest):
    """Suspend a reseller's service."""
    router_manager = RouterManager()
    client = get_client()
    try:
        # Get router mapping
        mapping_res = client.table("reseller_router_mapping").select("*").eq("reseller_id", request.reseller_id).execute()
        if not mapping_res.data:
            raise HTTPException(status_code=404, detail="Reseller mapping not found")
        
        for mapping in mapping_res.data:
            router_config_res = client.table("router_configs").select("*").eq("id", mapping['router_id']).execute()
            if not router_config_res.data:
                continue
            
            router_config = router_config_res.data[0]
            router_client = router_manager.get_router_client(router_config)
            
            if router_client.connect():
                router_client.set_queue_disabled(f"reseller_{request.reseller_id}", True)
                router_client.disconnect()

        # Update reseller status
        client.table("resellers").update({"status": "suspended"}).eq("id", request.reseller_id).execute()
        
        return {"message": "Reseller suspended successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/resellers/unsuspend")
async def unsuspend_reseller(request: ResellerActionRequest):
    """Unsuspend a reseller's service."""
    router_manager = RouterManager()
    client = get_client()
    try:
        # Get router mapping
        mapping_res = client.table("reseller_router_mapping").select("*").eq("reseller_id", request.reseller_id).execute()
        if not mapping_res.data:
            raise HTTPException(status_code=404, detail="Reseller mapping not found")
        
        for mapping in mapping_res.data:
            router_config_res = client.table("router_configs").select("*").eq("id", mapping['router_id']).execute()
            if not router_config_res.data:
                continue
            
            router_config = router_config_res.data[0]
            router_client = router_manager.get_router_client(router_config)
            
            if router_client.connect():
                router_client.set_queue_disabled(f"reseller_{request.reseller_id}", False)
                router_client.disconnect()

        # Update reseller status
        client.table("resellers").update({"status": "active"}).eq("id", request.reseller_id).execute()
        
        return {"message": "Reseller unsuspended successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/resellers/reboot")
async def reboot_reseller_router(request: ResellerActionRequest):
    """Reboot a reseller's router."""
    router_manager = RouterManager()
    client = get_client()
    try:
        # Get router mapping
        mapping_res = client.table("reseller_router_mapping").select("*").eq("reseller_id", request.reseller_id).execute()
        if not mapping_res.data:
            raise HTTPException(status_code=404, detail="Reseller mapping not found")
        
        for mapping in mapping_res.data:
            router_config_res = client.table("router_configs").select("*").eq("id", mapping['router_id']).execute()
            if not router_config_res.data:
                continue
            
            router_config = router_config_res.data[0]
            router_client = router_manager.get_router_client(router_config)
            
            if router_client.connect():
                router_client.reboot_router()
                router_client.disconnect()
        
        return {"message": "Reboot command sent successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    
    # Get host and port from environment
    host = os.getenv("API_HOST", "0.0.0.0")
    port = int(os.getenv("API_PORT", "8000"))
    
    uvicorn.run(app, host=host, port=port) 