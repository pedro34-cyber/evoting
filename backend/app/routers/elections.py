from fastapi import APIRouter, HTTPException, UploadFile, File, Depends
from typing import List
from .. import db, crud, models, schemas
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
import secrets
import hashlib
import base64
import json
from sqlalchemy import text
from ..security import get_current_student

router = APIRouter()

@router.get("/elections", response_model=List[schemas.ElectionOut])
def list_elections(session=Depends(db.get_db)):
    return session.query(models.Election).order_by(models.Election.id.desc()).all()

@router.get("/elections/active", response_model=schemas.ElectionOut | None)
def get_active_election(session=Depends(db.get_db)):
    election = session.query(models.Election).filter(models.Election.status == 'active').order_by(models.Election.id.desc()).first()
    if not election:
        return None
    return election

@router.get("/elections/{election_id}", response_model=schemas.ElectionOut)
def get_election(election_id: int, session=Depends(db.get_db)):
    election = session.query(models.Election).filter(models.Election.id == election_id).first()
    if not election:
        raise HTTPException(status_code=404, detail="Election not found")
    return election

@router.get("/elections/{election_id}/candidates")
def get_candidates(election_id: int, session=Depends(db.get_db)):
    return session.query(models.Candidate).filter(models.Candidate.election_id == election_id).all()




from fastapi import Request
from ..rate_limiter import limiter
from ..audit import log_action

def require_active(session, election_id):
    election = session.query(models.Election).filter_by(id=election_id).first()
    now = datetime.utcnow()
    if not election:
        raise HTTPException(404, "Election not found.")
    if election.status != 'active' or (election.start_time and election.start_time > now) or (election.end_time and election.end_time <= now):
        raise HTTPException(409, "This election is not open for voting.")
    return election


def lock_student(session, student_id):
    # SQLite has no row locks: serialize writers before reading credentials.
    # PostgreSQL retains the existing SELECT FOR UPDATE row-lock architecture.
    if session.bind.dialect.name == 'sqlite':
        session.execute(text("BEGIN IMMEDIATE"))
    student = session.query(models.Student).filter_by(id=student_id).with_for_update().first()
    if not student or not student.biometric_reference or student.is_admin or student.account_status != models.AccountStatus.active:
        raise HTTPException(403, "An active, face-enrolled student account is required.")
    return student


def reject_previous_vote(session, election_id, student_id):
    if session.query(models.VotingCredential).filter_by(election_id=election_id, student_id=student_id, status='used').first():
        raise HTTPException(403, "You have already voted in this election.")


@router.post("/elections/{election_id}/ballot/authorize")
@limiter.limit("3/minute")
async def authorize_ballot(request: Request, election_id: int, file: UploadFile = File(...), current_student=Depends(get_current_student)):
    try:
        from .biometric import _verify_image_for_student_obj
        with db.SessionLocal() as session:
            lock_student(session, current_student.id)
            require_active(session, election_id)
            reject_previous_vote(session, election_id, current_student.id)
            matched, score, reason = await _verify_image_for_student_obj(current_student, file)
            if not matched:
                raise HTTPException(403, "Face verification failed: " + reason)
            # Replace outstanding credentials, never a used credential.
            session.query(models.VotingCredential).filter_by(election_id=election_id, student_id=current_student.id, status='issued').update({'status': 'revoked'})
            token = secrets.token_urlsafe(32)
            expires = datetime.utcnow() + timedelta(minutes=5)
            session.add(models.VotingCredential(election_id=election_id, student_id=current_student.id, status='issued', expiration_time=expires, token_hash=hashlib.sha256(token.encode()).hexdigest()))
            session.commit()
            log_action(session, "AUTHORIZATION_GRANTED", request, student_id=current_student.id, target_resource=f"election_{election_id}")
            return {"voting_token": token, "expires_at": expires.isoformat()}
    except HTTPException as exc:
        # Record failures after the transaction context releases its locks.
        with db.SessionLocal() as audit_session:
            log_action(audit_session, "AUTHORIZATION_FAILED", request, student_id=current_student.id, target_resource=f"election_{election_id}", failure_reason=str(exc.detail))
        raise


from pydantic import BaseModel, Field

class CastBallotRequest(BaseModel):
    voting_token: str = Field(min_length=1, max_length=256)
    encrypted_ballot: str = Field(min_length=1, max_length=65536)


@router.post("/elections/{election_id}/ballot/cast")
@limiter.limit("3/minute")
async def cast_ballot(request: Request, election_id: int, body: CastBallotRequest):
    try:
        token_hash = hashlib.sha256(body.voting_token.encode()).hexdigest()
        with db.SessionLocal() as lookup:
            credential = lookup.query(models.VotingCredential).filter_by(token_hash=token_hash).first()
            if not credential or credential.election_id != election_id:
                raise HTTPException(403, "Invalid voting token.")
            student_id = credential.student_id
        with db.SessionLocal() as session:
            lock_student(session, student_id)
            election = require_active(session, election_id)
            reject_previous_vote(session, election_id, student_id)
            vc = session.query(models.VotingCredential).filter_by(token_hash=token_hash, election_id=election_id).with_for_update().first()
            if not vc or vc.status != 'issued' or not vc.expiration_time or vc.expiration_time <= datetime.utcnow():
                raise HTTPException(403, "Voting token expired or used.")
            try:
                selections = json.loads(base64.b64decode(body.encrypted_ballot, validate=True))
                if not isinstance(selections, dict) or not election.positions or set(selections) != {str(p.id) for p in election.positions}:
                    raise ValueError()
                for position in election.positions:
                    selected = selections[str(position.id)]
                    if type(selected) is not int or selected not in {c.id for c in position.candidates}:
                        raise ValueError()
            except (ValueError, TypeError):
                raise HTTPException(400, "The ballot no longer matches this election. Please select a candidate for every position again.")
            # Ballots intentionally have no student or credential reference.
            session.add(models.Ballot(election_id=election_id, encrypted_ballot=body.encrypted_ballot))
            vc.status = 'used'
            vc.used_at = datetime.utcnow()
            session.commit()
            log_action(session, "VOTE_CAST", request, student_id=student_id, target_resource=f"election_{election_id}")
            return {"status": "cast"}
    except HTTPException as exc:
        # Record failures after the transaction context releases its locks.
        with db.SessionLocal() as audit_session:
            log_action(audit_session, "VOTE_CAST_FAILED", request, student_id=None, target_resource=f"election_{election_id}", failure_reason=str(exc.detail))
        raise
