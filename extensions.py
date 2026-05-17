from flask import session, request
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address


def user_or_ip_key():
    uid = session.get("uid")
    if uid:
        return f"uid:{uid}"
    body = request.get_json(silent=True) or {}
    body_uid = body.get("uid") if isinstance(body, dict) else None
    if body_uid:
        return f"uid:{body_uid}"
    return f"ip:{get_remote_address()}"


limiter = Limiter(key_func=get_remote_address, storage_uri="memory://")
