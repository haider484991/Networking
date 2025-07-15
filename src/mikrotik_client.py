"""MikroTik RouterOS API client for automated bandwidth limit management."""
from __future__ import annotations

import logging
import time
from typing import Dict, List, Optional, Any
from datetime import datetime

import librouteros
from librouteros.exceptions import TrapError
from .supabase_client import get_client, insert_row

logger = logging.getLogger(__name__)


class MikroTikRouterClient:
    """MikroTik RouterOS API client for managing bandwidth limits."""

    def __init__(self, host: str, username: str, password: str, port: int = 8728, use_ssl: bool = False):
        """Initialize the RouterOS API client."""
        self.host = host
        self.username = username
        self.password = password
        self.port = port
        self.use_ssl = use_ssl
        self.api_connection = None
        self._connected = False

    def connect(self) -> bool:
        """Establish connection to the RouterOS device."""
        try:
            if self.use_ssl:
                self.api_connection = librouteros.connect(
                    host=self.host,
                    username=self.username,
                    password=self.password,
                    port=self.port,
                    ssl_wrapper=True
                )
            else:
                self.api_connection = librouteros.connect(
                    host=self.host,
                    username=self.username,
                    password=self.password,
                    port=self.port
                )
            self._connected = True
            logger.info("Successfully connected to MikroTik router at %s", self.host)
            return True
        except Exception as exc:
            logger.error("Failed to connect to MikroTik router %s: %s", self.host, exc)
            self._connected = False
            return False

    def disconnect(self) -> None:
        """Close the connection to the RouterOS device."""
        if self.api_connection:
            try:
                self.api_connection.close()
                self._connected = False
                logger.info("Disconnected from MikroTik router at %s", self.host)
            except Exception as exc:
                logger.warning("Error disconnecting from router: %s", exc)

    def is_connected(self) -> bool:
        """Check if connection is established."""
        return self._connected and self.api_connection is not None

    def execute_command(self, command: str, arguments: Optional[Dict[str, Any]] = None) -> List[Dict]:
        """Execute a RouterOS API command."""
        if not self.is_connected():
            raise ConnectionError("Not connected to router. Call connect() first.")

        try:
            if arguments:
                # Convert arguments to the format expected by librouteros
                args = [f"={key}={value}" for key, value in arguments.items()]
                result = self.api_connection.path(command)(*args)
            else:
                result = self.api_connection.path(command).select('*')

            # Convert generator to list for easier handling
            return list(result)
        except TrapError as exc:
            logger.error("RouterOS API command failed: %s", exc)
            raise
        except Exception as exc:
            logger.error("Unexpected error executing RouterOS command: %s", exc)
            raise

    def get_queue_simple_rules(self) -> List[Dict]:
        """Get all Simple Queue rules."""
        try:
            return self.execute_command('queue/simple')
        except Exception as exc:
            logger.error("Failed to get Simple Queue rules: %s", exc)
            return []

    def find_queue_by_name(self, queue_name: str) -> Optional[Dict]:
        """Find a Simple Queue rule by name."""
        queues = self.get_queue_simple_rules()
        for queue in queues:
            if queue.get('name') == queue_name:
                return queue
        return None

    def find_queue_by_target(self, target_ip: str) -> Optional[Dict]:
        """Find a Simple Queue rule by target IP address."""
        queues = self.get_queue_simple_rules()
        for queue in queues:
            target = queue.get('target', '')
            # Target format is usually "192.168.1.100/32" or just "192.168.1.100"
            if target_ip in target:
                return queue
        return None

    def create_bandwidth_limit(self, reseller_id: str, target_ip: str, max_limit_up: int, max_limit_down: int, priority: int = 8) -> bool:
        """Create a new Simple Queue rule for bandwidth limiting."""
        try:
            queue_name = f"reseller_{reseller_id}"
            
            # Check if queue already exists
            existing_queue = self.find_queue_by_name(queue_name)
            if existing_queue:
                logger.warning("Queue %s already exists, updating instead", queue_name)
                return self.update_bandwidth_limit(reseller_id, max_limit_up, max_limit_down)

            # Create new queue rule
            arguments = {
                'name': queue_name,
                'target': f"{target_ip}/32",
                'max-limit': f"{max_limit_up}M/{max_limit_down}M",
                'priority': str(priority),
                'comment': f"Auto-created for reseller {reseller_id}"
            }

            self.execute_command('queue/simple/add', arguments)
            
            # Log the action
            self._log_router_action("CREATE_QUEUE", reseller_id, f"Created bandwidth limit: {max_limit_up}M/{max_limit_down}M for {target_ip}")
            
            logger.info("Created bandwidth limit for reseller %s: %sM/%sM", reseller_id, max_limit_up, max_limit_down)
            return True

        except Exception as exc:
            logger.error("Failed to create bandwidth limit for reseller %s: %s", reseller_id, exc)
            self._log_router_action("CREATE_QUEUE_ERROR", reseller_id, f"Failed to create queue: {exc}")
            return False

    def update_bandwidth_limit(self, reseller_id: str, max_limit_up: int, max_limit_down: int) -> bool:
        """Update an existing Simple Queue rule's bandwidth limits."""
        try:
            queue_name = f"reseller_{reseller_id}"
            
            # Find existing queue
            existing_queue = self.find_queue_by_name(queue_name)
            if not existing_queue:
                logger.error("Queue %s not found, cannot update", queue_name)
                return False

            queue_id = existing_queue.get('.id')
            if not queue_id:
                logger.error("Queue ID not found for %s", queue_name)
                return False

            # Update the max-limit
            arguments = {
                '.id': queue_id,
                'max-limit': f"{max_limit_up}M/{max_limit_down}M"
            }

            self.execute_command('queue/simple/set', arguments)
            
            # Log the action
            old_limit = existing_queue.get('max-limit', 'unknown')
            self._log_router_action("UPDATE_QUEUE", reseller_id, f"Updated bandwidth limit from {old_limit} to {max_limit_up}M/{max_limit_down}M")
            
            logger.info("Updated bandwidth limit for reseller %s: %sM/%sM", reseller_id, max_limit_up, max_limit_down)
            return True

        except Exception as exc:
            logger.error("Failed to update bandwidth limit for reseller %s: %s", reseller_id, exc)
            self._log_router_action("UPDATE_QUEUE_ERROR", reseller_id, f"Failed to update queue: {exc}")
            return False

    def remove_bandwidth_limit(self, reseller_id: str) -> bool:
        """Remove a Simple Queue rule for a reseller."""
        try:
            queue_name = f"reseller_{reseller_id}"
            
            # Find existing queue
            existing_queue = self.find_queue_by_name(queue_name)
            if not existing_queue:
                logger.warning("Queue %s not found, nothing to remove", queue_name)
                return True  # Consider this successful since the goal is achieved

            queue_id = existing_queue.get('.id')
            if not queue_id:
                logger.error("Queue ID not found for %s", queue_name)
                return False

            # Remove the queue
            arguments = {'.id': queue_id}
            self.execute_command('queue/simple/remove', arguments)
            
            # Log the action
            self._log_router_action("REMOVE_QUEUE", reseller_id, f"Removed bandwidth limit queue")
            
            logger.info("Removed bandwidth limit for reseller %s", reseller_id)
            return True

        except Exception as exc:
            logger.error("Failed to remove bandwidth limit for reseller %s: %s", reseller_id, exc)
            self._log_router_action("REMOVE_QUEUE_ERROR", reseller_id, f"Failed to remove queue: {exc}")
            return False

    def get_interface_traffic(self, interface_name: str) -> Optional[Dict]:
        """Get traffic statistics for a specific interface."""
        try:
            interfaces = self.execute_command('interface')
            for interface in interfaces:
                if interface.get('name') == interface_name:
                    return interface
            return None
        except Exception as exc:
            logger.error("Failed to get interface traffic for %s: %s", interface_name, exc)
            return None

    def get_vlan_interfaces(self) -> List[Dict]:
        """Get all VLAN interfaces."""
        try:
            return self.execute_command('interface/vlan')
        except Exception as exc:
            logger.error("Failed to get VLAN interfaces: %s", exc)
            return []

    def _log_router_action(self, action: str, reseller_id: str, details: str) -> None:
        """Log router actions to the database."""
        try:
            insert_row("router_actions", {
                "router_ip": self.host,
                "action": action,
                "reseller_id": reseller_id,
                "details": details,
                "timestamp": datetime.now().isoformat()
            })
        except Exception as exc:
            logger.warning("Failed to log router action to database: %s", exc)


