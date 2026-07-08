from __future__ import annotations

from collections import defaultdict, deque
from math import ceil
from threading import Lock
from time import monotonic


class InMemoryRateLimiter:
    def __init__(self, limit: int, window_seconds: int) -> None:
        self.limit = limit
        self.window_seconds = window_seconds
        self._attempts: defaultdict[str, deque[float]] = defaultdict(deque)
        self._lock = Lock()

    def check(self, key: str) -> int | None:
        now = monotonic()
        window_start = now - self.window_seconds

        with self._lock:
            attempts = self._attempts[key]

            while attempts and attempts[0] <= window_start:
                attempts.popleft()

            if len(attempts) >= self.limit:
                retry_after = self.window_seconds - (now - attempts[0])
                return max(1, ceil(retry_after))

            attempts.append(now)
            return None

    def reset(self) -> None:
        with self._lock:
            self._attempts.clear()
