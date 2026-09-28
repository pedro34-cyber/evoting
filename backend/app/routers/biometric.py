from fastapi import APIRouter, HTTPException, Depends, UploadFile, File
from ..security import get_current_student
from .. import db, crud
from dotenv import load_dotenv
import os
import cv2
import numpy as np
import base64
import tempfile
from cryptography.fernet import Fernet
import uuid

load_dotenv()
BIOMETRIC_KEY = os.getenv("BIOMETRIC_ENCRYPTION_KEY")

router = APIRouter()


@router.post("/enroll")
async def enroll(file: UploadFile = File(...), current_student = Depends(get_current_student)):
    """
    Authenticated endpoint: accepts an uploaded image file, performs face detection, ensures exactly one face,
    and stores an encrypted face image on the authenticated student record.
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

    # Detect face to ensure at least one face exists before enrolling
    from deepface import DeepFace
    try:
        faces = DeepFace.extract_faces(img_path=img, enforce_detection=True)
        if len(faces) == 0:
            raise HTTPException(status_code=400, detail="No face detected")
        if len(faces) > 1:
            raise HTTPException(status_code=400, detail="Multiple faces detected")
    except ValueError:
        raise HTTPException(status_code=400, detail="No face detected")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Face extraction error: {str(e)}")

    # We store the original image as a JPEG for best verification accuracy
    _, buffer = cv2.imencode('.jpg', img)
    face_b64 = base64.b64encode(buffer).decode('utf-8')

    try:
        f = Fernet(BIOMETRIC_KEY.encode())
        token = f.encrypt(face_b64.encode()).decode()
    except Exception:
        raise HTTPException(status_code=500, detail="Failed to encrypt biometric template")

    crud.store_biometric_reference(session, student.id, token)

    return {"status": "enrolled", "student_id": student.id}


async def _verify_image_for_student_obj(student_obj, file: UploadFile):
    from deepface import DeepFace
    if not student_obj or not student_obj.biometric_reference:
        return False, 0.0, 'no template'
        
    if not BIOMETRIC_KEY:
        return False, 0.0, 'Biometric encryption key not configured'

    # Decrypt stored image
    try:
        f = Fernet(BIOMETRIC_KEY.encode())
        decrypted = f.decrypt(student_obj.biometric_reference.encode())
        stored_b64 = decrypted.decode()
        stored_bytes = base64.b64decode(stored_b64)
        stored_arr = np.frombuffer(stored_bytes, dtype=np.uint8)
        stored_img = cv2.imdecode(stored_arr, cv2.IMREAD_COLOR)
        if stored_img is None:
            return False, 0.0, 'stored image corrupt'
    except Exception as e:
        return False, 0.0, f'template decrypt error: {str(e)}'

    # Read uploaded image
    contents = await file.read()
    nparr = np.frombuffer(contents, np.uint8)
    probe_img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    if probe_img is None:
        return False, 0.0, 'invalid image'

    # Verify using DeepFace
    try:
        result = DeepFace.verify(
            img1_path=stored_img,
            img2_path=probe_img,
            model_name="VGG-Face",
            distance_metric="cosine",
            enforce_detection=True
        )
    except ValueError as e:
        return False, 0.0, f"Face detection failed: {str(e)}"
    except Exception as e:
        return False, 0.0, f"Verification error: {str(e)}"

    distance = result.get("distance", 1.0)
    # Convert cosine distance to a similarity percentage (0 to 1)
    score = 1.0 - distance
    
    # Strictly enforce 95% match rate (0.95 similarity)
    thresh = float(os.getenv('BIOMETRIC_MATCH_THRESHOLD', '0.95'))
    matched = score >= thresh

    return matched, score, '' if matched else f'score {score*100:.2f}% below {thresh*100}% threshold'


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
