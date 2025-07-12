"""Configuration loader for Bandwidth Alert Notification System."""
from __future__ import annotations

import os
from pathlib import Path
from typing import Any, Dict

import yaml


_DEFAULT_CONFIG_PATH = Path(__file__).resolve().parent.parent / "config.yaml"


def load_config(path: str | Path | None = None) -> Dict[str, Any]:
    """Load YAML config and return as dict.

    Environment variables can override nested keys using notation
    `SECTION_KEY_SUBKEY=value`, e.g. `ALERT_TWILIO_FROM_NUMBER`.
    """
    cfg_path = Path(path) if path else _DEFAULT_CONFIG_PATH
    if not cfg_path.exists():
        raise FileNotFoundError(f"Config file not found: {cfg_path}")

    with open(cfg_path, "r", encoding="utf-8") as fp:
        cfg: Dict[str, Any] = yaml.safe_load(fp) or {}

    # Optional: override with env vars such as ALERT_TWILIO_FROM_NUMBER
    for env_key, env_val in os.environ.items():
        parts = env_key.lower().split("_")
        ref = cfg
        for idx, part in enumerate(parts):
            if part in ref and idx < len(parts) - 1:
                ref = ref[part]
            elif part in ref and idx == len(parts) - 1:
                ref[part] = env_val
                break
        # ignore if path not found
    return cfg 