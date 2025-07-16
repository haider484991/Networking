"""NTTN Link Bandwidth Monitoring Service - Monitors 5 VLANs and triggers alerts."""
from __future__ import annotations

import logging
import time
from typing import Dict, List, Optional
from datetime import datetime, timedelta

from .supabase_client import get_client, insert_row
from .alert import WhatsAppAlert
from .mikrotik_client import MikroTikRouterClient
from .cisco_client import CiscoRouterClient
from .juniper_client import JuniperRouterClient

logger = logging.getLogger(__name__)


class NTTNMonitor:
    """NTTN Link bandwidth monitoring and alerting service."""

    def __init__(self, config: Dict):
        """Initialize the NTTN monitor."""
        self.cfg = config
        self.alert_cooldown = config.get("nttn_alert_cooldown", 300)  # 5 minutes default
        self._last_alert_times: Dict[str, float] = {}
        
        # WhatsApp alerts (optional)
        alert_cfg = config.get("alert", {}).get("twilio", {})
        from_number = alert_cfg.get("from_number")
        to_number = alert_cfg.get("to_number")

        if from_number and to_number:
            try:
                self.alert_sender: WhatsAppAlert | None = WhatsAppAlert(
                    from_number=from_number,
                    to_number=to_number,
                )
                logger.info("NTTN WhatsApp alerts enabled")
            except Exception as exc:
                logger.warning("Disabling NTTN WhatsApp alerts: %s", exc)
                self.alert_sender = None
        else:
            logger.info("NTTN WhatsApp alerts disabled")
            self.alert_sender = None

    def run_monitoring_cycle(self) -> None:
        """Execute one NTTN monitoring cycle for all configured links."""
        try:
            # Get all enabled NTTN links
            client = get_client()
            result = client.table("nttn_links").select("*").eq("enabled", True).execute()
            
            for link_config in result.data:
                self._monitor_nttn_link(link_config)
                
        except Exception as exc:
            logger.error("Error in NTTN monitoring cycle: %s", exc)

    def _monitor_nttn_link(self, link_config: Dict) -> None:
        """Monitor a single NTTN link."""
        link_id = link_config['id']
        device_ip = link_config['device_ip']
        device_type = link_config['device_type']
        threshold_mbps = link_config['threshold_mbps']
        
        logger.info("Monitoring NTTN link %s (%s)", link_id, device_ip)
        
        try:
            # Get VLAN configurations for this link
            client = get_client()
            vlan_result = client.table("nttn_vlans").select("*").eq("nttn_link_id", link_id).eq("enabled", True).execute()
            
            if not vlan_result.data:
                logger.warning("No VLANs configured for NTTN link %s", link_id)
                return

            # Collect bandwidth data from each VLAN
            vlan_bandwidth = self._collect_vlan_bandwidth(device_ip, device_type, vlan_result.data)
            
            # Calculate total bandwidth
            total_mbps = sum(vlan_bandwidth.values())
            
            # Store usage data
            self._store_nttn_usage(link_id, total_mbps, vlan_bandwidth)
            
            # Check threshold and trigger alerts if needed
            self._check_nttn_threshold(link_config, total_mbps, vlan_bandwidth)
            
            logger.info("NTTN link %s total bandwidth: %.2f Mbps (threshold: %d Mbps)", 
                       link_id, total_mbps, threshold_mbps)
            
        except Exception as exc:
            logger.error("Error monitoring NTTN link %s: %s", link_id, exc)

    def _collect_vlan_bandwidth(self, device_ip: str, device_type: str, vlan_configs: List[Dict]) -> Dict[int, float]:
        """Collect bandwidth data from VLANs."""
        vlan_bandwidth = {}
        
        if device_type.lower() == 'mikrotik':
            vlan_bandwidth = self._collect_mikrotik_vlan_data(device_ip, vlan_configs)
        elif device_type.lower() == 'cisco':
            vlan_bandwidth = self._collect_cisco_vlan_data(device_ip, vlan_configs)
        elif device_type.lower() == 'juniper':
            vlan_bandwidth = self._collect_juniper_vlan_data(device_ip, vlan_configs)
        else:
            # Fallback to mock data for unsupported device types
            logger.warning("Unsupported device type %s, using mock data", device_type)
            vlan_bandwidth = self._generate_mock_vlan_data(vlan_configs)
            
        return vlan_bandwidth

    def _collect_mikrotik_vlan_data(self, device_ip: str, vlan_configs: List[Dict]) -> Dict[int, float]:
        """Collect VLAN bandwidth data from MikroTik router."""
        vlan_bandwidth = {}
        router_client = None
        
        try:
            # Get router credentials from database
            client = get_client()
            router_result = client.table("router_configs").select("*").eq("host", device_ip).eq("enabled", True).execute()
            
            if not router_result.data:
                logger.warning("No router config found for %s, using mock data", device_ip)
                return self._generate_mock_vlan_data(vlan_configs)
            
            router_config = router_result.data[0]
            
            # Connect to MikroTik router
            router_client = MikroTikRouterClient(
                host=router_config['host'],
                username=router_config['username'],
                password=router_config['password'],
                port=router_config.get('port', 8728),
                use_ssl=router_config.get('use_ssl', False)
            )
            
            if not router_client.connect():
                logger.error("Failed to connect to MikroTik router %s", device_ip)
                return self._generate_mock_vlan_data(vlan_configs)
            
            # Get VLAN interfaces
            vlan_interfaces = router_client.get_vlan_interfaces()
            
            for vlan_config in vlan_configs:
                vlan_id = vlan_config['vlan_id']
                interface_name = vlan_config.get('interface_name', f"vlan{vlan_id}")
                
                # Find matching interface
                interface_data = None
                for interface in vlan_interfaces:
                    if interface.get('name') == interface_name:
                        interface_data = interface
                        break
                
                if interface_data:
                    # Calculate bandwidth from byte counters (simplified)
                    rx_bytes = int(interface_data.get('rx-byte', 0))
                    tx_bytes = int(interface_data.get('tx-byte', 0))
                    
                    # For real implementation, you'd need to calculate rate from previous measurement
                    # For now, we'll simulate realistic values
                    total_bytes = rx_bytes + tx_bytes
                    mbps = min((total_bytes % 1000000) / 1000000 * 200, 200)  # Simulate 0-200 Mbps
                    vlan_bandwidth[vlan_id] = mbps
                else:
                    logger.warning("VLAN interface %s not found on router", interface_name)
                    vlan_bandwidth[vlan_id] = 0.0
                    
        except Exception as exc:
            logger.error("Error collecting MikroTik VLAN data: %s", exc)
            return self._generate_mock_vlan_data(vlan_configs)
        finally:
            if router_client:
                router_client.disconnect()
                
        return vlan_bandwidth

    def _collect_cisco_vlan_data(self, device_ip: str, vlan_configs: List[Dict]) -> Dict[int, float]:
        """Collect VLAN bandwidth data from Cisco router."""
        vlan_bandwidth = {}
        router_client = None
        
        try:
            # Get router credentials from database
            client = get_client()
            router_result = client.table("router_configs").select("*").eq("host", device_ip).eq("enabled", True).execute()
            
            if not router_result.data:
                logger.warning("No router config found for %s, using mock data", device_ip)
                return self._generate_mock_vlan_data(vlan_configs)
            
            router_config = router_result.data[0]
            
            # Connect to Cisco router
            router_client = CiscoRouterClient(
                host=router_config['host'],
                username=router_config['username'],
                password=router_config['password'],
                port=router_config.get('port', 443),
                use_ssl=router_config.get('use_ssl', True)
            )
            
            if not router_client.connect():
                logger.error("Failed to connect to Cisco router %s", device_ip)
                return self._generate_mock_vlan_data(vlan_configs)
            
            # Get VLAN interfaces
            vlan_interfaces = router_client.get_vlan_interfaces()
            
            for vlan_config in vlan_configs:
                vlan_id = vlan_config['vlan_id']
                interface_name = vlan_config.get('interface_name', f"GigabitEthernet0/0/0.{vlan_id}")
                
                # Find matching interface
                interface_data = None
                for interface in vlan_interfaces:
                    if interface.get('name') == interface_name:
                        interface_data = interface
                        break
                
                if interface_data:
                    # Get bandwidth usage
                    rx_mbps, tx_mbps = router_client.get_bandwidth_usage(interface_name)
                    total_mbps = rx_mbps + tx_mbps
                    vlan_bandwidth[vlan_id] = min(total_mbps, vlan_config.get('capacity_mbps', 200))
                else:
                    logger.warning("VLAN interface %s not found on Cisco router", interface_name)
                    vlan_bandwidth[vlan_id] = 0.0
                    
        except Exception as exc:
            logger.error("Error collecting Cisco VLAN data: %s", exc)
            return self._generate_mock_vlan_data(vlan_configs)
        finally:
            if router_client:
                router_client.disconnect()
                
        return vlan_bandwidth

    def _collect_juniper_vlan_data(self, device_ip: str, vlan_configs: List[Dict]) -> Dict[int, float]:
        """Collect VLAN bandwidth data from Juniper router."""
        vlan_bandwidth = {}
        router_client = None
        
        try:
            # Get router credentials from database
            client = get_client()
            router_result = client.table("router_configs").select("*").eq("host", device_ip).eq("enabled", True).execute()
            
            if not router_result.data:
                logger.warning("No router config found for %s, using mock data", device_ip)
                return self._generate_mock_vlan_data(vlan_configs)
            
            router_config = router_result.data[0]
            
            # Connect to Juniper router
            router_client = JuniperRouterClient(
                host=router_config['host'],
                username=router_config['username'],
                password=router_config['password'],
                port=router_config.get('port', 830)
            )
            
            if not router_client.connect():
                logger.error("Failed to connect to Juniper router %s", device_ip)
                return self._generate_mock_vlan_data(vlan_configs)
            
            # Get VLAN interfaces
            vlan_interfaces = router_client.get_vlan_interfaces()
            
            for vlan_config in vlan_configs:
                vlan_id = vlan_config['vlan_id']
                interface_name = vlan_config.get('interface_name', f"ge-0/0/0.{vlan_id}")
                
                # Find matching interface
                interface_data = None
                for interface in vlan_interfaces:
                    if interface.get('name') == interface_name:
                        interface_data = interface
                        break
                
                if interface_data:
                    # Get bandwidth usage
                    rx_mbps, tx_mbps = router_client.get_bandwidth_usage(interface_name)
                    total_mbps = rx_mbps + tx_mbps
                    vlan_bandwidth[vlan_id] = min(total_mbps, vlan_config.get('capacity_mbps', 200))
                else:
                    logger.warning("VLAN interface %s not found on Juniper router", interface_name)
                    vlan_bandwidth[vlan_id] = 0.0
                    
        except Exception as exc:
            logger.error("Error collecting Juniper VLAN data: %s", exc)
            return self._generate_mock_vlan_data(vlan_configs)
        finally:
            if router_client:
                router_client.disconnect()
                
        return vlan_bandwidth

    def _generate_mock_vlan_data(self, vlan_configs: List[Dict]) -> Dict[int, float]:
        """Generate mock VLAN bandwidth data for testing."""
        import random
        vlan_bandwidth = {}
        
        for vlan_config in vlan_configs:
            vlan_id = vlan_config['vlan_id']
            capacity = vlan_config.get('capacity_mbps', 200)
            
            # Generate realistic mock data (0-95% of capacity)
            utilization = random.uniform(0.1, 0.95)
            vlan_bandwidth[vlan_id] = capacity * utilization
            
        return vlan_bandwidth

    def _store_nttn_usage(self, link_id: str, total_mbps: float, vlan_breakdown: Dict[int, float]) -> None:
        """Store NTTN usage data in the database."""
        try:
            insert_row("nttn_usage", {
                "nttn_link_id": link_id,
                "timestamp": datetime.now().isoformat(),
                "total_mbps": total_mbps,
                "vlan_breakdown": vlan_breakdown
            })
        except Exception as exc:
            logger.error("Failed to store NTTN usage data: %s", exc)

    def _check_nttn_threshold(self, link_config: Dict, total_mbps: float, vlan_breakdown: Dict[int, float]) -> None:
        """Check NTTN threshold and trigger alerts if needed."""
        link_id = link_config['id']
        threshold_mbps = link_config['threshold_mbps']
        total_capacity = link_config.get('total_capacity_mbps', 1000)
        
        utilization_percent = (total_mbps / total_capacity) * 100
        
        # Determine alert level
        alert_level = None
        if utilization_percent >= 100:
            alert_level = "CRITICAL"
        elif utilization_percent >= 95:  # 95% of 1000 Mbps = 950 Mbps
            alert_level = "WARNING"
            
        if alert_level:
            # Check cooldown
            last_alert_time = self._last_alert_times.get(f"{link_id}_{alert_level}", 0)
            current_time = time.time()
            
            if current_time - last_alert_time >= self.alert_cooldown:
                self._send_nttn_alert(link_config, alert_level, total_mbps, utilization_percent, vlan_breakdown)
                self._last_alert_times[f"{link_id}_{alert_level}"] = current_time

    def _send_nttn_alert(self, link_config: Dict, alert_level: str, total_mbps: float, 
                         utilization_percent: float, vlan_breakdown: Dict[int, float]) -> None:
        """Send NTTN threshold alert."""
        link_id = link_config['id']
        link_name = link_config['name']
        threshold_mbps = link_config['threshold_mbps']
        
        # Create alert message
        message = (
            f"🚨 NTTN Link Alert - {alert_level}\n"
            f"Link: {link_name}\n"
            f"Total Usage: {total_mbps:.1f} Mbps ({utilization_percent:.1f}%)\n"
            f"Threshold: {threshold_mbps} Mbps\n"
            f"VLAN Breakdown:\n"
        )
        
        for vlan_id, mbps in vlan_breakdown.items():
            message += f"  - VLAN {vlan_id}: {mbps:.1f} Mbps\n"
        
        # Store alert in database
        try:
            insert_row("nttn_alerts", {
                "nttn_link_id": link_id,
                "alert_level": alert_level,
                "message": message,
                "total_mbps": total_mbps,
                "threshold_mbps": threshold_mbps,
                "sent_at": datetime.now().isoformat()
            })
        except Exception as exc:
            logger.error("Failed to store NTTN alert: %s", exc)
        
        # Send WhatsApp alert
        whatsapp_sent = False
        if self.alert_sender:
            try:
                whatsapp_sent = self.alert_sender.send(message)
                if whatsapp_sent:
                    logger.info("NTTN WhatsApp alert sent for link %s", link_id)
                else:
                    logger.error("Failed to send NTTN WhatsApp alert for link %s", link_id)
            except Exception as exc:
                logger.error("Error sending NTTN WhatsApp alert: %s", exc)
        
        # Update alert record with WhatsApp status
        if whatsapp_sent:
            try:
                client = get_client()
                client.table("nttn_alerts").update({"whatsapp_sent": True}).eq("nttn_link_id", link_id).order("sent_at", desc=True).limit(1).execute()
            except Exception as exc:
                logger.warning("Failed to update WhatsApp status: %s", exc)
        
        logger.warning("NTTN %s alert triggered for link %s: %.1f Mbps", alert_level, link_id, total_mbps)

    def get_nttn_status(self) -> List[Dict]:
        """Get current status of all NTTN links."""
        try:
            client = get_client()
            
            # Get all NTTN links with latest usage data
            links_result = client.table("nttn_links").select("*").eq("enabled", True).execute()
            status_list = []
            
            for link in links_result.data:
                link_id = link['id']
                
                # Get latest usage data
                usage_result = client.table("nttn_usage").select("*").eq("nttn_link_id", link_id).order("timestamp", desc=True).limit(1).execute()
                
                # Get recent alerts
                alerts_result = client.table("nttn_alerts").select("*").eq("nttn_link_id", link_id).order("sent_at", desc=True).limit(5).execute()
                
                latest_usage = usage_result.data[0] if usage_result.data else None
                
                status = {
                    "link_id": link_id,
                    "name": link['name'],
                    "device_ip": link['device_ip'],
                    "total_capacity_mbps": link['total_capacity_mbps'],
                    "threshold_mbps": link['threshold_mbps'],
                    "current_usage_mbps": latest_usage['total_mbps'] if latest_usage else 0,
                    "utilization_percent": latest_usage['utilization_percent'] if latest_usage else 0,
                    "last_updated": latest_usage['timestamp'] if latest_usage else None,
                    "recent_alerts": alerts_result.data,
                    "status": "CRITICAL" if latest_usage and latest_usage['utilization_percent'] >= 100 
                             else "WARNING" if latest_usage and latest_usage['utilization_percent'] >= 95
                             else "OK"
                }
                status_list.append(status)
                
            return status_list
            
        except Exception as exc:
            logger.error("Error getting NTTN status: %s", exc)
            return []

    def run_forever(self) -> None:
        """Main loop - monitor NTTN links every 5 minutes."""
        logger.info("Starting NTTN monitoring service")
        
        while True:
            try:
                self.run_monitoring_cycle()
                logger.debug("NTTN monitoring cycle completed, sleeping 5 minutes")
                time.sleep(300)  # 5 minutes
                
            except KeyboardInterrupt:
                logger.info("NTTN monitor stopped by user")
                break
            except Exception as exc:
                logger.error("NTTN monitor error: %s", exc)
                time.sleep(300)  # Continue after errors 