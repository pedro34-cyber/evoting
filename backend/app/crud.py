from . import models
from sqlalchemy.orm import Session
from passlib.hash import argon2


def get_student_by_registration_number(db: Session, reg_no: str):
    return db.query(models.Student).filter(models.Student.registration_number == reg_no).first()


def get_student(db: Session, student_id: int):
    return db.query(models.Student).filter(models.Student.id == student_id).first()


def create_student(db: Session, full_name: str, reg_no: str, password: str, profile_image: str | None = None):
    hashed = argon2.hash(password)
    student = models.Student(
        full_name=full_name,
        registration_number=reg_no,
        password_hash=hashed,
        profile_image=profile_image,
    )
    db.add(student)
    db.commit()
    db.refresh(student)
    return student


def authenticate_student(db: Session, reg_no: str, password: str):
    student = get_student_by_registration_number(db, reg_no)
    if not student:
        return None
    try:
        if argon2.verify(password, student.password_hash):
            return student
    except Exception:
        return None
    return None


def store_biometric_reference(db: Session, student_id: int, encrypted_template: str):
    student = get_student(db, student_id)
    if not student:
        return None
    student.biometric_reference = encrypted_template
    db.add(student)
    db.commit()
    db.refresh(student)
    return student
