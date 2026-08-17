# SPDX-License-Identifier: AGPL-3.0-or-later
import redis.asyncio as redis

from app.config import settings

redis_client = redis.from_url(settings.REDIS_URL, decode_responses=True)
