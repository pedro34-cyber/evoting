# SUG Electronic Voting System

React/TypeScript frontend, FastAPI/SQLAlchemy backend, and the existing OpenCV YuNet/SFace face recognition pipeline.

Students register with a name, email, registration number, and password. Authentication directs unenrolled students to `/enroll`; enrollment accepts a still photo. Administrators manage elections, positions, candidate photos, CGPAs, and manifestos. Student pages poll the database-backed election API every second.

## Local development

Install `backend/requirements.txt` in a Python environment and run `npm ci` in `frontend`. Configure the backend environment:

- `DATABASE_URL`: SQLite locally, or a PostgreSQL connection string.
- `SECRET_KEY`: a private, randomly generated JWT signing key.
- `BIOMETRIC_ENCRYPTION_KEY`: a Fernet key generated with `Fernet.generate_key()`.
- `YUNET_MODEL_PATH` and `SFACE_MODEL_PATH`: recognition model files; defaults are `yunet.onnx` and `sface.onnx` in the backend directory.
- `ADMIN_EMAIL`, `ADMIN_REGISTRATION_NUMBER`, `ADMIN_PASSWORD`: explicitly configured administrator credentials. There is no built-in administrator password. For an existing administrator without email, configure its existing registration number and desired email.

From `backend`, run `uvicorn app.main:app --host 127.0.0.1 --port 8000`. From `frontend`, run `npm run dev`. Vite serves port 3000 and proxies `/api` and `/uploads` to the backend. Set `VITE_API_URL` only when using a separate API origin.

Candidate uploads are validated, decoded, and re-encoded as JPEGs under `backend/app/static/uploads/candidates`. Face images are processed without storing the original image; only encrypted face features are persisted. Enrollment cannot replace an existing template.

## Local verification

From `backend`, run:

```sh
python -m unittest discover -s tests -v
```

The suite uses an isolated temporary SQLite database. Real biometric tests require the model files and `test_faces/face1.jpg`, `face2.jpg`, and `no_face.jpg`; missing fixtures are reported as skipped. It checks real face matching, access control, duplicate registration, image validation, election edits, ballot validity, credential replacement, cross-election token rejection, and simultaneous duplicate casts. Rate limiting is disabled only inside the API test process.

For browser tests, stop any application backend on port 8000 and run `python tests/run_local_server.py` from `backend`. This creates a disposable database and a test administrator. Start Vite, then run from the repository root:

```sh
node frontend/tests/local-flow.mjs
```

The browser script requires Puppeteer. If it is installed outside this project, set `PUPPETEER_PATH` to its JavaScript entry file. Student and admin use separate browser sessions. The test uses real HTTP requests and recognition models without mocked responses. A physical phone is still needed to verify the operating system's native camera picker.

From `frontend`, run `npx tsc --noEmit` and `npm run build`.

## Voting behavior

Biometric authorization issues a short-lived hashed credential. Casting locks the student and credential, validates the election and selections, marks the credential used, and inserts a ballot in one transaction. PostgreSQL uses row locks; local SQLite uses `BEGIN IMMEDIATE`. Used credentials prevent another vote even if a different token is presented. Ballots contain no student or credential foreign key.

The existing ballot wire format is base64-encoded JSON; base64 is not encryption. This refactor retains that format and the existing anonymous storage architecture. No deployment or push is performed by the local test scripts.
