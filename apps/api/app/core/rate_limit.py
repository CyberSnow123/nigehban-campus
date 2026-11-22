"""Rate limiting with slowapi (built on the ``limits`` library).

Counts per client IP address, in memory: one counter set per server process, and it is empty
after a restart. That is enough for a single-process campus deployment. Behind a reverse proxy
every request would share the proxy's address, so a trusted-proxy setting is needed first.
"""

from slowapi import Limiter
from slowapi.util import get_remote_address

from app.core.settings import get_settings

limiter = Limiter(
    key_func=get_remote_address,
    storage_uri="memory://",
    enabled=get_settings().rate_limit_enabled,
)


def login_limit() -> str:
    """Looked up on every request, so the limit can be changed in settings and in tests."""
    return get_settings().login_rate_limit
