"""Juniper Router Client for NETCONF/PyEZ integration."""
from __future__ import annotations

import logging
from typing import Dict, List, Optional, Tuple

logger = logging.getLogger(__name__)

try:
    from jnpr.junos import Device
    from jnpr.junos.utils.config import Config
    from jnpr.junos.exception import ConnectError, ConfigLoadError, CommitError
    JUNIPER_AVAILABLE = True
except ImportError:
    logger.warning("Juniper PyEZ library not available. Install with: pip install junos-eznc")
    JUNIPER_AVAILABLE = False


class JuniperRouterClient:
    """Client for managing Juniper routers via NETCONF/PyEZ."""

    def __init__(self, host: str, username: str, password: str, port: int = 830):
        """Initialize Juniper router client."""
        self.host = host
        self.username = username
        self.password = password
        self.port = port
        self.device = None
        self.config = None
        self._connected = False

        if not JUNIPER_AVAILABLE:
            logger.error("Juniper PyEZ library not available")

    def connect(self) -> bool:
        """Connect to Juniper router via NETCONF."""
        if not JUNIPER_AVAILABLE:
            logger.error("Cannot connect - Juniper PyEZ library not available")
            return False

        try:
            self.device = Device(
                host=self.host,
                user=self.username,
                password=self.password,
                port=self.port
            )
            
            self.device.open()
            self.config = Config(self.device)
            self._connected = True
            
            logger.info("Connected to Juniper router %s", self.host)
            return True
            
        except ConnectError as exc:
            logger.error("Failed to connect to Juniper router %s: %s", self.host, exc)
            return False
        except Exception as exc:
            logger.error("Error connecting to Juniper router %s: %s", self.host, exc)
            return False

    def disconnect(self) -> None:
        """Disconnect from Juniper router."""
        if self.device:
            try:
                self.device.close()
            except Exception as exc:
                logger.warning("Error closing Juniper connection: %s", exc)
        
        self._connected = False
        logger.info("Disconnected from Juniper router %s", self.host)

    def is_connected(self) -> bool:
        """Check if connected to router."""
        return self._connected and self.device and self.device.connected

    def get_interface_statistics(self, interface_name: str) -> Optional[Dict]:
        """Get interface statistics from Juniper router."""
        if not self.is_connected():
            logger.error("Not connected to router")
            return None

        try:
            # Get interface statistics using PyEZ
            stats = self.device.rpc.get_interface_information(
                interface_name=interface_name,
                extensive=True
            )
            
            # Parse XML response (simplified)
            interface_info = {}
            for interface in stats.xpath('.//physical-interface'):
                name = interface.findtext('name')
                if name == interface_name:
                    traffic_stats = interface.find('traffic-statistics')
                    if traffic_stats is not None:
                        interface_info = {
                            'input-bytes': int(traffic_stats.findtext('input-bytes', 0)),
                            'output-bytes': int(traffic_stats.findtext('output-bytes', 0)),
                            'input-packets': int(traffic_stats.findtext('input-packets', 0)),
                            'output-packets': int(traffic_stats.findtext('output-packets', 0))
                        }
                    break
            
            return interface_info if interface_info else None
            
        except Exception as exc:
            logger.error("Error getting interface statistics: %s", exc)
            return None

    def get_vlan_interfaces(self) -> List[Dict]:
        """Get VLAN interface information."""
        if not self.is_connected():
            logger.error("Not connected to router")
            return []

        try:
            # Get all logical interfaces
            interfaces = self.device.rpc.get_interface_information(logical_interface=True)
            
            vlan_interfaces = []
            for interface in interfaces.xpath('.//logical-interface'):
                name = interface.findtext('name')
                if name and ('vlan' in name.lower() or '.' in name):  # VLAN interfaces often have dots
                    interface_info = {
                        'name': name,
                        'admin-status': interface.findtext('admin-status'),
                        'oper-status': interface.findtext('oper-status')
                    }
                    
                    # Get traffic statistics if available
                    traffic_stats = interface.find('traffic-statistics')
                    if traffic_stats is not None:
                        interface_info.update({
                            'input-bytes': int(traffic_stats.findtext('input-bytes', 0)),
                            'output-bytes': int(traffic_stats.findtext('output-bytes', 0))
                        })
                    
                    vlan_interfaces.append(interface_info)
            
            return vlan_interfaces
            
        except Exception as exc:
            logger.error("Error getting VLAN interfaces: %s", exc)
            return []

    def create_bandwidth_limit(self, reseller_id: str, target_ip: str, download_mbps: int, upload_mbps: int) -> bool:
        """Create bandwidth limit using Juniper firewall filter and policer."""
        if not self.is_connected():
            logger.error("Not connected to router")
            return False

        try:
            # Create policer configuration
            policer_config = f"""
            firewall {{
                policer reseller-{reseller_id}-policer {{
                    if-exceeding {{
                        bandwidth-limit {download_mbps}m;
                        burst-size-limit 1m;
                    }}
                    then discard;
                }}
            }}
            """
            
            # Create firewall filter
            filter_config = f"""
            firewall {{
                filter reseller-{reseller_id}-filter {{
                    term limit-bandwidth {{
                        from {{
                            source-address {target_ip}/32;
                        }}
                        then {{
                            policer reseller-{reseller_id}-policer;
                            accept;
                        }}
                    }}
                    term default {{
                        then accept;
                    }}
                }}
            }}
            """
            
            # Load and commit configuration
            self.config.load(policer_config, format='text')
            self.config.load(filter_config, format='text')
            self.config.commit()
            
            logger.info("Created bandwidth limit for reseller %s (%s) - %d Mbps", 
                       reseller_id, target_ip, download_mbps)
            return True
            
        except (ConfigLoadError, CommitError) as exc:
            logger.error("Error creating bandwidth limit: %s", exc)
            return False
        except Exception as exc:
            logger.error("Unexpected error creating bandwidth limit: %s", exc)
            return False

    def update_bandwidth_limit(self, reseller_id: str, new_download_mbps: int, new_upload_mbps: int) -> bool:
        """Update existing bandwidth limit."""
        if not self.is_connected():
            logger.error("Not connected to router")
            return False

        try:
            # Update policer bandwidth
            update_config = f"""
            firewall {{
                policer reseller-{reseller_id}-policer {{
                    if-exceeding {{
                        bandwidth-limit {new_download_mbps}m;
                    }}
                }}
            }}
            """
            
            self.config.load(update_config, format='text')
            self.config.commit()
            
            logger.info("Updated bandwidth limit for reseller %s to %d Mbps", 
                       reseller_id, new_download_mbps)
            return True
            
        except (ConfigLoadError, CommitError) as exc:
            logger.error("Error updating bandwidth limit: %s", exc)
            return False
        except Exception as exc:
            logger.error("Unexpected error updating bandwidth limit: %s", exc)
            return False

    def remove_bandwidth_limit(self, reseller_id: str) -> bool:
        """Remove bandwidth limit."""
        if not self.is_connected():
            logger.error("Not connected to router")
            return False

        try:
            # Remove policer and filter
            remove_config = f"""
            delete firewall policer reseller-{reseller_id}-policer
            delete firewall filter reseller-{reseller_id}-filter
            """
            
            self.config.load(remove_config, format='text')
            self.config.commit()
            
            logger.info("Removed bandwidth limit for reseller %s", reseller_id)
            return True
            
        except (ConfigLoadError, CommitError) as exc:
            logger.error("Error removing bandwidth limit: %s", exc)
            return False
        except Exception as exc:
            logger.error("Unexpected error removing bandwidth limit: %s", exc)
            return False

    def get_bandwidth_usage(self, interface_name: str) -> Tuple[float, float]:
        """Get current bandwidth usage for an interface."""
        stats = self.get_interface_statistics(interface_name)
        if not stats:
            return 0.0, 0.0

        try:
            # Convert bytes to Mbps (simplified calculation)
            # In real implementation, you'd need to calculate rate from previous measurement
            input_bytes = stats.get('input-bytes', 0)
            output_bytes = stats.get('output-bytes', 0)
            
            rx_mbps = (input_bytes % 1000000) / 125000  # Rough simulation
            tx_mbps = (output_bytes % 1000000) / 125000
            
            return rx_mbps, tx_mbps
            
        except Exception as exc:
            logger.error("Error calculating bandwidth usage: %s", exc)
            return 0.0, 0.0