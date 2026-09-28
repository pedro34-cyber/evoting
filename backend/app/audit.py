from sqlalchemy.orm import Session
from fastapi import Request
from .models import AuditLog

def log_action(db: Session, action: str, request: Request, student_id: int = None, target_resource: str = None, failure_reason: str = None):
    ip_address = request.client.host if request.client else None
    
    # If there is a failure reason, we append it to target_resource or action for simplicity
    # Or just save it in target_resource if we want.
    if failure_reason:
        target_resource = f"{target_resource} - {failure_reason}" if target_resource else failure_reason

    audit = AuditLog(
        student_id=student_id,
        action=action,
        target_resource=target_resource,
        ip_address=ip_address
    )
    db.add(audit)
    db.commit()
