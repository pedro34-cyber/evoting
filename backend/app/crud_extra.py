from . import models
from sqlalchemy.orm import Session
import hashlib
from datetime import datetime


def create_voting_credential(db: Session, election_id: int, token: str, expires_at):
    token_hash = hashlib.sha256(token.encode()).hexdigest()
    vc = models.VotingCredential(election_id=election_id, token_hash=token_hash, status='issued', issued_at=datetime.utcnow(), expiration_time=expires_at)
    db.add(vc)
    db.commit()
    db.refresh(vc)
    return vc


def get_voting_credential_by_hash(db: Session, token_hash: str):
    return db.query(models.VotingCredential).filter(models.VotingCredential.token_hash == token_hash).first()


def record_verification_event(db: Session, student_id: int, election_id: int | None, verification_type: str, result: str, failure_reason: str | None = None):
    ev = models.VerificationEvent(student_id=student_id, election_id=election_id, verification_type=verification_type, result=result, failure_reason=failure_reason)
    db.add(ev)
    db.commit()
    db.refresh(ev)
    return ev
