from fastapi import APIRouter, HTTPException, Depends, UploadFile, File
from ..security import get_current_student
from .. import db, crud
from dotenv import load_dotenv
import os
import cv2
import numpy as np
import base64
from cryptography.fernet import Fernet
import logging

logger = logging.getLogger(__name__)
load_dotenv()

BIOMETRIC_KEY = os.getenv("BIOMETRIC_ENCRYPTION_KEY")

router = APIRouter()

# Initialize face detector and recognizer lazily to prevent errors if models are missing
# but we need them in memory to avoid reloading on every request.
_detector = None
_recognizer = None

def _get_models():
    global _detector, _recognizer
    if _detector is not None and _recognizer is not None:
        return _detector, _recognizer

    # Use paths relative to the current working directory (e.g. backend root in docker)
    yunet_path = os.getenv("YUNET_MODEL_PATH", "yunet.onnx")
    sface_path = os.getenv("SFACE_MODEL_PATH", "sface.onnx")

    if not os.path.exists(yunet_path) or not os.path.exists(sface_path):
        raise HTTPException(status_code=500, detail="Biometric models not found. Ensure yunet.onnx and sface.onnx are present.")

    # Initialize YuNet (detection)
    _detector = cv2.FaceDetectorYN.create(
        model=yunet_path,
        config="",
        input_size=(320, 320),
        score_threshold=0.8,
        nms_threshold=0.3,
        top_k=5000
    )
    # Initialize SFace (recognition)
    _recognizer = cv2.FaceRecognizerSF.create(
        model=sface_path,
        config=""
    )
    return _detector, _recognizer

def extract_face_feature(img: np.ndarray):
    detector, recognizer = _get_models()
    
    # Resize input for detector
    height, width = img.shape[:2]
    detector.setInputSize((width, height))
    
    # Detect faces
    status, faces = detector.detect(img)
    if faces is None or len(faces) == 0:
        raise ValueError("No face detected")
    if len(faces) > 1:
        raise ValueError("Multiple faces detected")
    
    # Align and crop the face
    face = faces[0]
    aligned_face = recognizer.alignCrop(img, face)
    
    # Extract feature (embedding)
    feature = recognizer.feature(aligned_face)
    return feature

@router.post("/enroll")
async def enroll(file: UploadFile = File(...), current_student = Depends(get_current_student)):
    """
    Authenticated endpoint: accepts an uploaded image file, performs face detection, ensures exactly one face,
    and stores an encrypted face representation on the authenticated student record.
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

    try:
        feature = extract_face_feature(img)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Extraction error: {e}")
        raise HTTPException(status_code=500, detail="Internal server error during face extraction")

    # Serialize feature to bytes, then base64
    feature_bytes = feature.tobytes()
    feature_b64 = base64.b64encode(feature_bytes).decode('utf-8')

    try:
        f = Fernet(BIOMETRIC_KEY.encode())
        token = f.encrypt(feature_b64.encode()).decode()
    except Exception:
        raise HTTPException(status_code=500, detail="Failed to encrypt biometric template")

    crud.store_biometric_reference(session, student.id, token)

    return {"status": "enrolled", "student_id": student.id}


async def _verify_image_for_student_obj(student_obj, file: UploadFile):
    if not student_obj or not student_obj.biometric_reference:
        return False, 0.0, 'no template'
        
    if not BIOMETRIC_KEY:
        return False, 0.0, 'Biometric encryption key not configured'

    # Decrypt stored embedding
    try:
        f = Fernet(BIOMETRIC_KEY.encode())
        decrypted = f.decrypt(student_obj.biometric_reference.encode())
        stored_b64 = decrypted.decode()
        stored_bytes = base64.b64decode(stored_b64)
        stored_feature = np.frombuffer(stored_bytes, dtype=np.float32).reshape(1, 128)
    except Exception as e:
        logger.error(f"Template decrypt error: {e}")
        return False, 0.0, 'template decrypt error'

    # Read uploaded image
    contents = await file.read()
    nparr = np.frombuffer(contents, np.uint8)
    probe_img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    if probe_img is None:
        return False, 0.0, 'invalid image'

    # Extract probe feature
    try:
        probe_feature = extract_face_feature(probe_img)
    except ValueError as e:
        return False, 0.0, f"Face detection failed: {str(e)}"
    except Exception as e:
        logger.error(f"Probe extraction error: {e}")
        return False, 0.0, "Internal error during probe extraction"

    # Verify using SFace match
    try:
        _, recognizer = _get_models()
        # Returns cosine similarity (higher is better). A common threshold is 0.363 for Cosine.
        score = recognizer.match(stored_feature, probe_feature, cv2.FaceRecognizerSF_FR_COSINE)
    except Exception as e:
        logger.error(f"Verification matching error: {e}")
        return False, 0.0, "Internal error during matching"

    # Strict enforcement threshold (user's env var or 0.363 as SFace standard)
    thresh = float(os.getenv('BIOMETRIC_MATCH_THRESHOLD', '0.363'))
    matched = bool(score >= thresh)

    return matched, float(score), '' if matched else f'score {score*100:.2f}% below {thresh*100:.2f}% threshold'


@router.post('/verify')
async def verify(file: UploadFile = File(...), current_student = Depends(get_current_student)):
    matched, score, reason = await _verify_image_for_student_obj(current_student, file)
    try:
        from ..crud_extra import record_verification_event
        session = next(db.get_db())
        record_verification_event(session, current_student.id, None, 'verification', 'success' if matched else 'failure', reason if not matched else None)
    except Exception as e:
        logger.error(f"Failed to record verification event: {e}")
    return {"matched": matched, "score": score, "reason": reason}