class RouterManager:
    """High-level manager for router operations across multiple routers."""

    def __init__(self):
        """Initialize the router manager."""
        self.routers: Dict[str, MikroTikRouterClient] = {}
        self._load_router_configs()

    def _load_router_configs(self) -> None:
        """Load router configurations from database."""
        try:
            client = get_client()
            result = client.table("router_configs").select("*").eq("enabled", True).execute()
            
            for config in result.data:
                router_id = config['id']
                router_client = MikroTikRouterClient(
                    host=config['host'],
                    username=config['username'],
                    password=config['password'],
                    port=config.get('port', 8728),
                    use_ssl=config.get('use_ssl', False)
                )
                self.routers[router_id] = router_client
                logger.info("Loaded router config: %s (%s)", router_id, config['host'])
                
        except Exception as exc:
            logger.warning("Failed to load router configs from database: %s", exc)

    def get_router(self, router_id: str) -> Optional[MikroTikRouterClient]:
        """Get a router client by ID."""
        return self.routers.get(router_id)

    def update_reseller_bandwidth(self, reseller_id: str, new_plan_mbps: int) -> bool:
        """Update bandwidth limits for a reseller across all configured routers."""
        try:
            # Get reseller router mapping from database
            client = get_client()
            result = client.table("reseller_router_mapping").select("*").eq("reseller_id", reseller_id).execute()
            
            if not result.data:
                logger.warning("No router mapping found for reseller %s", reseller_id)
                return False

            success_count = 0
            total_count = len(result.data)

            for mapping in result.data:
                router_id = mapping['router_id']
                target_ip = mapping['target_ip']
                
                router_client = self.get_router(router_id)
                if not router_client:
                    logger.error("Router %s not found in configuration", router_id)
                    continue

                if not router_client.is_connected():
                    if not router_client.connect():
                        logger.error("Failed to connect to router %s", router_id)
                        continue

                # Assuming equal upload/download limits for simplicity
                # You can customize this based on your requirements
                upload_limit = new_plan_mbps
                download_limit = new_plan_mbps

                if router_client.update_bandwidth_limit(reseller_id, upload_limit, download_limit):
                    success_count += 1
                    logger.info("Updated bandwidth for reseller %s on router %s", reseller_id, router_id)
                else:
                    logger.error("Failed to update bandwidth for reseller %s on router %s", reseller_id, router_id)

            # Update success status in database
            if success_count > 0:
                insert_row("bandwidth_update_log", {
                    "reseller_id": reseller_id,
                    "new_limit_mbps": new_plan_mbps,
                    "success_count": success_count,
                    "total_count": total_count,
                    "timestamp": datetime.now().isoformat()
                })

            return success_count == total_count

        except Exception as exc:
            logger.error("Failed to update reseller bandwidth: %s", exc)
            return False

    def test_router_connection(self, router_config: Dict) -> tuple[bool, str]:
        """Test connection to a specific router."""
        try:
            # Create temporary router client
            router_client = MikroTikRouterClient(
                host=router_config['host'],
                username=router_config['username'],
                password=router_config['password'],
                port=router_config.get('port', 8728),
                use_ssl=router_config.get('use_ssl', False)
            )
            
            if router_client.connect():
                router_client.disconnect()
                return True, "Connection successful"
            else:
                return False, "Failed to connect to router"
                
        except Exception as exc:
            return False, f"Connection error: {str(exc)}"

    def get_router_devices(self, router_config: Dict) -> List[Dict]:
        """Get all devices/queues from a specific router."""
        try:
            # Create temporary router client
            router_client = MikroTikRouterClient(
                host=router_config['host'],
                username=router_config['username'],
                password=router_config['password'],
                port=router_config.get('port', 8728),
                use_ssl=router_config.get('use_ssl', False)
            )
            
            if not router_client.connect():
                raise Exception("Failed to connect to router")
            
            devices = []
            
            # Get Simple Queues (bandwidth limits)
            try:
                queues = router_client.execute_command('queue/simple')
                for queue in queues:
                    devices.append({
                        "type": "queue",
                        "name": queue.get('name', 'Unknown'),
                        "target": queue.get('target', 'Unknown'),
                        "max_limit": queue.get('max-limit', 'Unknown'),
                        "burst_limit": queue.get('burst-limit', 'Unknown'),
                        "disabled": queue.get('disabled', 'false') == 'true',
                        "bytes": queue.get('bytes', '0/0'),
                        "packets": queue.get('packets', '0/0'),
                        "id": queue.get('.id', '')
                    })
            except Exception as e:
                logger.warning("Failed to get queues: %s", e)
            
            # Get DHCP Leases (active devices)
            try:
                leases = router_client.execute_command('ip/dhcp-server/lease')
                for lease in leases:
                    if lease.get('status') == 'bound':
                        devices.append({
                            "type": "dhcp_lease",
                            "name": lease.get('host-name', 'Unknown'),
                            "ip_address": lease.get('address', 'Unknown'),
                            "mac_address": lease.get('mac-address', 'Unknown'),
                            "server": lease.get('server', 'Unknown'),
                            "expires_after": lease.get('expires-after', 'Unknown'),
                            "last_seen": lease.get('last-seen', 'Unknown'),
                            "id": lease.get('.id', '')
                        })
            except Exception as e:
                logger.warning("Failed to get DHCP leases: %s", e)
            
            # Get Interface list
            try:
                interfaces = router_client.execute_command('interface')
                for interface in interfaces:
                    devices.append({
                        "type": "interface",
                        "name": interface.get('name', 'Unknown'),
                        "type_detail": interface.get('type', 'Unknown'),
                        "running": interface.get('running', 'false') == 'true',
                        "disabled": interface.get('disabled', 'false') == 'true',
                        "rx_bytes": interface.get('rx-byte', '0'),
                        "tx_bytes": interface.get('tx-byte', '0'),
                        "id": interface.get('.id', '')
                    })
            except Exception as e:
                logger.warning("Failed to get interfaces: %s", e)
            
            router_client.disconnect()
            return devices
            
        except Exception as exc:
            logger.error("Failed to get router devices: %s", exc)
            raise exc

    def disconnect_all(self) -> None:
        """Disconnect from all routers."""
        for router_id, router_client in self.routers.items():
            try:
                router_client.disconnect()
            except Exception as exc:
                logger.warning("Error disconnecting from router %s: %s", router_id, exc) 