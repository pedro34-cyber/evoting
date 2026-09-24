from fastapi import FastAPI
from .api import router as api_router
from .create_db import create_all

app = FastAPI(title="SUG Voting Backend")

app.include_router(api_router, prefix="/api")

@app.on_event("startup")
def on_startup():
    # Create DB tables if they don't exist (development convenience)
    create_all()

@app.get("/")
def root():
    return {"status": "ok", "service": "sug-voting"}
