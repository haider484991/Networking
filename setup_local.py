#!/usr/bin/env python3
"""One-shot helper to configure and launch the ISP monitoring stack locally.

Run:
    python setup_local.py

Steps performed:
1. Prompt (or take CLI args) for SNMP router details, VLAN list and ifIndex map.
2. Write/overwrite `config.yaml` with those values and reference `reseller_ips.json`.
3. Create `reseller_ips.json` with reseller-id → IP mapping (interactive).
4. Build & start the Docker Compose stack.

Requires PyYAML installed on the host: `pip install pyyaml`.
"""
from __future__ import annotations

import json
import shlex
import subprocess
from pathlib import Path
import sys
import textwrap
from typing import Dict, List

try:
    import yaml  # type: ignore
except ImportError:
    sys.exit("PyYAML not installed.  Run `pip install pyyaml` and re-execute.")

CONFIG_PATH = Path("config.yaml")
IPS_PATH = Path("reseller_ips.json")


def prompt(msg: str, default: str | None = None) -> str:
    suffix = f" [{default}]" if default else ""
    val = input(f"{msg}{suffix}: ").strip()
    return val or (default or "")


def build_config(router_ip: str, community: str, vlans: List[int], vlan_ifindex: Dict[int, int]) -> dict:
    return {
        "vlans": vlans,
        "threshold_mbps": 950,
        "collection": {
            "method": "snmp",
            "snmp": {
                "host": router_ip,
                "community": community,
                "version": "2c",
                "vlan_ifindex": vlan_ifindex,
            },
        },
        "ping_interval": 60,
        "failure_threshold": 3,
        "reseller_ips_file": str(IPS_PATH),
    }


def interactive_setup() -> None:
    print("=== Local ISP Monitor Setup ===")

    if CONFIG_PATH.exists():
        print(f"⚠ {CONFIG_PATH} already exists – it will be overwritten\n")

    router = prompt("Router IP address", "192.0.2.1")
    community = prompt("SNMP community", "public")
    vlan_str = prompt("Comma-separated VLAN IDs", "10,20,30,40,50")
    vlans = [int(v.strip()) for v in vlan_str.split(",") if v.strip()]

    print("\nEnter ifIndex numbers for each VLAN (press Enter to use same number):")
    vlan_idx: Dict[int, int] = {}
    for v in vlans:
        idx_raw = prompt(f"  VLAN {v} ifIndex", str(v))
        vlan_idx[v] = int(idx_raw)

    cfg = build_config(router, community, vlans, vlan_idx)
    CONFIG_PATH.write_text(yaml.safe_dump(cfg, sort_keys=False))
    print(f"✅ Wrote {CONFIG_PATH}\n")

    # Reseller IPs
    if IPS_PATH.exists():
        print(f"⚠ {IPS_PATH} already exists – it will be overwritten")
    print("Enter reseller IPs (blank reseller ID to finish):")
    reseller_ips: Dict[str, str] = {}
    while True:
        rid = input("  Reseller ID (e.g. r1): ").strip()
        if not rid:
            break
        ip = input(f"    IP for {rid}: ").strip()
        if ip:
            reseller_ips[rid] = ip
    if not reseller_ips:
        print("No reseller IPs entered – ping-monitor will use default mock list.")
    else:
        IPS_PATH.write_text(json.dumps(reseller_ips, indent=2))
        print(f"✅ Wrote {IPS_PATH}\n")

    # Build & launch
    print("Building Docker images and starting the stack … (this can take a while on first run)\n")
    subprocess.run(shlex.split("docker compose up --build -d"), check=True)

    print(textwrap.dedent(
        """
        🎉  Stack is running!

          API docs:     http://localhost:8000/docs
          Dashboard:    http://localhost:3000

        Use `docker compose logs -f` to follow logs.
        """
    ))


if __name__ == "__main__":
    interactive_setup() 