import redis
import hashlib
import json
from typing import Optional, Any, Dict
from datetime import datetime

class InMemoryCache:
    """Fallback in-memory cache when Redis is unavailable"""
    def __init__(self):
        self._store: Dict[str, Dict[str, Any]] = {}

    def _hash_key(self, agent: str, query: str, context: str) -> str:
        return hashlib.sha256(f"{agent}{query}{context}".encode()).hexdigest()

    async def get(self, agent: str, query: str, context: str) -> Optional[Any]:
        key = self._hash_key(agent, query, context)
        if key in self._store:
            entry = self._store[key]
            if datetime.now().timestamp() < entry.get("expires_at", 0):
                return entry.get("value")
            else:
                del self._store[key]
        return None

    async def set(self, agent: str, query: str, context: str, value: Any, ttl: int = 86400):
        key = self._hash_key(agent, query, context)
        expires_at = datetime.now().timestamp() + ttl
        self._store[key] = {"value": value, "expires_at": expires_at}

class RedisCache:
    def __init__(self, url: str = "redis://localhost:6379"):
        self.client = None
        self.in_memory = InMemoryCache()
        try:
            self.client = redis.from_url(url, decode_responses=True)
            self.client.ping()
        except Exception as e:
            print(f"Redis unavailable, using in-memory cache: {e}")
            self.client = None

    def _hash_key(self, agent: str, query: str, context: str) -> str:
        return hashlib.sha256(f"{agent}{query}{context}".encode()).hexdigest()

    async def get(self, agent: str, query: str, context: str) -> Optional[Any]:
        if self.client:
            try:
                key = self._hash_key(agent, query, context)
                cached = self.client.get(key)
                if cached:
                    return json.loads(cached)
            except Exception:
                pass
        return await self.in_memory.get(agent, query, context)

    async def set(self, agent: str, query: str, context: str, value: Any, ttl: int = 86400):
        if self.client:
            try:
                key = self._hash_key(agent, query, context)
                self.client.setex(key, ttl, json.dumps(value))
                return
            except Exception:
                pass
        await self.in_memory.set(agent, query, context, value, ttl)

from app.config import REDIS_URL as _REDIS_URL
cache = RedisCache(url=_REDIS_URL)
