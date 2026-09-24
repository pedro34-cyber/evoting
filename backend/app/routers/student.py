from fastapi import APIRouter, Depends, HTTPException
from ..security import get_current_student
from .. import db, models

router = APIRouter()

@router.get('/student/profile')
def profile(current_student = Depends(get_current_student)):
    # Return safe student info (never return biometric template)
    return {
        'id': current_student.id,
        'full_name': current_student.full_name,
        'registration_number': current_student.registration_number,
        'account_status': current_student.account_status,
        'profile_image': current_student.profile_image,
        'created_at': current_student.created_at,
    }

@router.get('/student/voting-status')
def voting_status(election_id: int, current_student = Depends(get_current_student)):
    session = next(db.get_db())
    # If the student has a used voting credential for the election, they have voted
    vc = session.query(models.VotingCredential).filter(models.VotingCredential.election_id == election_id, models.VotingCredential.student_id == current_student.id, models.VotingCredential.status == 'used').first()
    if vc:
        return {'election_id': election_id, 'voted': True, 'used_at': vc.used_at}
    # Alternatively, check ballots — ballots are anonymous, so we only use credential
    return {'election_id': election_id, 'voted': False}
