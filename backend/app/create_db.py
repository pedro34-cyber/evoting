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
        conn.execute(text('ALTER TABLE students ADD COLUMN is_admin BOOLEAN DEFAULT FALSE'))


def ensure_student_email_column():
    with engine.begin() as conn:
        columns = inspect(conn).get_columns('students')
        if any(column['name'] == 'email' for column in columns):
            return
        conn.execute(text('ALTER TABLE students ADD COLUMN email VARCHAR(255)'))
        conn.execute(text('CREATE UNIQUE INDEX IF NOT EXISTS ix_students_email ON students (email)'))


def ensure_candidate_columns():
    with engine.begin() as conn:
        columns = inspect(conn).get_columns('candidates')
        if not any(column['name'] == 'full_name' for column in columns):
            conn.execute(text('ALTER TABLE candidates ADD COLUMN full_name VARCHAR(256)'))
        if not any(column['name'] == 'cgpa' for column in columns):
            conn.execute(text('ALTER TABLE candidates ADD COLUMN cgpa FLOAT'))
        if not any(column['name'] == 'created_at' for column in columns):
            conn.execute(text('ALTER TABLE candidates ADD COLUMN created_at TIMESTAMP'))


def ensure_default_admin():
    db = SessionLocal()
    try:
        admin_reg = os.getenv("ADMIN_REGISTRATION_NUMBER")
        admin_password = os.getenv("ADMIN_PASSWORD")
        admin_email = os.getenv("ADMIN_EMAIL", "").strip().lower()
        if not admin_reg or not admin_password or not admin_email:
            return None
        existing = db.query(Student).filter(Student.registration_number == admin_reg).first()
        if existing:
            if not existing.is_admin:
                raise RuntimeError("Configured administrator identifier belongs to a student.")
            if not existing.email:
                existing.email = admin_email
                db.commit()
            return existing

        admin = Student(
            full_name="System Administrator",
            email=admin_email,
            registration_number=admin_reg,
            password_hash=argon2.hash(admin_password),
            account_status=AccountStatus.active,
            is_admin=True
        )
        db.add(admin)
        db.commit()
        db.refresh(admin)
        return admin
    finally:
        db.close()


def create_all():
    Base.metadata.create_all(bind=engine)
    ensure_student_profile_image_column()
    ensure_student_admin_column()
    ensure_student_email_column()
    ensure_candidate_columns()
    ensure_default_admin()


if __name__ == "__main__":
    create_all()
    print("Database tables created.")
