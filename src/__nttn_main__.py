"""Entry-point: runs NTTN monitoring service."""
from __future__ import annotations

import logging
from .nttn_monitor import NTTNMonitor
from .config import load_config

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s – %(message)s",
)


def main() -> None:
    cfg = load_config()
    monitor = NTTNMonitor(cfg)
    
    try:
        logging.info("Starting NTTN monitoring service...")
        monitor.run_forever()
    except (KeyboardInterrupt, SystemExit):
        logging.info("NTTN monitoring service shutting down.")


if __name__ == "__main__":
    main() 