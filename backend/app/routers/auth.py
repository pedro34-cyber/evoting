from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, Field, EmailStr
from sqlalchemy.exc import IntegrityError
from .. import db, schemas, crud, security

router = APIRouter()

class RegisterRequest(BaseModel):
    full_name: str = Field(..., min_length=2)
    email: EmailStr
    registration_number: str = Field(..., min_length=3)
    password: str = Field(..., min_length=8)
    confirm_password: str = Field(..., min_length=8)


class LoginRequest(BaseModel):
    email: str | None = None
    registration_number: str | None = None
    password: str


@router.post("/register")
def register(req: RegisterRequest, db_session=Depends(db.get_db)):
    if req.password != req.confirm_password:
        raise HTTPException(status_code=400, detail="Passwords do not match")

    email = req.email.strip().lower()
    registration_number = req.registration_number.strip()
    if not email:
        raise HTTPException(status_code=400, detail="Email is required")
    if not registration_number:
        raise HTTPException(status_code=400, detail="Registration number is required")

    existing_email = crud.get_student_by_email(db_session, email)
    if existing_email:
        raise HTTPException(status_code=400, detail="Email already exists.")

    existing_reg = crud.get_student_by_registration_number(db_session, registration_number)
    if existing_reg:
        raise HTTPException(status_code=400, detail="Registration number already exists.")

    try:
        student = crud.create_student(
            db_session,
            req.full_name,
            registration_number,
            req.password,
            email=email,
            profile_image=None,
        )
    except IntegrityError:
        db_session.rollback()
        detail = "Email already exists." if crud.get_student_by_email(db_session, email) else "Registration number already exists."
        raise HTTPException(409, detail)
    return {
        "id": student.id,
        "email": student.email,
        "registration_number": student.registration_number,
        "profile_image": student.profile_image,
        "has_enrolled": bool(student.biometric_reference),
    }


from fastapi import Request
from ..rate_limiter import limiter
from ..audit import log_action

@router.post("/login")
@limiter.limit("5/minute")
def login(request: Request, req: LoginRequest, db_session=Depends(db.get_db)):
    login_value = (req.email or req.registration_number or '').strip()
    if not login_value:
        raise HTTPException(status_code=400, detail="Email or registration number is required.")

    student = crud.authenticate_student(db_session, login_value, req.password)
    if not student:
        log_action(db_session, "LOGIN_FAILED", request, target_resource=login_value)
        raise HTTPException(status_code=401, detail="Invalid email or password.")

    log_action(db_session, "LOGIN_SUCCESS", request, student_id=student.id, target_resource=student.registration_number)
    token = security.create_access_token(subject=str(student.id))
    return {
        "access_token": token,
        "token_type": "bearer",
        "is_admin": student.is_admin,
        "has_enrolled": bool(student.biometric_reference),
        "student_id": student.id,
        "email": student.email,
    }
