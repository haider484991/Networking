"""Supabase client singleton with lazy initialization."""
from __future__ import annotations

import os
from functools import lru_cache
from typing import Any, Dict

from supabase import create_client, Client  # type: ignore


@lru_cache(maxsize=1)
def get_client() -> Client:
    url = os.getenv("SUPABASE_URL")
    key = os.getenv("SUPABASE_KEY", os.getenv("SUPABASE_ANON_KEY"))
    if not url or not key:
        raise RuntimeError("SUPABASE_URL and SUPABASE_KEY environment variables are required")
    return create_client(url, key)


def insert_row(table: str, data: Dict[str, Any]) -> None:
    client = get_client()
    resp = client.table(table).insert(data).execute()
    if resp.get("status_code") not in (200, 201):
        raise RuntimeError(f"Supabase insert error: {resp}") 