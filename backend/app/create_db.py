import os
from sqlalchemy import inspect, text
from .models import Base, Student, AccountStatus
from .db import engine, SessionLocal
from passlib.hash import argon2


def ensure_student_profile_image_column():
    with engine.begin() as conn:
        columns = inspect(conn).get_columns('students')
        if any(column['name'] == 'profile_image' for column in columns):
            return
        conn.execute(text('ALTER TABLE students ADD COLUMN profile_image TEXT'))

def ensure_student_admin_column():
    with engine.begin() as conn:
        columns = inspect(conn).get_columns('students')
        if any(column['name'] == 'is_admin' for column in columns):
            return
        conn.execute(text('ALTER TABLE students ADD COLUMN is_admin BOOLEAN DEFAULT 0'))


def ensure_default_admin():
    db = SessionLocal()
    try:
        admin_reg = os.getenv("ADMIN_REGISTRATION_NUMBER", "ADMIN001")
        admin_password = os.getenv("ADMIN_PASSWORD", "Admin@12345")
        existing = db.query(Student).filter(Student.registration_number == admin_reg).first()
        if existing:
            if not existing.is_admin:
                existing.is_admin = True
                db.commit()
            return existing

        admin = Student(
            full_name="System Administrator",
            registration_number=admin_reg,
            password_hash=argon2.hash(admin_password),
            account_status=AccountStatus.active,
            is_admin=True
        )
        db.add(admin)
        db.commit()
        db.refresh(admin)
        print(f"Default admin created with registration number: {admin_reg} and password: {admin_password}")
        return admin
    finally:
        db.close()


def create_all():
    Base.metadata.create_all(bind=engine)
    ensure_student_profile_image_column()
    ensure_student_admin_column()
    ensure_default_admin()


if __name__ == "__main__":
    create_all()
    print("Database tables created.")
