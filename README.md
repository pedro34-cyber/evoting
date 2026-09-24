SUG Electronic Voting System (Prototype)

Overview

This repository contains a prototype Student Union Government (SUG) electronic voting system. It prioritizes security, ballot secrecy, authentication, auditability, accessibility, and a modern UX.

This iteration implements Stage 1: Authentication and student registration (backend).

Tech stack (overall)
- Frontend: React, TypeScript, Vite, Tailwind CSS (not yet implemented)
- Backend: Python, FastAPI, SQLAlchemy, Pydantic
- Biometric: Python + OpenCV (planned)
- Database: PostgreSQL (via Docker Compose)
- Containerization: Docker, Docker Compose

Local development (Stage 1)

Prerequisites
- Docker & Docker Compose
- Python 3.10+ (for running backend locally without Docker)

Copy environment variables
- cp backend/.env.example backend/.env
- Edit backend/.env and set SECRET_KEY and BIOMETRIC_KEY

Start with Docker Compose (recommended)
- docker-compose up --build
- Backend will be available at http://localhost:8000

Or run backend locally
- cd backend
- python -m venv .venv
- source .venv/bin/activate
- pip install -r requirements.txt
- export DATABASE_URL=postgresql+psycopg2://postgres:postgres@localhost:5432/sug_voting
- export SECRET_KEY="replace-with-secure-random"
- export BIOMETRIC_KEY="replace-with-32byte-base64-url-safe"
- uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

API (Stage 1)
- POST /api/auth/register - Register a student
- POST /api/auth/login - Authenticate and retrieve JWT access token
- POST /api/biometric/enroll - Accept an encrypted biometric template and attach a reference to student (placeholder; templates stored encrypted)

Security notes and limitations
- Biometric pipeline not yet implemented. Enrollment accepts an encrypted template reference; raw images must never be stored.
- This is a research prototype. Do not use in production without third-party audit and compliance checks.

Next steps
- Implement frontend and camera integration
- Implement biometric microservice with OpenCV embeddings and liveness checks
- Implement elections, positions, candidates, anonymous ballot service
