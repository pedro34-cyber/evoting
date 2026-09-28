from fastapi import FastAPI

# slowapi (rate limiting) is optional for local development. Import if available,
# otherwise proceed without middleware/handlers so the server can run.
try:
    from slowapi import _rate_limit_exceeded_handler
    from slowapi.errors import RateLimitExceeded
    from slowapi.middleware import SlowAPIMiddleware
    slowapi_available = True
except Exception:
    _rate_limit_exceeded_handler = None
    RateLimitExceeded = None
    SlowAPIMiddleware = None
    slowapi_available = False

from .api import router as api_router
from .create_db import create_all
from .rate_limiter import limiter

app = FastAPI(title="SUG Voting Backend")

# Attach limiter if slowapi is available; otherwise limiter is a no-op fallback.
app.state.limiter = limiter

if slowapi_available and RateLimitExceeded and _rate_limit_exceeded_handler:
    app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

if slowapi_available and SlowAPIMiddleware:
    app.add_middleware(SlowAPIMiddleware)

app.include_router(api_router, prefix="/api")

@app.on_event("startup")
def on_startup():
    # Create DB tables if they don't exist (development convenience)
    create_all()

@app.get("/")
def root():
    return {"status": "ok", "service": "sug-voting"}
