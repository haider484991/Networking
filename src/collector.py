"""Traffic collection module.

Provides :class:`TrafficCollector` which returns Mbps usage per VLAN based on
configured collection method. Supports:

• SNMP – polls counters (`ifHCInOctets`, `ifHCOutOctets`) and derives Mbps over
  elapsed time (stateful in-memory).
• mock – generates random Mbps values useful for local testing without network
  gear.
"""
from __future__ import annotations

import logging
import random
import time
from pathlib import Path
from typing import Dict, List

# Try to import pysnmp, but don't fail if it's not available
PYSNMP_AVAILABLE = False
try:
    from pysnmp.hlapi import (
        CommunityData,
        ObjectType,
        ObjectIdentity,
        SnmpEngine,
        UdpTransportTarget,
        ContextData,
        getCmd,
    )
    PYSNMP_AVAILABLE = True
except ImportError:  # pragma: no cover
    # pysnmp is optional when using mock method
    CommunityData = None  # type: ignore
    logger = logging.getLogger(__name__)
    logger.warning("pysnmp not available, SNMP collection will fallback to mock mode")

logger = logging.getLogger(__name__)


class TrafficCollector:
    """Collects per-VLAN bandwidth usage (Mbps)."""

    _IFHC_IN_OCTETS = "1.3.6.1.2.1.31.1.1.1.6"
    _IFHC_OUT_OCTETS = "1.3.6.1.2.1.31.1.1.1.10"

    def __init__(self, config: dict):
        self.cfg = config
        self.vlans: List[int] = config.get("vlans", [])
        collection_cfg = config.get("collection", {})
        self.method = collection_cfg.get("method", "mock").lower()
        self._prev_counters: Dict[int, Dict[str, int]] = {}
        self._prev_ts: float | None = None

        if self.method == "snmp":
            if not PYSNMP_AVAILABLE:
                logger.warning("pysnmp not available, falling back to mock mode")
                self.method = "mock"
            else:
                snmp_cfg = collection_cfg.get("snmp", {})
                self._snmp_target = UdpTransportTarget((snmp_cfg.get("host"), 161))
                self._snmp_community = snmp_cfg.get("community", "public")
                self._snmp_version = int(snmp_cfg.get("version", "2c"))
                # Optional explicit mapping of VLAN -> ifIndex
                self._vlan_ifindex: Dict[int, int] = snmp_cfg.get("vlan_ifindex", {})
                if not self._vlan_ifindex:
                    logger.warning("SNMP vlan_ifindex mapping not provided; assuming VLAN ID == ifIndex")
        
        if self.method == "mock":
            logger.info("Using mock traffic generator")
        elif self.method != "snmp":
            raise ValueError(f"Unsupported collection method: {self.method}")

    # ---------------------------------------------------------------------
    # Public API
    # ---------------------------------------------------------------------
    def collect(self) -> Dict[int, float]:
        """Return Mbps usage for each configured VLAN.

        The calculation is based on delta bytes since last call (for SNMP).
        For mock mode, random numbers are produced.
        """
        if self.method == "snmp":
            return self._collect_snmp()
        return self._collect_mock()

    # ------------------------------------------------------------------
    # Internal helpers
    # ------------------------------------------------------------------
    def _collect_mock(self) -> Dict[int, float]:
        result = {vlan: random.uniform(10, 300) for vlan in self.vlans}
        logger.debug("Mock collector result: %s", result)
        return result

    def _collect_snmp(self) -> Dict[int, float]:
        now = time.time()
        speeds: Dict[int, float] = {}

        for vlan in self.vlans:
            if_index = self._vlan_ifindex.get(vlan, vlan)
            in_oid = f"{self._IFHC_IN_OCTETS}.{if_index}"
            out_oid = f"{self._IFHC_OUT_OCTETS}.{if_index}"
            try:
                in_octets = self._snmp_get_int(in_oid)
                out_octets = self._snmp_get_int(out_oid)
            except Exception as exc:  # pragma: no cover
                logger.error("SNMP error VLAN %s: %s", vlan, exc)
                continue

            if self._prev_ts is None:
                # first pass – just store and return 0
                self._prev_counters[vlan] = {"in": in_octets, "out": out_octets}
                speeds[vlan] = 0.0
                continue

            delta_time = now - self._prev_ts
            if delta_time <= 0:
                speeds[vlan] = 0.0
                continue

            prev = self._prev_counters.get(vlan, {"in": in_octets, "out": out_octets})
            delta_bytes = (in_octets - prev["in"]) + (out_octets - prev["out"])
            mbits = (delta_bytes * 8) / 1_000_000  # bits→Mbit
            mbps = mbits / delta_time
            speeds[vlan] = max(mbps, 0.0)
            # update previous
            self._prev_counters[vlan] = {"in": in_octets, "out": out_octets}

        self._prev_ts = now
        logger.debug("SNMP collector Mbps: %s", speeds)
        return speeds

    def _snmp_get_int(self, oid: str) -> int:
        """Perform SNMP GET and return integer value."""
        iterator = getCmd(
            SnmpEngine(),
            CommunityData(self._snmp_community, mpModel=0 if self._snmp_version == 1 else 1),
            self._snmp_target,
            ContextData(),
            ObjectType(ObjectIdentity(oid)),
            lookupMib=False,
        )
        errorIndication, errorStatus, errorIndex, varBinds = next(iterator)
        if errorIndication:
            raise RuntimeError(errorIndication)
        if errorStatus:
            raise RuntimeError(f"{errorStatus.prettyPrint()} at {errorIndex}")
        for _name, val in varBinds:
            return int(val)
        raise RuntimeError("SNMP value not found") 