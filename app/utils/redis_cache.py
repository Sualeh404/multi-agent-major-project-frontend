import redis
import hashlib
import json
from typing import Optional, Any
from datetime import datetime, timedelta

class RedisCache:
    def __init__(self, url: str = "redis://localhost:6379"):
        try:
            self.client = redis.from_url(url, decode_responses=True)
        except:
            self.client = None
    
    def _hash_key(self, agent: str, query: str, context: str) -> str:
        return hashlib.sha256(f"{agent}{query}{context}".encode()).hexdigest()
    
    async def get(self, agent: str, query: str, context: str) -> Optional[Any]:
        if not self.client:
            return None
        key = self._hash_key(agent, query, context)
        cached = self.client.get(key)
        if cached:
            return json.loads(cached)
        return None
    
    async def set(self, agent: str, query: str, context: str, value: Any, ttl: int = 86400):
        if not self.client:
            return
        key = self._hash_key(agent, query, context)
        self.client.setex(key, ttl, json.dumps(value))

cache = RedisCache()
