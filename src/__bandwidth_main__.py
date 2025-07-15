"""Entry-point: runs bandwidth manager service."""
from __future__ import annotations

import logging
from .bandwidth_manager import BandwidthManager
from .config import load_config

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s – %(message)s",
)


def main() -> None:
    cfg = load_config()
    manager = BandwidthManager(cfg)
    
    try:
        logging.info("Starting bandwidth manager service...")
        manager.run_forever()
    except (KeyboardInterrupt, SystemExit):
        logging.info("Bandwidth manager service shutting down.")


if __name__ == "__main__":
    main() 