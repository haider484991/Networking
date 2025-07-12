"""Notification module – WhatsApp alerts via Twilio API."""
from __future__ import annotations

import logging
import os
from typing import Optional

from twilio.base.exceptions import TwilioRestException
from twilio.rest import Client

logger = logging.getLogger(__name__)


class WhatsAppAlert:
    """Simple wrapper around Twilio WhatsApp messaging."""

    def __init__(
        self,
        from_number: str,
        to_number: str,
        account_sid: Optional[str] = None,
        auth_token: Optional[str] = None,
    ) -> None:
        if not from_number or not to_number:
            raise ValueError("Both from_number and to_number are required for WhatsApp alerts")

        self.from_number = from_number
        self.to_number = to_number
        self.account_sid = account_sid or os.getenv("TWILIO_ACCOUNT_SID")
        self.auth_token = auth_token or os.getenv("TWILIO_AUTH_TOKEN")

        if not self.account_sid or not self.auth_token:
            raise RuntimeError(
                "Twilio credentials missing. Set TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN env vars or pass explicitly."
            )

        self.client = Client(self.account_sid, self.auth_token)

    def send(self, body: str) -> bool:
        """Send WhatsApp message; return True if successful."""
        try:
            msg = self.client.messages.create(body=body, from_=self.from_number, to=self.to_number)
            logger.info("WhatsApp alert sent – SID %s", msg.sid)
            return True
        except TwilioRestException as exc:
            logger.error("Failed to send WhatsApp alert: %s", exc)
            return False 