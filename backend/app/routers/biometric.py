from fastapi import APIRouter, HTTPException, Depends, UploadFile, File
from ..security import get_current_student
from .. import db, crud
from dotenv import load_dotenv
import os
import cv2
import numpy as np
from cryptography.fernet import Fernet

load_dotenv()
BIOMETRIC_KEY = os.getenv("BIOMETRIC_ENCRYPTION_KEY")

router = APIRouter()


@router.post("/enroll")
async def enroll(file: UploadFile = File(...), current_student = Depends(get_current_student)):
    """
    Authenticated endpoint: accepts an uploaded image file, performs face detection, ensures exactly one face,
    computes a normalized face template and stores an encrypted template reference on the authenticated student record.
    Raw images are NOT stored.
    """
    session = next(db.get_db())
    student = current_student
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")

    if not BIOMETRIC_KEY:
        raise HTTPException(status_code=500, detail="Biometric encryption key not configured")

    contents = await file.read()
    nparr = np.frombuffer(contents, np.uint8)
    img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    if img is None:
        raise HTTPException(status_code=400, detail="Invalid image file")

    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)

    cascade_path = cv2.data.haarcascades + "haarcascade_frontalface_default.xml"
    face_cascade = cv2.CascadeClassifier(cascade_path)
    faces = face_cascade.detectMultiScale(gray, scaleFactor=1.1, minNeighbors=5, minSize=(80,80))

    if len(faces) == 0:
        raise HTTPException(status_code=400, detail="No face detected")
    if len(faces) > 1:
        raise HTTPException(status_code=400, detail="Multiple faces detected")

    (x, y, w, h) = faces[0]
    face_img = gray[y:y+h, x:x+w]
    face_resized = cv2.resize(face_img, (160, 160))

    # encode normalized face and encrypt
    face_bytes = face_resized.tobytes()
    import base64
    face_b64 = base64.b64encode(face_bytes).decode()

    try:
        f = Fernet(BIOMETRIC_KEY.encode())
        token = f.encrypt(face_b64.encode()).decode()
    except Exception:
        raise HTTPException(status_code=500, detail="Failed to encrypt biometric template")

    crud.store_biometric_reference(session, student.id, token)

    return {"status": "enrolled", "student_id": student.id}


async def _verify_image_for_student_obj(student_obj, file: UploadFile):
    import base64
    if not student_obj or not student_obj.biometric_reference:
        return False, 0.0, 'no template'
    try:
        f = Fernet(BIOMETRIC_KEY.encode())
        decrypted = f.decrypt(student_obj.biometric_reference.encode())
        stored_b64 = decrypted.decode()
        stored_bytes = base64.b64decode(stored_b64)
        stored_arr = np.frombuffer(stored_bytes, dtype=np.uint8).astype(np.float32)/255.0
        stored_vec = stored_arr.flatten()
        stored_norm = stored_vec / (np.linalg.norm(stored_vec) + 1e-8)
    except Exception:
        return False, 0.0, 'template decrypt error'

    contents = await file.read()
    nparr = np.frombuffer(contents, np.uint8)
    img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    if img is None:
        return False, 0.0, 'invalid image'
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    cascade_path = cv2.data.haarcascades + "haarcascade_frontalface_default.xml"
    face_cascade = cv2.CascadeClassifier(cascade_path)
    faces = face_cascade.detectMultiScale(gray, scaleFactor=1.1, minNeighbors=5, minSize=(80,80))
    if len(faces) == 0:
        return False, 0.0, 'no face detected'
    if len(faces) > 1:
        return False, 0.0, 'multiple faces detected'
    (x, y, w, h) = faces[0]
    face_img = gray[y:y+h, x:x+w]
    face_resized = cv2.resize(face_img, (160, 160))
    probe_arr = face_resized.astype(np.float32).flatten()/255.0
    probe_norm = probe_arr / (np.linalg.norm(probe_arr) + 1e-8)
    score = float(np.dot(stored_norm, probe_norm))
    try:
        thresh = float(os.getenv('BIOMETRIC_MATCH_THRESHOLD', '0.80'))
    except Exception:
        thresh = 0.80
    matched = score >= thresh
    return matched, score, '' if matched else 'score below threshold'


@router.post('/verify')
async def verify(file: UploadFile = File(...), current_student = Depends(get_current_student)):
    matched, score, reason = await _verify_image_for_student_obj(current_student, file)
    try:
        from ..crud_extra import record_verification_event
        session = next(db.get_db())
        record_verification_event(session, current_student.id, None, 'verification', 'success' if matched else 'failure', reason if not matched else None)
    except Exception:
        pass
    return {"matched": matched, "score": score, "reason": reason}
