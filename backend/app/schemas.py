from pydantic import BaseModel
from typing import Optional
import datetime

class StudentOut(BaseModel):
    id: int
    full_name: str
    registration_number: str
    account_status: str
    profile_image: Optional[str] = None
    created_at: datetime.datetime

    class Config:
        orm_mode = True
