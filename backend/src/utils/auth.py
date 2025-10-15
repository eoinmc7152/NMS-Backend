import os
from functools import wraps
from flask import request, jsonify

API_KEY = os.getenv("API_KEY")  # set this env var when running the server

def require_api_key(fn):
    @wraps(fn)
    def wrapper(*args, **kwargs):
        if API_KEY:  # only enforce if set
            provided = request.headers.get("X-API-Key")
            if provided != API_KEY:
                return jsonify(ok=False, error="Unauthorized"), 401
        return fn(*args, **kwargs)
    return wrapper
