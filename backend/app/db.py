from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
import os
from dotenv import load_dotenv

load_dotenv()

# Default to a local sqlite file for developer convenience when DATABASE_URL is not set.
# In production, set DATABASE_URL to a Postgres (or other) connection string via environment variables.
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./sug.db")

# Use sqlite connect args when appropriate (required for some environments like FastAPI dev server)
if DATABASE_URL.startswith("sqlite"):
    engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False}, echo=False)
else:
    engine = create_engine(DATABASE_URL, echo=False)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
