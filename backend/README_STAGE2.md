Stage 2: Camera integration & Biometric Enrollment

What was added:
- Frontend scaffold: /frontend (Vite + React + TypeScript)
  - Registration page using getUserMedia to capture a photo and POST it to /api/biometric/enroll
- Backend biometric enrollment implementation at POST /api/biometric/enroll
  - Accepts multipart/form-data (student_id, file image)
  - Uses OpenCV Haar cascade to detect exactly one face
  - Produces a simple template (sha256 of normalized face pixels) as a placeholder embedding
  - Encrypts the template using Fernet (BIOMETRIC_ENCRYPTION_KEY environment variable required)
  - Stores the encrypted template as student.biometric_reference
  - Does NOT store raw images

How to run locally (quick):
1. Backend (already running via uvicorn in current session) uses sqlite:///./sug_dev.db by default when run via provided helper command.
2. Start frontend:
   - cd frontend
   - npm install
   - npm run dev
   - Open http://localhost:3000

Security notes:
- The embedding algorithm used here is a placeholder. Replace with a proper face-embedding model in Stage 3.
- BIOMETRIC_ENCRYPTION_KEY must be a 32-byte urlsafe-base64 string usable by Fernet.
- Ensure HTTPS for production

Next: Stage 3 - implement face-embedding model and liveness detection service, replace placeholder embedding with real vectors, and implement verify endpoint.
