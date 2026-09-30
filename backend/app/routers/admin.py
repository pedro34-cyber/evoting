from fastapi import APIRouter, Depends, HTTPException, Request, UploadFile, File
from sqlalchemy.orm import Session
from typing import List
import base64
import json
import uuid
import cv2
import numpy as np
from pathlib import Path

from .. import db, models, schemas
from ..security import get_current_admin
from ..rate_limiter import limiter
from ..audit import log_action

router = APIRouter()


@router.get("/elections", response_model=List[schemas.ElectionOut])
@limiter.limit("180/minute")
def list_elections(request: Request, db_session: Session = Depends(db.get_db), admin: models.Student = Depends(get_current_admin)):
    elections = db_session.query(models.Election).order_by(models.Election.id.desc()).all()
    log_action(db_session, "LIST_ELECTIONS", request, student_id=admin.id)
    return elections


@router.post("/elections", response_model=schemas.ElectionOut)
@limiter.limit("5/minute")
def create_election(request: Request, election: schemas.ElectionCreate, db_session: Session = Depends(db.get_db), admin: models.Student = Depends(get_current_admin)):
    if election.status != "draft":
        raise HTTPException(400, "Create a draft election, add candidates, then activate it.")
    new_election = models.Election(**election.model_dump())
    db_session.add(new_election)
    db_session.commit()
    db_session.refresh(new_election)
    log_action(db_session, "CREATE_ELECTION", request, student_id=admin.id, target_resource=f"election_{new_election.id}")
    return new_election


@router.post("/upload-candidate-photo")
@limiter.limit("20/minute")
async def upload_candidate_photo(request: Request, file: UploadFile = File(...), admin: models.Student = Depends(get_current_admin)):
    if not file.filename:
        raise HTTPException(status_code=400, detail="Please choose a candidate image.")

    suffix = Path(file.filename).suffix.lower()
    if suffix not in {".png", ".jpg", ".jpeg", ".webp"}:
        raise HTTPException(status_code=400, detail="Only PNG, JPG, JPEG, and WEBP images are allowed.")

    content = await file.read(5 * 1024 * 1024 + 1)
    if not content:
        raise HTTPException(status_code=400, detail="Please upload a valid candidate image.")
    if len(content) > 5 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="Image is too large. Please upload a file smaller than 5MB.")

    image = cv2.imdecode(np.frombuffer(content, np.uint8), cv2.IMREAD_COLOR)
    if image is None or image.shape[0] * image.shape[1] > 20_000_000:
        raise HTTPException(400, "Invalid or excessively large image. Please choose a JPG, PNG, or WEBP photo.")
    ok, encoded = cv2.imencode('.jpg', image)
    if not ok:
        raise HTTPException(400, "Unable to process candidate image.")
    content = encoded.tobytes()
    suffix = '.jpg'
    upload_dir = Path(__file__).resolve().parent.parent / "static" / "uploads" / "candidates"
    upload_dir.mkdir(parents=True, exist_ok=True)
    safe_name = f"{uuid.uuid4().hex}{suffix}"
    destination = upload_dir / safe_name
    destination.write_bytes(content)
    return {"url": f"/uploads/candidates/{safe_name}"}


