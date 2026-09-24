Project plan: SUG Electronic Voting System

Progress (updated 2026-09-24T12:18 UTC):

Completed
- Stage 1: Backend skeleton (FastAPI), models for Student, initial auth endpoints, secure password hashing (Argon2), JWT tokens.
- Stage 2: Biometric enrollment scaffold: OpenCV-based face detection, normalized template generation, encryption (Fernet), stored encrypted templates, frontend scaffold with camera capture.
- Local dev: Backend running with sqlite for convenience, seeded a sample election.

Current work
- Implementing MVP voting flow and frontend-to-backend authenticated student flows:
  - Frontend login/register, profile, Vote Now flow
  - Backend: verify and enroll require authenticated student; ballot authorization uses authenticated student

Next steps
- Finish frontend wiring and start dev server locally (user machine) to test flow.
- Add admin RBAC and admin endpoints.
- Add rate limiting and audit logging.
- Stage 3: Replace placeholder embedding with model-based embeddings and liveness detection.

Notes
- Biometric templates are encrypted and never returned via API.
- Ballots are stored anonymously; votes are linked to voting credentials, not student identities.
- This is a prototype and not suitable for production without audits and certification.
