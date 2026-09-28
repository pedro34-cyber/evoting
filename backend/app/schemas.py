from pydantic import BaseModel
from typing import Optional, List
import datetime

class StudentOut(BaseModel):
    id: int
    full_name: str
    registration_number: str
    account_status: str
    profile_image: Optional[str] = None
    created_at: datetime.datetime

    class Config:
        from_attributes = True


class CandidateBase(BaseModel):
    name: str
    manifesto: Optional[str] = None
    photo: Optional[str] = None

class CandidateCreate(CandidateBase):
    pass

class CandidateOut(CandidateBase):
    id: int
    position_id: int
    election_id: int

    class Config:
        from_attributes = True


class PositionBase(BaseModel):
    name: str
    max_selections: int = 1

class PositionCreate(PositionBase):
    pass

class PositionOut(PositionBase):
    id: int
    election_id: int
    candidates: List[CandidateOut] = []

    class Config:
        from_attributes = True


class ElectionBase(BaseModel):
    name: str
    description: Optional[str] = None
    start_time: Optional[datetime.datetime] = None
    end_time: Optional[datetime.datetime] = None
    status: str = 'draft'

class ElectionCreate(ElectionBase):
    pass

class ElectionOut(ElectionBase):
    id: int
    positions: List[PositionOut] = []

    class Config:
        from_attributes = True