@router.get("/elections/{election_id}/results")
@limiter.limit("180/minute")
def get_election_results(request: Request, election_id: int, db_session: Session = Depends(db.get_db), admin: models.Student = Depends(get_current_admin)):
    election = db_session.query(models.Election).filter(models.Election.id == election_id).first()
    if not election:
        raise HTTPException(status_code=404, detail="Election not found")

    log_action(db_session, "VIEW_ELECTION_RESULTS", request, student_id=admin.id, target_resource=f"election_{election_id}")

    ballots = db_session.query(models.Ballot).filter(models.Ballot.election_id == election_id).all()
    results = {}
    for pos in election.positions:
        results[pos.id] = {
            "position_name": pos.name,
            "candidates": {
                str(c.id): {"name": c.full_name or c.name or "Candidate", "votes": 0}
                for c in pos.candidates
            }
        }

    valid_ballots = 0
    for ballot in ballots:
        try:
            decoded = base64.b64decode(ballot.encrypted_ballot).decode('utf-8')
            selections = json.loads(decoded)
            for pos_id_str, cand_id in selections.items():
                pos_id = int(pos_id_str)
                cand_key = str(cand_id)
                if pos_id in results and cand_key in results[pos_id]["candidates"]:
                    results[pos_id]["candidates"][cand_key]["votes"] += 1
            valid_ballots += 1
        except Exception:
            continue

    return {
        "election_id": election_id,
        "election_name": election.name,
        "total_ballots": len(ballots),
        "valid_ballots": valid_ballots,
        "results": results,
    }


@router.get("/overview")
@limiter.limit("180/minute")
def get_overview(request: Request, db_session: Session = Depends(db.get_db), admin: models.Student = Depends(get_current_admin)):
    total_students = db_session.query(models.Student).filter(models.Student.is_admin.is_(False)).count()
    total_elections = db_session.query(models.Election).count()
    active_election = db_session.query(models.Election).filter(models.Election.status == 'active').order_by(models.Election.id.desc()).first()
    total_ballots = db_session.query(models.Ballot).count()
    enrolled_students = db_session.query(models.Student).filter(models.Student.is_admin.is_(False), models.Student.biometric_reference.isnot(None)).count()

    return {
        "total_students": total_students,
        "enrolled_students": enrolled_students,
        "total_elections": total_elections,
        "active_election": active_election.name if active_election else None,
        "active_elections": 1 if active_election else 0,
        "total_ballots_cast": total_ballots,
    }


@router.get("/voters")
@limiter.limit("180/minute")
def get_voters(request: Request, db_session: Session = Depends(db.get_db), admin: models.Student = Depends(get_current_admin)):
    students = db_session.query(models.Student).filter(models.Student.is_admin.is_(False)).all()
    voters = [
        {
            "id": s.id,
            "full_name": s.full_name,
            "email": s.email,
            "registration_number": s.registration_number,
            "account_status": s.account_status.value if hasattr(s.account_status, 'value') else s.account_status,
            "is_admin": s.is_admin,
            "has_enrolled": bool(s.biometric_reference),
            "created_at": s.created_at.isoformat() if s.created_at else None,
        }
        for s in students
    ]
    return voters


@router.get("/system-status")
@limiter.limit("180/minute")
def get_system_status(request: Request, db_session: Session = Depends(db.get_db), admin: models.Student = Depends(get_current_admin)):
    try:
        db_session.query(models.Student).limit(1).all()
        db_status = "OK"
    except Exception:
        db_status = "Error"

    return {
        "status": "OK" if db_status == "OK" else "Degraded",
        "database": db_status,
        "version": "1.0.0",
    }


@router.put("/elections/{election_id}/status", response_model=schemas.ElectionOut)
@limiter.limit("5/minute")
def update_election_status(request: Request, election_id: int, status: str, db_session: Session = Depends(db.get_db), admin: models.Student = Depends(get_current_admin)):
    election = db_session.query(models.Election).filter(models.Election.id == election_id).first()
    if not election:
        raise HTTPException(status_code=404, detail="Election not found")
    if status not in {'draft', 'active', 'closed'}:
        raise HTTPException(400, "Choose draft, active, or closed status.")
    if status == 'active':
        if not election.positions or any(not p.candidates for p in election.positions):
            raise HTTPException(400, "Add at least one candidate to every position before activating the election.")
        db_session.query(models.Election).filter(models.Election.id != election_id, models.Election.status == 'active').update({'status': 'closed'})
    election.status = status
    db_session.commit()
    db_session.refresh(election)
    log_action(db_session, "UPDATE_ELECTION_STATUS", request, student_id=admin.id, target_resource=f"election_{election_id}")
    return election


