from . import models
from sqlalchemy.orm import Session
from sqlalchemy import or_
from passlib.hash import argon2


def get_student_by_registration_number(db: Session, reg_no: str):
    if not reg_no:
        return None
    return db.query(models.Student).filter(models.Student.registration_number == reg_no).first()


def get_student_by_email(db: Session, email: str):
    if not email:
        return None
    normalized = email.strip().lower()
    return db.query(models.Student).filter(models.Student.email == normalized).first()


def get_student(db: Session, student_id: int):
    return db.query(models.Student).filter(models.Student.id == student_id).first()


def create_student(db: Session, full_name: str, reg_no: str, password: str, email: str | None = None, profile_image: str | None = None):
    hashed = argon2.hash(password)
    student = models.Student(
        full_name=full_name,
        email=(email or '').strip().lower() or None,
        registration_number=reg_no,
        password_hash=hashed,
        profile_image=profile_image,
    )
    db.add(student)
    db.commit()
    db.refresh(student)
    return student


def authenticate_student(db: Session, login_value: str, password: str):
    if not login_value:
        return None
    value = login_value.strip()
    student = db.query(models.Student).filter(
        or_(models.Student.email == value.lower(), models.Student.registration_number == value)
    ).first()
    if not student:
        return None
    try:
        if argon2.verify(password, student.password_hash):
            return student
    except Exception:
        return None
    return None


def store_biometric_reference(db: Session, student_id: int, encrypted_template: str):
    changed = db.query(models.Student).filter(
        models.Student.id == student_id,
        models.Student.biometric_reference.is_(None),
    ).update({"biometric_reference": encrypted_template}, synchronize_session=False)
    db.commit()
    if not changed:
        return None
    db.expire_all()
    return get_student(db, student_id)
