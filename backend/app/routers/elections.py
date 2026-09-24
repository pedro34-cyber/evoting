from fastapi import APIRouter, HTTPException, UploadFile, File, Depends
from typing import List
from .. import db, crud, models
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
import secrets
import hashlib
from ..security import get_current_student

router = APIRouter()

@router.get("/elections")
def list_elections():
    session = next(db.get_db())
    return session.query(models.Election).all()

@router.get("/elections/{election_id}")
def get_election(election_id: int):
    session = next(db.get_db())
    election = session.query(models.Election).filter(models.Election.id == election_id).first()
    if not election:
        raise HTTPException(status_code=404, detail="Election not found")
    return election

@router.get("/elections/{election_id}/candidates")
def get_candidates(election_id: int):
    session = next(db.get_db())
    return session.query(models.Candidate).filter(models.Candidate.election_id == election_id).all()


@router.post("/elections/{election_id}/voting-session")
def create_voting_session(election_id: int, student_id: int):
    # Issue a short-lived voting session token (not the final one-time vote credential)
    session = next(db.get_db())
    election = session.query(models.Election).filter(models.Election.id == election_id).first()
    if not election:
        raise HTTPException(status_code=404, detail="Election not found")
    # check student exists
    student = session.query(models.Student).filter(models.Student.id == student_id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")
    token = secrets.token_urlsafe(24)
    expires = datetime.utcnow() + timedelta(minutes=15)
    vc = models.VotingCredential(election_id=election_id, student_id=student_id, status='issued', issued_at=datetime.utcnow(), expiration_time=expires, token_hash=hashlib.sha256(token.encode()).hexdigest())
    session.add(vc)
    session.commit()
    session.refresh(vc)
    return {"voting_session_token": token, "expires_at": expires.isoformat()}


@router.post("/elections/{election_id}/ballot/authorize")
async def authorize_ballot(election_id: int, file: UploadFile = File(...), current_student = Depends(get_current_student)):
    # Perform biometric verification using the biometric module for the authenticated student
    from .biometric import _verify_image_for_student_obj
    matched, score, reason = await _verify_image_for_student_obj(current_student, file)
    if not matched:
        raise HTTPException(status_code=403, detail=f"Verification failed: {reason}")
    # Issue one-time voting credential
    session = next(db.get_db())
    token = secrets.token_urlsafe(32)
    expires = datetime.utcnow() + timedelta(minutes=5)
    vc = models.VotingCredential(election_id=election_id, student_id=current_student.id, status='issued', issued_at=datetime.utcnow(), expiration_time=expires, token_hash=hashlib.sha256(token.encode()).hexdigest())
    session.add(vc)
    session.commit()
    session.refresh(vc)
    return {"voting_token": token, "expires_at": expires.isoformat()}

@router.post("/elections/{election_id}/ballot/cast")
async def cast_ballot(election_id: int, voting_token: str, encrypted_ballot: str):
    session = next(db.get_db())
    # Verify token
    token_hash = hashlib.sha256(voting_token.encode()).hexdigest()
    vc = session.query(models.VotingCredential).filter(models.VotingCredential.token_hash == token_hash).first()
    if not vc:
        raise HTTPException(status_code=403, detail="Invalid voting token")
    if vc.status != 'issued' or (vc.expiration_time and vc.expiration_time < datetime.utcnow()):
        raise HTTPException(status_code=403, detail="Voting token expired or used")
    # Prevent double voting: mark used and store ballot (anonymous)
    ballot = models.Ballot(election_id=election_id, encrypted_ballot=encrypted_ballot, cast_at=datetime.utcnow())
    session.add(ballot)
    vc.status = 'used'
    vc.used_at = datetime.utcnow()
    session.add(vc)
    session.commit()
    return {"status": "cast", "ballot_id": ballot.id}
