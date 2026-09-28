from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, Field
from .. import db, schemas, crud, security

router = APIRouter()

class RegisterRequest(BaseModel):
    full_name: str = Field(..., min_length=2)
    registration_number: str = Field(..., min_length=3)
    password: str = Field(..., min_length=8)
    confirm_password: str = Field(..., min_length=8)
    profile_image: str | None = None


class LoginRequest(BaseModel):
    registration_number: str
    password: str


@router.post("/register")
def register(req: RegisterRequest, db_session=Depends(db.get_db)):
    if req.password != req.confirm_password:
        raise HTTPException(status_code=400, detail="Passwords do not match")
    existing = crud.get_student_by_registration_number(db_session, req.registration_number)
    if existing:
        raise HTTPException(status_code=400, detail="Registration number already exists")
    student = crud.create_student(
        db_session,
        req.full_name,
        req.registration_number,
        req.password,
        profile_image=req.profile_image,
    )
    return {
        "id": student.id,
        "registration_number": student.registration_number,
        "profile_image": student.profile_image,
    }


from fastapi import Request
from ..rate_limiter import limiter
from ..audit import log_action

@router.post("/login")
@limiter.limit("5/minute")
def login(request: Request, req: LoginRequest, db_session=Depends(db.get_db)):
    student = crud.authenticate_student(db_session, req.registration_number, req.password)
    if not student:
        # We can't log the student_id since it failed, but we log the attempt
        log_action(db_session, "LOGIN_FAILED", request, target_resource=req.registration_number)
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    log_action(db_session, "LOGIN_SUCCESS", request, student_id=student.id, target_resource=req.registration_number)
    token = security.create_access_token(subject=str(student.id))
    return {"access_token": token, "token_type": "bearer", "is_admin": student.is_admin}
