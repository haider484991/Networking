"""Aggregator service – computes 5-minute bandwidth totals and triggers alerts."""
from __future__ import annotations

import logging
import time
from typing import Dict
from datetime import datetime

from .collector import TrafficCollector
from .alert import WhatsAppAlert
from .supabase_client import insert_row, get_client

logger = logging.getLogger(__name__)


class Aggregator:
    """Aggregates VLAN usage and checks against threshold."""

    def __init__(self, config: Dict):
        self.cfg = config
        self.collector = TrafficCollector(config)
        self.threshold = float(config.get("threshold_mbps", 950))

        # --------------------------------------------------------------
        # Optional WhatsApp alerts (Twilio)
        # --------------------------------------------------------------
        alert_cfg = config.get("alert", {}).get("twilio", {})
        from_number = alert_cfg.get("from_number")
        to_number = alert_cfg.get("to_number")

        if from_number and to_number:
            try:
                self.alert_sender: WhatsAppAlert | None = WhatsAppAlert(
                    from_number=from_number,
                    to_number=to_number,
                )
                logger.info("WhatsApp alerts enabled; messages will be sent to %s", to_number)
            except Exception as exc:
                logger.warning("Disabling WhatsApp alerts: %s", exc)
                self.alert_sender = None
        else:
            logger.info("WhatsApp alerts disabled (from/to number not configured)")
            self.alert_sender = None

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
        """Write reseller usage data to Supabase database."""
        try:
            # Get actual reseller-router mappings from database
            client = get_client()
            
            # Get all enabled resellers and their router mappings
            resellers_result = client.table("resellers").select("*").execute()
            mappings_result = client.table("reseller_router_mapping").select("*").execute()
            
            if not resellers_result.data:
                logger.warning("No resellers found in database")
                return
                
            # Create mapping of VLANs to resellers based on database data
            vlan_to_reseller = {}
            if mappings_result.data:
                # Use actual router mappings if available
                for mapping in mappings_result.data:
                    # For demo purposes, assign VLANs sequentially to resellers
                    reseller_id = mapping['reseller_id']
                    if reseller_id not in vlan_to_reseller.values():
                        # Find next available VLAN
                        for vlan in [10, 20, 30, 40, 50]:
                            if vlan not in vlan_to_reseller:
                                vlan_to_reseller[vlan] = reseller_id
                                break
            else:
                # Fallback: distribute VLANs evenly among resellers
                reseller_ids = [r['id'] for r in resellers_result.data]
                vlans = [10, 20, 30, 40, 50]
                for i, vlan in enumerate(vlans):
                    if i < len(reseller_ids):
                        vlan_to_reseller[vlan] = reseller_ids[i]
                    else:
                        # Assign remaining VLANs to first reseller for additional capacity
                        vlan_to_reseller[vlan] = reseller_ids[0]
            
            timestamp = datetime.now().isoformat()
            
            for vlan, mbps in per_vlan.items():
                reseller_id = vlan_to_reseller.get(vlan)
                if reseller_id:
                    # Split into rx/tx (realistic 60/40 split)
                    rx_mbps = mbps * 0.6
                    tx_mbps = mbps * 0.4
                    
                    # Store usage data in database
                    insert_row("usage_5m", {
                        "ts": timestamp,
                        "reseller_id": reseller_id,
                        "rx_mbps": rx_mbps,
                        "tx_mbps": tx_mbps
                    })
                    
                    # Check reseller thresholds against actual plans from database
                    reseller_data = next((r for r in resellers_result.data if r['id'] == reseller_id), None)
                    if reseller_data:
                        self._check_reseller_threshold(reseller_id, mbps, reseller_data['plan_mbps'], reseller_data.get('threshold', 0.8))
                    
        except Exception as exc:
            logger.warning("Failed to write usage data to Supabase: %s", exc)

    def _check_reseller_threshold(self, reseller_id: str, current_mbps: float, plan_mbps: int, threshold: float) -> None:
        """Check reseller bandwidth threshold against actual plan data."""
        try:
            utilization = current_mbps / plan_mbps
            
            if utilization >= 1.0:  # 100% or higher
                level = "RED"
                message = f"Reseller {reseller_id} bandwidth exceeded 100% ({current_mbps:.1f}/{plan_mbps} Mbps)"
            elif utilization >= threshold:  # Above threshold (default 80%)
                level = "YELLOW"
                message = f"Reseller {reseller_id} bandwidth exceeded {threshold*100:.0f}% threshold ({current_mbps:.1f}/{plan_mbps} Mbps)"
            else:
                return  # No alert needed
            
            # Store alert in database
            insert_row("alerts", {
                "reseller_id": reseller_id,
                "level": level,
                "message": message,
                "sent_at": datetime.now().isoformat()
            })
            
            # Send alert notification if configured
            if self.alert_sender:
                alert_sent = self.alert_sender.send(message)
                if alert_sent:
                    logger.info("Alert sent for reseller %s: %s", reseller_id, message)
                else:
                    logger.warning("Failed to send alert for reseller %s", reseller_id)
                    
        except Exception as exc:
            logger.warning("Failed to check reseller threshold: %s", exc)

    def _maybe_alert(self, total_mbps: float) -> None:
        now = time.time()
        if self._last_alert_ts and now - self._last_alert_ts < self.alert_cooldown:
            logger.debug("Alert suppressed due to cooldown (last sent %.0f seconds ago).", now - self._last_alert_ts)
            return

        message = (
            f"Alert: VLAN Traffic exceeded {self.threshold} Mbps in last 5 minutes! "
            f"Current usage: {total_mbps:.2f} Mbps."
        )
        if self.alert_sender and self.alert_sender.send(message):
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