from django.core.cache import cache
from django.utils import timezone

def get_client_ip(request):
    x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
    if x_forwarded_for:
        return x_forwarded_for.split(',')[0]
    return request.META.get('REMOTE_ADDR')


def is_rate_limited(request, action, limit=5, window=60):
    ip = get_client_ip(request)
    key = f"rl:{action}:{ip}"

    data = cache.get(key)

    now = timezone.now().timestamp()

    if not data:
        cache.set(key, {"count": 1, "start": now}, timeout=window)
        return False

    count = data["count"]
    start = data["start"]

    if now - start > window:
        cache.set(key, {"count": 1, "start": now}, timeout=window)
        return False

    if count >= limit:
        return True

    data["count"] += 1
    cache.set(key, data, timeout=window)

    return False
