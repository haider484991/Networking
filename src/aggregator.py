"""Aggregator service – computes 5-minute bandwidth totals and triggers alerts."""
from __future__ import annotations

import logging
import time
from typing import Dict
from datetime import datetime

from .collector import TrafficCollector
from .alert import WhatsAppAlert
from .supabase_client import insert_row

logger = logging.getLogger(__name__)


class Aggregator:
    """Aggregates VLAN usage and checks against threshold."""

    def __init__(self, config: Dict):
        self.cfg = config
        self.collector = TrafficCollector(config)
        self.threshold = float(config.get("threshold_mbps", 950))

        alert_cfg = config.get("alert", {}).get("twilio", {})
        self.alert_sender = WhatsAppAlert(
            from_number=alert_cfg.get("from_number"),
            to_number=alert_cfg.get("to_number"),
        )

        self._last_alert_ts: float | None = None
        # Cool-down to avoid spamming (seconds)
        self.alert_cooldown = 10 * 60  # 10 minutes

    # ------------------------------------------------------------------
    # Public
    # ------------------------------------------------------------------
    def run_cycle(self) -> None:
        """Perform one aggregation/alert cycle."""
        per_vlan = self.collector.collect()
        total_mbps = sum(per_vlan.values())
        logger.info("Total bandwidth last 5m: %.2f Mbps (threshold %.0f)", total_mbps, self.threshold)

        # Write usage data to Supabase (simulate per-reseller data)
        self._write_usage_data(per_vlan)

        if total_mbps > self.threshold:
            self._maybe_alert(total_mbps)

    # ------------------------------------------------------------------
    # Internal
    # ------------------------------------------------------------------
    def _write_usage_data(self, per_vlan: Dict[int, float]) -> None:
        """Write mock reseller usage data to Supabase."""
        try:
            # Mock mapping of VLANs to resellers
            vlan_to_reseller = {
                10: "r1",  # SpeedServe
                20: "r2",  # OptiLine
                30: "r3",  # LowCostISP
                40: "r4",  # DownTownNet
                50: "r1",  # Additional capacity for SpeedServe
            }
            
            timestamp = datetime.now().isoformat()
            
            for vlan, mbps in per_vlan.items():
                reseller_id = vlan_to_reseller.get(vlan)
                if reseller_id:
                    # Split into rx/tx (mock 60/40 split)
                    rx_mbps = mbps * 0.6
                    tx_mbps = mbps * 0.4
                    
                    insert_row("usage_5m", {
                        "ts": timestamp,
                        "reseller_id": reseller_id,
                        "rx_mbps": rx_mbps,
                        "tx_mbps": tx_mbps
                    })
                    
                    # Check reseller thresholds
                    self._check_reseller_threshold(reseller_id, mbps)
                    
        except Exception as exc:
            logger.warning("Failed to write usage data to Supabase: %s", exc)

    def _check_reseller_threshold(self, reseller_id: str, current_mbps: float) -> None:
        """Check if reseller exceeded their plan threshold."""
        # Mock reseller plans
        reseller_plans = {
            "r1": 500,  # SpeedServe
            "r2": 100,  # OptiLine
            "r3": 50,   # LowCostISP
            "r4": 200,  # DownTownNet
        }
        
        plan_mbps = reseller_plans.get(reseller_id, 100)
        utilization = current_mbps / plan_mbps
        
        alert_level = None
        if utilization >= 1.0:
            alert_level = "RED"
        elif utilization >= 0.8:
            alert_level = "YELLOW"
            
        if alert_level:
            try:
                insert_row("alerts", {
                    "reseller_id": reseller_id,
                    "level": alert_level,
                    "message": f"Reseller {reseller_id} bandwidth at {utilization*100:.1f}% ({current_mbps:.1f}/{plan_mbps} Mbps)",
                    "sent_at": datetime.now().isoformat()
                })
                logger.info("Reseller %s threshold alert: %s", reseller_id, alert_level)
            except Exception as exc:
                logger.warning("Failed to insert reseller alert: %s", exc)

    def _maybe_alert(self, total_mbps: float) -> None:
        now = time.time()
        if self._last_alert_ts and now - self._last_alert_ts < self.alert_cooldown:
            logger.debug("Alert suppressed due to cooldown (last sent %.0f seconds ago).", now - self._last_alert_ts)
            return

        message = (
            f"Alert: VLAN Traffic exceeded {self.threshold} Mbps in last 5 minutes! "
            f"Current usage: {total_mbps:.2f} Mbps."
        )
        if self.alert_sender.send(message):
            self._last_alert_ts = now
            # Write to Supabase alerts table (reseller_id NULL for backbone alert)
            try:
                insert_row(
                    "alerts",
                    {
                        "reseller_id": None,
                        "level": "RED",
                        "message": message,
                        "sent_at": datetime.now().isoformat()
                    },
                )
            except Exception as exc:
                logger.warning("Failed to insert alert row into Supabase: %s", exc) 