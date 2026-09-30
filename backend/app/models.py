from sqlalchemy import Column, Integer, String, DateTime, Text, ForeignKey, Enum, Boolean, Float
from sqlalchemy.orm import declarative_base, relationship
import enum
import datetime

Base = declarative_base()

class AccountStatus(str, enum.Enum):
    active = "active"
    locked = "locked"


class Student(Base):
    __tablename__ = "students"
    id = Column(Integer, primary_key=True, index=True)
    full_name = Column(String(256), nullable=False)
    email = Column(String(255), unique=True, nullable=True, index=True)
    registration_number = Column(String(64), unique=True, nullable=False, index=True)
    password_hash = Column(String(256), nullable=False)
    profile_image = Column(Text, nullable=True)
    biometric_reference = Column(Text, nullable=True)
    account_status = Column(Enum(AccountStatus), default=AccountStatus.active)
    is_admin = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)


class Election(Base):
    __tablename__ = "elections"
    id = Column(Integer, primary_key=True)
    name = Column(String(256), nullable=False)
    description = Column(Text, nullable=True)
    start_time = Column(DateTime, nullable=True)
    end_time = Column(DateTime, nullable=True)
    status = Column(String(32), default='draft')


class Position(Base):
    __tablename__ = "positions"
    id = Column(Integer, primary_key=True)
    election_id = Column(Integer, ForeignKey('elections.id'), nullable=False)
    name = Column(String(256), nullable=False)
    max_selections = Column(Integer, default=1)
    election = relationship('Election', backref='positions')


class Candidate(Base):
    __tablename__ = "candidates"
    id = Column(Integer, primary_key=True)
    election_id = Column(Integer, ForeignKey('elections.id'), nullable=False)
    position_id = Column(Integer, ForeignKey('positions.id'), nullable=False)
    full_name = Column(String(256), nullable=True)
    name = Column(String(256), nullable=True)
    manifesto = Column(Text, nullable=True)
    photo = Column(String(512), nullable=True)
    cgpa = Column(Float, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    election = relationship('Election', backref='candidates')
    position = relationship('Position', backref='candidates')


class VotingCredential(Base):
    __tablename__ = "voting_credentials"
    id = Column(Integer, primary_key=True)
    election_id = Column(Integer, ForeignKey('elections.id'), nullable=False)
    student_id = Column(Integer, ForeignKey('students.id'), nullable=True)
    token_hash = Column(String(256), nullable=False, index=True)
    status = Column(String(32), default='issued')
    issued_at = Column(DateTime, default=datetime.datetime.utcnow)
    used_at = Column(DateTime, nullable=True)
    expiration_time = Column(DateTime, nullable=True)


class Ballot(Base):
    __tablename__ = "ballots"
    id = Column(Integer, primary_key=True)
    election_id = Column(Integer, ForeignKey('elections.id'), nullable=False)
    encrypted_ballot = Column(Text, nullable=False)
    cast_at = Column(DateTime, default=datetime.datetime.utcnow)


class VerificationEvent(Base):
    __tablename__ = "verification_events"
    id = Column(Integer, primary_key=True)
    student_id = Column(Integer, ForeignKey('students.id'), nullable=True)
    election_id = Column(Integer, ForeignKey('elections.id'), nullable=True)
    verification_type = Column(String(64), nullable=True)
    result = Column(String(32), nullable=False)
    timestamp = Column(DateTime, default=datetime.datetime.utcnow)
    failure_reason = Column(Text, nullable=True)

class AuditLog(Base):
    __tablename__ = "audit_logs"
    id = Column(Integer, primary_key=True)
    student_id = Column(Integer, ForeignKey('students.id'), nullable=True)
    action = Column(String(128), nullable=False)
    target_resource = Column(String(256), nullable=True)
    ip_address = Column(String(64), nullable=True)
    timestamp = Column(DateTime, default=datetime.datetime.utcnow)
