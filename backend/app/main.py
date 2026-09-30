import os
from pathlib import Path
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
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

UPLOAD_ROOT = Path(__file__).resolve().parent / "static" / "uploads"
UPLOAD_ROOT.mkdir(parents=True, exist_ok=True)
(candidate_dir := (UPLOAD_ROOT / "candidates")).mkdir(parents=True, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=str(UPLOAD_ROOT)), name="uploads")

# Attach limiter if slowapi is available; otherwise limiter is a no-op fallback.
app.state.limiter = limiter

# Allow Vercel frontend in production and localhost for dev
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173", 
        "http://127.0.0.1:5173", 
        "https://sug-voting-frontend.vercel.app",
        "https://evoting-one.vercel.app"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

if slowapi_available and RateLimitExceeded and _rate_limit_exceeded_handler:
    app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

if slowapi_available and SlowAPIMiddleware:
    app.add_middleware(SlowAPIMiddleware)

app.include_router(api_router, prefix="/api")

# Ensure the SQLite schema is migrated as soon as the app module is imported so tests and
# local runs do not hit stale databases that are missing recently-added columns such as email.
create_all()

@app.on_event("startup")
def on_startup():
    # Create DB tables if they don't exist (development convenience)
    create_all()

@app.get("/")
def root():
    return {"status": "ok", "service": "sug-voting"}
