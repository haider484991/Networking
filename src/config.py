"""Configuration loader for Bandwidth Alert Notification System."""
from __future__ import annotations

import os
import re
from pathlib import Path
from typing import Any, Dict

import yaml


_DEFAULT_CONFIG_PATH = Path(__file__).resolve().parent.parent / "config.yaml"
_ENV_VAR_MATCHER = re.compile(r"^\$\{(.+?)(:-(.*?))?\}$")


def _substitute_env_vars(obj: Any) -> Any:
    """Recursively substitute environment variables in config values."""
    if isinstance(obj, dict):
        return {k: _substitute_env_vars(v) for k, v in obj.items()}
    if isinstance(obj, list):
        return [_substitute_env_vars(elem) for elem in obj]
    if isinstance(obj, str):
        match = _ENV_VAR_MATCHER.match(obj)
        if match:
            var_name, _, default_val = match.groups()
            # The default value can be None if the ':-' part is not present
            return os.environ.get(var_name, default_val)
    return obj


def load_config(path: str | Path | None = None) -> Dict[str, Any]:
    """Load YAML config, substitute env vars, and return as dict.

    Environment variables can be substituted using `${VAR_NAME}` or
    `${VAR_NAME:-default_value}` syntax in the YAML file.
    """
    cfg_path = Path(path) if path else _DEFAULT_CONFIG_PATH
    if not cfg_path.exists():
        raise FileNotFoundError(f"Config file not found: {cfg_path}")

    with open(cfg_path, "r", encoding="utf-8") as fp:
        cfg: Dict[str, Any] = yaml.safe_load(fp) or {}

    return _substitute_env_vars(cfg)