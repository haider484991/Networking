"""Bandwidth Manager Service - Automatically updates router limits when plans change."""
from __future__ import annotations

import logging
import time
from typing import Dict, List, Optional
from datetime import datetime, timedelta

from .supabase_client import get_client, insert_row
from .mikrotik_client import RouterManager
from .cisco_client import CiscoRouterClient
from .juniper_client import JuniperRouterClient

logger = logging.getLogger(__name__)


class BandwidthManager:
    """Service to automatically update router bandwidth limits when reseller plans change."""

    def __init__(self, config: Dict):
        """Initialize the bandwidth manager."""
        self.cfg = config
        self.router_manager = RouterManager()
        self.check_interval = config.get("bandwidth_check_interval", 60)  # Check every minute
        self._last_check_time: Optional[datetime] = None

    def check_for_plan_changes(self) -> None:
        """Check for reseller plan changes and update router limits accordingly."""
        try:
            client = get_client()
            
            # Get all resellers
            resellers_result = client.table("resellers").select("*").execute()
            
            for reseller in resellers_result.data:
                reseller_id = reseller['id']
                current_plan_mbps = reseller['plan_mbps']
                
                # Check if this reseller needs bandwidth updates
                needs_update = self._check_reseller_needs_update(reseller_id, current_plan_mbps)
                
                if needs_update:
                    logger.info("Updating bandwidth for reseller %s to %d Mbps", reseller_id, current_plan_mbps)
                    success = self.router_manager.update_reseller_bandwidth(reseller_id, current_plan_mbps)
                    
                    if success:
                        self._mark_reseller_updated(reseller_id, current_plan_mbps)
                        logger.info("Successfully updated bandwidth for reseller %s", reseller_id)
                    else:
                        logger.error("Failed to update bandwidth for reseller %s", reseller_id)
                        
        except Exception as exc:
            logger.error("Error checking for plan changes: %s", exc)

    def _check_reseller_needs_update(self, reseller_id: str, current_plan_mbps: int) -> bool:
        """Check if a reseller needs bandwidth updates."""
        try:
            client = get_client()
            
            # Get the last successful bandwidth update for this reseller
            result = client.table("bandwidth_update_log").select("*").eq("reseller_id", reseller_id).order("timestamp", desc=True).limit(1).execute()
            
            if not result.data:
                # No previous update record, needs update
                logger.debug("No previous update record for reseller %s, needs update", reseller_id)
                return True
            
            last_update = result.data[0]
            last_limit_mbps = last_update['new_limit_mbps']
            last_update_time = datetime.fromisoformat(last_update['timestamp'].replace('Z', '+00:00'))
            
            # Check if plan has changed
            if current_plan_mbps != last_limit_mbps:
                logger.debug("Plan changed for reseller %s: %d -> %d Mbps", reseller_id, last_limit_mbps, current_plan_mbps)
                return True
            
            # Check if last update was unsuccessful (success_count < total_count)
            if last_update['success_count'] < last_update['total_count']:
                # Retry failed updates after 30 minutes
                time_since_last_update = datetime.now(last_update_time.tzinfo) - last_update_time
                if time_since_last_update.total_seconds() > 1800:  # 30 minutes
                    logger.debug("Retrying failed update for reseller %s", reseller_id)
                    return True
            
            return False
            
        except Exception as exc:
            logger.error("Error checking if reseller %s needs update: %s", reseller_id, exc)
            return False

    def _mark_reseller_updated(self, reseller_id: str, new_plan_mbps: int) -> None:
        """Mark that a reseller's bandwidth has been successfully updated."""
        try:
            # Get router mapping count for this reseller
            client = get_client()
            mapping_result = client.table("reseller_router_mapping").select("*").eq("reseller_id", reseller_id).execute()
            total_count = len(mapping_result.data)
            
            # For now, assume all updates were successful (this would be updated by RouterManager)
            # In a real implementation, RouterManager would provide actual success/failure counts
            insert_row("bandwidth_update_log", {
                "reseller_id": reseller_id,
                "new_limit_mbps": new_plan_mbps,
                "success_count": total_count,
                "total_count": total_count,
                "timestamp": datetime.now().isoformat()
            })
            
        except Exception as exc:
            logger.error("Error marking reseller %s as updated: %s", reseller_id, exc)

    def setup_reseller_on_router(self, reseller_id: str, target_ip: str, plan_mbps: int, router_id: str = "mikrotik_main") -> bool:
        """Set up a new reseller's bandwidth limit on the router."""
        try:
            # First, create the router mapping
            client = get_client()
            mapping_data = {
                "reseller_id": reseller_id,
                "router_id": router_id,
                "target_ip": target_ip,
                "queue_name": f"reseller_{reseller_id}"
            }
            
            # Insert or update mapping
            try:
                client.table("reseller_router_mapping").insert(mapping_data).execute()
            except Exception:
                # If conflict, update existing
                client.table("reseller_router_mapping").update(mapping_data).eq("reseller_id", reseller_id).eq("router_id", router_id).execute()
            
            # Get the router client
            router_client = self.router_manager.get_router(router_id)
            if not router_client:
                logger.error("Router %s not found", router_id)
                return False
            
            # Connect to router if not connected
            if not router_client.is_connected():
                if not router_client.connect():
                    logger.error("Failed to connect to router %s", router_id)
                    return False
            
            # Create bandwidth limit on router
            success = router_client.create_bandwidth_limit(reseller_id, target_ip, plan_mbps, plan_mbps)
            
            if success:
                # Mark as updated
                self._mark_reseller_updated(reseller_id, plan_mbps)
                logger.info("Successfully set up reseller %s on router with %d Mbps limit", reseller_id, plan_mbps)
            
            return success
            
        except Exception as exc:
            logger.error("Error setting up reseller %s on router: %s", reseller_id, exc)
            return False

    def remove_reseller_from_router(self, reseller_id: str, router_id: str = "mikrotik_main") -> bool:
        """Remove a reseller's bandwidth limit from the router."""
        try:
            # Get the router client
            router_client = self.router_manager.get_router(router_id)
            if not router_client:
                logger.error("Router %s not found", router_id)
                return False
            
            # Connect to router if not connected
            if not router_client.is_connected():
                if not router_client.connect():
                    logger.error("Failed to connect to router %s", router_id)
                    return False
            
            # Remove bandwidth limit from router
            success = router_client.remove_bandwidth_limit(reseller_id)
            
            if success:
                # Remove mapping from database
                client = get_client()
                client.table("reseller_router_mapping").delete().eq("reseller_id", reseller_id).eq("router_id", router_id).execute()
                logger.info("Successfully removed reseller %s from router", reseller_id)
            
            return success
            
        except Exception as exc:
            logger.error("Error removing reseller %s from router: %s", reseller_id, exc)
            return False

    def get_router_status(self) -> Dict:
        """Get current router status and queue information."""
        try:
            status = {
                "routers": {},
                "total_resellers": 0,
                "active_queues": 0,
                "last_check": self._last_check_time.isoformat() if self._last_check_time else None
            }
            
            for router_id, router_client in self.router_manager.routers.items():
                router_status = {
                    "host": router_client.host,
                    "connected": False,
                    "queues": [],
                    "error": None
                }
                
                try:
                    if not router_client.is_connected():
                        if not router_client.connect():
                            router_status["error"] = "Failed to connect"
                            status["routers"][router_id] = router_status
                            continue
                    
                    router_status["connected"] = True
                    
                    # Get queue information
                    queues = router_client.get_queue_simple_rules()
                    router_status["queues"] = queues
                    
                    # Count reseller queues (those starting with "reseller_")
                    reseller_queues = [q for q in queues if q.get('name', '').startswith('reseller_')]
                    status["active_queues"] += len(reseller_queues)
                    
                except Exception as exc:
                    router_status["error"] = str(exc)
                    
                status["routers"][router_id] = router_status
            
            # Get total resellers from database
            client = get_client()
            resellers_result = client.table("resellers").select("id").execute()
            status["total_resellers"] = len(resellers_result.data)
            
            return status
            
        except Exception as exc:
            logger.error("Error getting router status: %s", exc)
            return {"error": str(exc)}

    def get_recent_updates(self, limit: int = 20) -> List[Dict]:
        """Get recent bandwidth update logs."""
        try:
            client = get_client()
            result = client.table("bandwidth_update_log").select("*").order("timestamp", desc=True).limit(limit).execute()
            return result.data
        except Exception as exc:
            logger.error("Error getting recent updates: %s", exc)
            return []

    def run_monitoring_cycle(self) -> None:
        """Run one monitoring cycle."""
        try:
            self._last_check_time = datetime.now()
            self.check_for_plan_changes()
            logger.debug("Bandwidth monitoring cycle completed at %s", self._last_check_time)
        except Exception as exc:
            logger.error("Error in bandwidth monitoring cycle: %s", exc)

    def run_forever(self) -> None:
        """Main loop - check for plan changes and update routers."""
        logger.info("Starting bandwidth manager service (check interval: %d seconds)", self.check_interval)
        
        while True:
            try:
                self.run_monitoring_cycle()
                time.sleep(self.check_interval)
                
            except KeyboardInterrupt:
                logger.info("Bandwidth manager stopped by user")
                break
            except Exception as exc:
                logger.error("Bandwidth manager error: %s", exc)
                time.sleep(self.check_interval)
        
        # Cleanup
        self.router_manager.disconnect_all()

    def update_router_credentials(self, router_id: str, host: str, username: str, password: str, port: int = 8728, use_ssl: bool = False) -> bool:
        """Update router credentials in database and reload configuration."""
        try:
            client = get_client()
            
            update_data = {
                "host": host,
                "username": username,
                "password": password,
                "port": port,
                "use_ssl": use_ssl,
                "updated_at": datetime.now().isoformat()
            }
            
            client.table("router_configs").update(update_data).eq("id", router_id).execute()
            
            # Reload router configurations
            self.router_manager._load_router_configs()
            
            logger.info("Updated router credentials for %s", router_id)
            return True
            
        except Exception as exc:
            logger.error("Error updating router credentials: %s", exc)
            return False


# Convenience functions for API usage
def create_bandwidth_manager(config: Dict) -> BandwidthManager:
    """Create a bandwidth manager instance."""
    return BandwidthManager(config)

def setup_new_reseller(reseller_id: str, target_ip: str, plan_mbps: int, config: Dict) -> bool:
    """Set up a new reseller on the router (convenience function)."""
    manager = BandwidthManager(config)
    return manager.setup_reseller_on_router(reseller_id, target_ip, plan_mbps)

def update_reseller_plan(reseller_id: str, new_plan_mbps: int, config: Dict) -> bool:
    """Update a reseller's bandwidth plan (convenience function)."""
    manager = BandwidthManager(config)
    return manager.router_manager.update_reseller_bandwidth(reseller_id, new_plan_mbps) 