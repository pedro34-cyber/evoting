from fastapi import APIRouter
from .routers import auth, biometric, elections, student, admin

router = APIRouter()

router.include_router(auth.router, prefix="/auth", tags=["auth"])
router.include_router(biometric.router, prefix="/biometric", tags=["biometric"])
router.include_router(elections.router, prefix="", tags=["elections"])
router.include_router(student.router, prefix="", tags=["student"])
router.include_router(admin.router, prefix="/admin", tags=["admin"])
