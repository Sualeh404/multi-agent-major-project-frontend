"""SQLite-backed session store with the same dict-ish surface as the
in-memory dict that used to live in main.py.

We deliberately keep the API minimal (get, set, pop, items, __contains__,
__len__) so swapping in is a one-liner. Sessions are serialised as JSON
via Pydantic's model_dump and reconstructed lazily on read.
"""
from __future__ import annotations

import json
import os
import sqlite3
import threading
import time
from typing import Iterator, Optional

from app.schemas.research_state import ResearchState

_DEFAULT_PATH = os.getenv("SESSION_DB_PATH", os.path.join(os.path.dirname(os.path.dirname(__file__)), "..", "sessions.db"))


class SessionStore:
    def __init__(self, path: str = _DEFAULT_PATH, ttl_seconds: int = 3600):
        self._path = os.path.abspath(path)
        self._ttl = ttl_seconds
        self._lock = threading.Lock()  # sqlite3 connections aren't safe across threads by default
        self._conn = sqlite3.connect(self._path, check_same_thread=False)
        self._conn.execute("PRAGMA journal_mode=WAL")
        self._conn.execute(
            """
            CREATE TABLE IF NOT EXISTS sessions (
                session_id TEXT PRIMARY KEY,
                payload    TEXT NOT NULL,
                created_at REAL NOT NULL,
                updated_at REAL NOT NULL
            )
            """
        )
        self._conn.commit()

    # --- dict-ish API ----------------------------------------------------

    def __contains__(self, session_id: str) -> bool:
        return self.get(session_id) is not None

    def __len__(self) -> int:
        with self._lock:
            cur = self._conn.execute("SELECT COUNT(*) FROM sessions")
            return int(cur.fetchone()[0])

    def get(self, session_id: str) -> Optional[ResearchState]:
        with self._lock:
            cur = self._conn.execute(
                "SELECT payload FROM sessions WHERE session_id = ?", (session_id,)
            )
            row = cur.fetchone()
        if not row:
            return None
        try:
            data = json.loads(row[0])
            return ResearchState(**data)
        except Exception:
            return None

    def set(self, session_id: str, state: ResearchState) -> None:
        payload = json.dumps(state.model_dump(), default=str)
        now = time.time()
        with self._lock:
            self._conn.execute(
                """
                INSERT INTO sessions (session_id, payload, created_at, updated_at)
                VALUES (?, ?, ?, ?)
                ON CONFLICT(session_id) DO UPDATE SET
                    payload = excluded.payload,
                    updated_at = excluded.updated_at
                """,
                (session_id, payload, now, now),
            )
            self._conn.commit()

    def __setitem__(self, session_id: str, state: ResearchState) -> None:
        self.set(session_id, state)

    def __getitem__(self, session_id: str) -> ResearchState:
        s = self.get(session_id)
        if s is None:
            raise KeyError(session_id)
        return s

    def pop(self, session_id: str, default=None):
        with self._lock:
            cur = self._conn.execute(
                "SELECT payload FROM sessions WHERE session_id = ?", (session_id,)
            )
            row = cur.fetchone()
            self._conn.execute("DELETE FROM sessions WHERE session_id = ?", (session_id,))
            self._conn.commit()
        if not row:
            return default
        try:
            return ResearchState(**json.loads(row[0]))
        except Exception:
            return default

    def items(self) -> Iterator[tuple[str, ResearchState]]:
        with self._lock:
            cur = self._conn.execute("SELECT session_id, payload FROM sessions")
            rows = cur.fetchall()
        for sid, payload in rows:
            try:
                yield sid, ResearchState(**json.loads(payload))
            except Exception:
                continue

    # --- maintenance -----------------------------------------------------

    def cleanup_expired(self) -> int:
        cutoff = time.time() - self._ttl
        with self._lock:
            cur = self._conn.execute(
                "DELETE FROM sessions WHERE created_at < ?", (cutoff,)
            )
            self._conn.commit()
            return cur.rowcount

    def created_at(self, session_id: str) -> Optional[float]:
        with self._lock:
            cur = self._conn.execute(
                "SELECT created_at FROM sessions WHERE session_id = ?", (session_id,)
            )
            row = cur.fetchone()
        return float(row[0]) if row else None
