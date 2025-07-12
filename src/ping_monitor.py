"""Ping monitor worker - continuously checks reseller link status."""
from __future__ import annotations

import logging
import subprocess
import time
from typing import Dict, List
from datetime import datetime
import platform

from .supabase_client import get_client, insert_row

logger = logging.getLogger(__name__)


class PingMonitor:
    """Monitors reseller IPs via ping and updates link_state in Supabase."""
    
    def __init__(self, config: Dict):
        self.cfg = config
        self.ping_interval = config.get("ping_interval", 60)  # seconds
        self.failure_threshold = config.get("failure_threshold", 3)  # consecutive failures
        self.failure_counts: Dict[str, int] = {}
        self.last_states: Dict[str, str] = {}
        
        # Mock reseller IPs - in real app would fetch from Supabase
        self.reseller_ips = {
            "r1": "8.8.8.8",      # SpeedServe
            "r2": "1.1.1.1",      # OptiLine  
            "r3": "208.67.222.222", # LowCostISP
            "r4": "192.0.2.1",    # DownTownNet (likely to fail)
        }
        
    def ping_ip(self, ip: str) -> bool:
        """Ping an IP address once, return True if successful."""
        try:
            # Determine platform-specific ping command
            system = platform.system().lower()
            
            if system == "windows":
                # Windows ping command
                cmd = ["ping", "-n", "1", "-w", "3000", ip]
            else:
                # Linux/Unix ping command
                cmd = ["ping", "-c", "1", "-W", "3", ip]
            
            result = subprocess.run(
                cmd,
                capture_output=True,
                text=True,
                timeout=5
            )
            return result.returncode == 0
            
        except FileNotFoundError:
            logger.error("Ping command not found. Make sure ping is installed.")
            return False
        except subprocess.TimeoutExpired:
            logger.warning("Ping timeout for %s", ip)
            return False
        except Exception as exc:
            logger.error("Ping error for %s: %s", ip, exc)
            return False
    
    def check_reseller(self, reseller_id: str, ip: str) -> None:
        """Check one reseller and update state if needed."""
        is_up = self.ping_ip(ip)
        
        if is_up:
            # Reset failure count on success
            self.failure_counts[reseller_id] = 0
            if self.last_states.get(reseller_id) != "UP":
                self._update_link_state(reseller_id, "UP")
                self.last_states[reseller_id] = "UP"
                logger.info("Reseller %s (%s) is UP", reseller_id, ip)
        else:
            # Increment failure count
            self.failure_counts[reseller_id] = self.failure_counts.get(reseller_id, 0) + 1
            
            if self.failure_counts[reseller_id] >= self.failure_threshold:
                if self.last_states.get(reseller_id) != "DOWN":
                    self._update_link_state(reseller_id, "DOWN")
                    self._send_link_down_alert(reseller_id)
                    self.last_states[reseller_id] = "DOWN"
                    logger.warning("Reseller %s (%s) is DOWN after %d failures", 
                                 reseller_id, ip, self.failure_counts[reseller_id])
    
    def _update_link_state(self, reseller_id: str, state: str) -> None:
        """Update link_state table in Supabase."""
        try:
            client = get_client()
            # Upsert link_state row
            client.table("link_state").upsert({
                "reseller_id": reseller_id,
                "state": state,
                "since": datetime.now().isoformat()
            }).execute()
        except Exception as exc:
            logger.error("Failed to update link_state for %s: %s", reseller_id, exc)
    
    def _send_link_down_alert(self, reseller_id: str) -> None:
        """Insert link down alert into alerts table."""
        try:
            insert_row("alerts", {
                "reseller_id": reseller_id,
                "level": "LINK_DOWN",
                "message": f"Link down for reseller {reseller_id} - {self.failure_threshold} ping failures",
                "sent_at": datetime.now().isoformat()
            })
        except Exception as exc:
            logger.error("Failed to insert link down alert for %s: %s", reseller_id, exc)
    
    def run_forever(self) -> None:
        """Main loop - check all resellers every ping_interval seconds."""
        logger.info("Starting ping monitor for %d resellers", len(self.reseller_ips))
        
        while True:
            try:
                for reseller_id, ip in self.reseller_ips.items():
                    self.check_reseller(reseller_id, ip)
                
                logger.debug("Ping check completed, sleeping %d seconds", self.ping_interval)
                time.sleep(self.ping_interval)
                
            except KeyboardInterrupt:
                logger.info("Ping monitor stopped by user")
                break
            except Exception as exc:
                logger.error("Ping monitor error: %s", exc)
                time.sleep(self.ping_interval)


def main() -> None:
    """Entry point for ping monitor worker."""
    from .config import load_config
    
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s [%(levelname)s] %(name)s – %(message)s",
    )
    
    cfg = load_config()
    monitor = PingMonitor(cfg)
    monitor.run_forever()


if __name__ == "__main__":
    main() 