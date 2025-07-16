"""Cisco Router Client for RESTCONF/NETCONF API integration."""
from __future__ import annotations

import logging
import requests
from typing import Dict, List, Optional, Tuple
import json

logger = logging.getLogger(__name__)


class CiscoRouterClient:
    """Client for managing Cisco routers via RESTCONF API."""

    def __init__(self, host: str, username: str, password: str, port: int = 443, use_ssl: bool = True):
        """Initialize Cisco router client."""
        self.host = host
        self.username = username
        self.password = password
        self.port = port
        self.use_ssl = use_ssl
        self.base_url = f"{'https' if use_ssl else 'http'}://{host}:{port}/restconf"
        self.session = None
        self._connected = False

    def connect(self) -> bool:
        """Connect to Cisco router via RESTCONF."""
        try:
            self.session = requests.Session()
            self.session.auth = (self.username, self.password)
            self.session.headers.update({
                'Accept': 'application/yang-data+json',
                'Content-Type': 'application/yang-data+json'
            })
            
            # Disable SSL warnings for self-signed certificates
            requests.packages.urllib3.disable_warnings()
            self.session.verify = False
            
            # Test connection
            response = self.session.get(f"{self.base_url}/data/ietf-interfaces:interfaces")
            
            if response.status_code == 200:
                self._connected = True
                logger.info("Connected to Cisco router %s", self.host)
                return True
            else:
                logger.error("Failed to connect to Cisco router %s: HTTP %d", self.host, response.status_code)
                return False
                
        except Exception as exc:
            logger.error("Error connecting to Cisco router %s: %s", self.host, exc)
            return False

    def disconnect(self) -> None:
        """Disconnect from Cisco router."""
        if self.session:
            self.session.close()
        self._connected = False
        logger.info("Disconnected from Cisco router %s", self.host)

    def is_connected(self) -> bool:
        """Check if connected to router."""
        return self._connected

    def get_interface_statistics(self, interface_name: str) -> Optional[Dict]:
        """Get interface statistics from Cisco router."""
        if not self._connected:
            logger.error("Not connected to router")
            return None

        try:
            url = f"{self.base_url}/data/ietf-interfaces:interfaces/interface={interface_name}/ietf-interfaces:statistics"
            response = self.session.get(url)
            
            if response.status_code == 200:
                return response.json()
            else:
                logger.error("Failed to get interface stats for %s: HTTP %d", interface_name, response.status_code)
                return None
                
        except Exception as exc:
            logger.error("Error getting interface statistics: %s", exc)
            return None

    def get_vlan_interfaces(self) -> List[Dict]:
        """Get VLAN interface information."""
        if not self._connected:
            logger.error("Not connected to router")
            return []

        try:
            url = f"{self.base_url}/data/ietf-interfaces:interfaces"
            response = self.session.get(url)
            
            if response.status_code == 200:
                data = response.json()
                interfaces = data.get('ietf-interfaces:interfaces', {}).get('interface', [])
                
                # Filter VLAN interfaces
                vlan_interfaces = []
                for interface in interfaces:
                    if 'vlan' in interface.get('name', '').lower():
                        vlan_interfaces.append(interface)
                
                return vlan_interfaces
            else:
                logger.error("Failed to get interfaces: HTTP %d", response.status_code)
                return []
                
        except Exception as exc:
            logger.error("Error getting VLAN interfaces: %s", exc)
            return []

    def create_bandwidth_limit(self, reseller_id: str, target_ip: str, download_mbps: int, upload_mbps: int) -> bool:
        """Create bandwidth limit using Cisco QoS policy (placeholder implementation)."""
        logger.warning("Cisco bandwidth limit creation not fully implemented - would create QoS policy for %s", target_ip)
        
        # In a real implementation, this would:
        # 1. Create a class-map to match traffic for target_ip
        # 2. Create a policy-map with bandwidth limits
        # 3. Apply the policy to the appropriate interface
        
        # For now, return True to simulate success
        return True

    def update_bandwidth_limit(self, reseller_id: str, new_download_mbps: int, new_upload_mbps: int) -> bool:
        """Update existing bandwidth limit (placeholder implementation)."""
        logger.warning("Cisco bandwidth limit update not fully implemented for reseller %s", reseller_id)
        return True

    def remove_bandwidth_limit(self, reseller_id: str) -> bool:
        """Remove bandwidth limit (placeholder implementation)."""
        logger.warning("Cisco bandwidth limit removal not fully implemented for reseller %s", reseller_id)
        return True

    def get_bandwidth_usage(self, interface_name: str) -> Tuple[float, float]:
        """Get current bandwidth usage for an interface."""
        stats = self.get_interface_statistics(interface_name)
        if not stats:
            return 0.0, 0.0

        try:
            # Extract byte counters (this is simplified - real implementation would calculate rates)
            in_octets = stats.get('in-octets', 0)
            out_octets = stats.get('out-octets', 0)
            
            # Convert to Mbps (simplified calculation)
            # In real implementation, you'd need to calculate rate from previous measurement
            rx_mbps = (in_octets % 1000000) / 125000  # Rough simulation
            tx_mbps = (out_octets % 1000000) / 125000
            
            return rx_mbps, tx_mbps
            
        except Exception as exc:
            logger.error("Error calculating bandwidth usage: %s", exc)
            return 0.0, 0.0