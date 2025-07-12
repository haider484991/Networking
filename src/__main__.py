"""Entry-point: runs aggregator every 5 minutes using BlockingScheduler."""
from __future__ import annotations

import logging
from datetime import datetime, timedelta

from apscheduler.schedulers.blocking import BlockingScheduler

from .aggregator import Aggregator
from .config import load_config

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s – %(message)s",
)


def main() -> None:
    cfg = load_config()
    aggregator = Aggregator(cfg)

    # Warm-up read (initial counters) – do not evaluate threshold
    aggregator.collector.collect()

    sched = BlockingScheduler()
    # Schedule first run 5 minutes from now to establish full window
    sched.add_job(aggregator.run_cycle, "interval", minutes=5, next_run_time=datetime.now() + timedelta(minutes=5))

    try:
        logging.info("Starting bandwidth monitoring scheduler …")
        sched.start()
    except (KeyboardInterrupt, SystemExit):
        logging.info("Shutting down.")


if __name__ == "__main__":
    main() 