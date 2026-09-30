from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, List
import datetime

class StudentOut(BaseModel):
    id: int
    full_name: str
    email: Optional[str] = None
    registration_number: str
    account_status: str
    profile_image: Optional[str] = None
    has_enrolled: bool = False
    created_at: datetime.datetime

    class Config:
        from_attributes = True


class CandidateBase(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)
    full_name: Optional[str] = None
    name: Optional[str] = None
    manifesto: Optional[str] = None
    photo: Optional[str] = None
    cgpa: Optional[float] = Field(default=None, ge=0, le=5, allow_inf_nan=False)

class CandidateCreate(CandidateBase):
    pass

class CandidateOut(CandidateBase):
    id: int
    position_id: int
    election_id: int
    full_name: Optional[str] = None
    name: Optional[str] = None
    created_at: Optional[datetime.datetime] = None

    class Config:
        from_attributes = True


class PositionBase(BaseModel):
    name: str = Field(min_length=1, max_length=256)
    max_selections: int = Field(default=1, ge=1, le=1)

class PositionCreate(PositionBase):
    pass

class PositionOut(PositionBase):
    id: int
    election_id: int
    candidates: List[CandidateOut] = []

    class Config:
        from_attributes = True


class ElectionBase(BaseModel):
    name: str = Field(min_length=1, max_length=256)
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
