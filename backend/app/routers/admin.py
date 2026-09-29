from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session
from typing import List
import base64
import json

from .. import db, models, schemas
from ..security import get_current_admin
from ..rate_limiter import limiter
from ..audit import log_action

router = APIRouter()

@router.get("/elections", response_model=List[schemas.ElectionOut])
@limiter.limit("20/minute")
def list_elections(request: Request, db_session: Session = Depends(db.get_db), admin: models.Student = Depends(get_current_admin)):
    elections = db_session.query(models.Election).all()
    log_action(db_session, "LIST_ELECTIONS", request, student_id=admin.id)
    return elections

@router.post("/elections", response_model=schemas.ElectionOut)
@limiter.limit("5/minute")
def create_election(request: Request, election: schemas.ElectionCreate, db_session: Session = Depends(db.get_db), admin: models.Student = Depends(get_current_admin)):
    new_election = models.Election(**election.model_dump())
    db_session.add(new_election)
    db_session.commit()
    db_session.refresh(new_election)
    log_action(db_session, "CREATE_ELECTION", request, student_id=admin.id, target_resource=f"election_{new_election.id}")
    return new_election

@router.get("/elections/{election_id}/results")
@limiter.limit("10/minute")
def get_election_results(request: Request, election_id: int, db_session: Session = Depends(db.get_db), admin: models.Student = Depends(get_current_admin)):
    election = db_session.query(models.Election).filter(models.Election.id == election_id).first()
    if not election:
        raise HTTPException(status_code=404, detail="Election not found")
        
    log_action(db_session, "VIEW_ELECTION_RESULTS", request, student_id=admin.id, target_resource=f"election_{election_id}")
        
    ballots = db_session.query(models.Ballot).filter(models.Ballot.election_id == election_id).all()
    
    # Tally results
    results = {}
    for pos in election.positions:
        results[pos.id] = {
            "position_name": pos.name,
            "candidates": {c.id: {"name": c.name, "votes": 0} for c in pos.candidates}
        }
        
    valid_ballots = 0
    for ballot in ballots:
        try:
            # Decode base64
            decoded = base64.b64decode(ballot.encrypted_ballot).decode('utf-8')
            selections = json.loads(decoded) # format: {"<position_id>": <candidate_id>}
            
            # Tally
            for pos_id_str, cand_id in selections.items():
                pos_id = int(pos_id_str)
                if pos_id in results and cand_id in results[pos_id]["candidates"]:
                    results[pos_id]["candidates"][cand_id]["votes"] += 1
            valid_ballots += 1
        except Exception as e:
            # Skip invalid/corrupt ballots
            print(f"Error decoding ballot {ballot.id}: {e}")
            continue
            
    return {
        "election_id": election_id,
        "election_name": election.name,
        "total_ballots": len(ballots),
        "valid_ballots": valid_ballots,
        "results": results
    }

@router.get("/overview")
@limiter.limit("10/minute")
def get_overview(request: Request, db_session: Session = Depends(db.get_db), admin: models.Student = Depends(get_current_admin)):
    total_students = db_session.query(models.Student).count()
    total_elections = db_session.query(models.Election).count()
    active_elections = db_session.query(models.Election).filter(models.Election.status == 'active').count()
    total_ballots = db_session.query(models.Ballot).count()
    
    return {
        "total_students": total_students,
        "total_elections": total_elections,
        "active_elections": active_elections,
        "total_ballots_cast": total_ballots
    }

@router.get("/voters")
@limiter.limit("10/minute")
def get_voters(request: Request, db_session: Session = Depends(db.get_db), admin: models.Student = Depends(get_current_admin)):
    students = db_session.query(models.Student).all()
    # Don't expose passwords or biometric data
    voters = [
        {
            "id": s.id,
            "full_name": s.full_name,
            "registration_number": s.registration_number,
            "account_status": s.account_status,
            "is_admin": s.is_admin,
            "created_at": s.created_at.isoformat() if s.created_at else None
        }
        for s in students
    ]
    return voters

@router.get("/system-status")
@limiter.limit("10/minute")
def get_system_status(request: Request, db_session: Session = Depends(db.get_db), admin: models.Student = Depends(get_current_admin)):
    try:
        # Simple DB check
        db_session.query(models.Student).limit(1).all()
        db_status = "OK"
    except Exception:
        db_status = "Error"
    
    return {
        "status": "OK" if db_status == "OK" else "Degraded",
        "database": db_status,
        "version": "1.0.0"
    }
