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
async def get_resellers():
    """Get all resellers from database."""
    try:
        client = get_client()
        response = client.table("resellers").select("*").execute()
        return [{"resellers": response.data}][0]["resellers"] if response.data else []
    except Exception as e:
        print(f"Database error: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch resellers: {str(e)}")

@app.get("/resellers/{reseller_id}", response_model=Reseller)
async def get_reseller(reseller_id: str):
    """Get a specific reseller from database."""
    try:
        client = get_client()
        response = client.table("resellers").select("*").eq("id", reseller_id).execute()
        if response.data:
            return response.data[0]
        else:
            raise HTTPException(status_code=404, detail="Reseller not found")
    except HTTPException:
        raise
    except Exception as e:
        print(f"Database error: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch reseller: {str(e)}")

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
        
        # Automatically set up router bandwidth limit for new reseller
        # You'll need to provide the target IP - this could be done via additional API call
        # For now, we'll just log that this needs to be done manually
        print(f"TODO: Set up router bandwidth limit for new reseller {reseller_id}")
        
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
            success = manager.remove_reseller_from_router(reseller_id)
            if success:
                print(f"Successfully removed reseller {reseller_id} from router")
            else:
                print(f"Failed to remove reseller {reseller_id} from router")
        except Exception as e:
            print(f"Error removing from router: {e}")
        
        # Delete from database
        client.table("resellers").delete().eq("id", reseller_id).execute()
        return {"message": f"Reseller {reseller_id} deleted successfully"}
        
    except Exception as e:
        print(f"Database error: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to delete reseller: {str(e)}")

@app.get("/resellers/{reseller_id}/usage", response_model=List[UsagePoint])
async def get_reseller_usage(reseller_id: str, hours: int = 24):
    """Get reseller usage from database for the last N hours."""
    try:
        client = get_client()
        since = datetime.now() - timedelta(hours=hours)
        
        result = client.table("usage_5m").select("*").eq("reseller_id", reseller_id).gte("ts", since.isoformat()).order("ts").execute()
        return result.data
    except Exception as e:
        print(f"Database error: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get usage data: {str(e)}")

@app.get("/alerts", response_model=List[Alert])
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
        generator = PDFReportGenerator()
        pdf_path = generator.generate_report(reseller_id)
        
        return FileResponse(
            pdf_path,
            media_type="application/pdf",
            filename=f"reseller_{reseller_id}_report.pdf"
        )
    except Exception as e:
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
        result = client.table("reseller_router_mapping").insert({
            "reseller_id": mapping.reseller_id,
            "router_id": mapping.router_id,
            "target_ip": mapping.target_ip,
            "queue_name": mapping.queue_name or f"reseller_{mapping.reseller_id}"
        }).execute()
        return {"message": "Router mapping created successfully", "mapping": result.data[0]}
    except Exception as e:
        print(f"Error creating router mapping: {e}")
        raise HTTPException(status_code=500, detail=str(e))

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
# MAIN
# ==============================================================================

if __name__ == "__main__":
    import uvicorn
    
    # Get host and port from environment
    host = os.getenv("API_HOST", "0.0.0.0")
    port = int(os.getenv("API_PORT", "8000"))
    
    uvicorn.run(app, host=host, port=port) 