@router.post("/elections/{election_id}/positions", response_model=schemas.PositionOut)
@limiter.limit("10/minute")
def create_position(request: Request, election_id: int, position: schemas.PositionCreate, db_session: Session = Depends(db.get_db), admin: models.Student = Depends(get_current_admin)):
    election = db_session.query(models.Election).filter(models.Election.id == election_id).first()
    if not election:
        raise HTTPException(status_code=404, detail="Election not found")
    new_pos = models.Position(election_id=election_id, **position.model_dump())
    db_session.add(new_pos)
    db_session.commit()
    db_session.refresh(new_pos)
    log_action(db_session, "CREATE_POSITION", request, student_id=admin.id, target_resource=f"position_{new_pos.id}")
    return new_pos


@router.post("/positions/{position_id}/candidates", response_model=schemas.CandidateOut)
@limiter.limit("10/minute")
def create_candidate(request: Request, position_id: int, candidate: schemas.CandidateCreate, db_session: Session = Depends(db.get_db), admin: models.Student = Depends(get_current_admin)):
    position = db_session.query(models.Position).filter(models.Position.id == position_id).first()
    if not position:
        raise HTTPException(status_code=404, detail="Position not found")

    full_name = (candidate.full_name or candidate.name or '').strip()
    if not full_name:
        raise HTTPException(status_code=400, detail="Candidate full name is required.")

    if candidate.photo:
        import re
        if not re.fullmatch(r'/uploads/candidates/[a-f0-9]{32}\.jpg', candidate.photo):
            raise HTTPException(400, "Please upload a candidate photo using the image upload control.")
    new_cand = models.Candidate(
        position_id=position_id,
        election_id=position.election_id,
        full_name=full_name,
        name=full_name,
        manifesto=candidate.manifesto,
        photo=candidate.photo,
        cgpa=candidate.cgpa,
    )
    db_session.add(new_cand)
    db_session.commit()
    db_session.refresh(new_cand)
    log_action(db_session, "CREATE_CANDIDATE", request, student_id=admin.id, target_resource=f"candidate_{new_cand.id}")
    return new_cand


@router.put('/elections/{election_id}', response_model=schemas.ElectionOut)
def edit_election(election_id: int, body: schemas.ElectionCreate, session=Depends(db.get_db), admin=Depends(get_current_admin)):
    election = session.get(models.Election, election_id)
    if not election:
        raise HTTPException(404, 'Election not found.')
    # Status changes use the activation endpoint and its completeness checks.
    for key in ('name', 'description', 'start_time', 'end_time'):
        setattr(election, key, getattr(body, key))
    session.commit()
    session.refresh(election)
    return election


@router.put('/positions/{position_id}', response_model=schemas.PositionOut)
def edit_position(position_id: int, body: schemas.PositionCreate, session=Depends(db.get_db), admin=Depends(get_current_admin)):
    position = session.get(models.Position, position_id)
    if not position:
        raise HTTPException(404, 'Position not found.')
    position.name = body.name
    session.commit()
    session.refresh(position)
    return position


@router.put('/candidates/{candidate_id}', response_model=schemas.CandidateOut)
def edit_candidate(candidate_id: int, body: schemas.CandidateCreate, session=Depends(db.get_db), admin=Depends(get_current_admin)):
    candidate = session.get(models.Candidate, candidate_id)
    if not candidate:
        raise HTTPException(404, 'Candidate not found.')
    name = (body.full_name or body.name or '').strip()
    if not name:
        raise HTTPException(400, 'Candidate full name is required.')
    if body.photo:
        import re
        if not re.fullmatch(r'/uploads/candidates/[a-f0-9]{32}\.jpg', body.photo):
            raise HTTPException(400, 'Please upload a candidate photo using the image upload control.')
    candidate.name = candidate.full_name = name
    candidate.photo = body.photo
    candidate.cgpa = body.cgpa
    candidate.manifesto = body.manifesto
    session.commit()
    session.refresh(candidate)
    return candidate
