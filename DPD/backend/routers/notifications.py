from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from backend.database import get_db
from backend.schemas import NotificationRequest, Template, TemplateCreate
from backend.models import NotificationTemplate

router = APIRouter(
    prefix="/notifications",
    tags=["notifications"],
)

@router.post("/send", response_model=dict)
def send_notification(request: NotificationRequest, db: Session = Depends(get_db)):
    from backend.models import CommunicationLog
    import datetime
    
    new_log = CommunicationLog(
        allocation_id=request.allocation_id,
        type=request.type,
        status="Sent",
        timestamp=datetime.datetime.utcnow()
    )
    db.add(new_log)
    db.commit()
    db.refresh(new_log)
    
    print(f"Sending {request.type} for allocation {request.allocation_id}")
    return {"status": "sent", "type": request.type, "log_id": new_log.id}

from backend.schemas import BulkNotificationRequest
from fastapi import UploadFile, File
import shutil
import os
import uuid

# Ensure upload directory exists
UPLOAD_DIR = "backend/uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)

@router.post("/upload", response_model=dict)
async def upload_file(file: UploadFile = File(...)):
    # Generate unique filename to prevent overwrites
    file_extension = os.path.splitext(file.filename)[1]
    unique_filename = f"{uuid.uuid4()}{file_extension}"
    file_path = os.path.join(UPLOAD_DIR, unique_filename)
    
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
        
    # Return URL path (assuming served via static files)
    return {"url": f"/static/uploads/{unique_filename}"}

@router.post("/bulk-send", response_model=dict)
def bulk_send_notifications(request: BulkNotificationRequest, db: Session = Depends(get_db)):
    from backend.models import CommunicationLog
    import datetime
    
    count = 0
    timestamp = datetime.datetime.utcnow()
    
    for allocation_id in request.allocation_ids:
        new_log = CommunicationLog(
            allocation_id=allocation_id,
            type=request.type,
            status="Sent",
            timestamp=timestamp
        )
        db.add(new_log)
        count += 1
        
    db.commit()
    
    log_msg = f"Bulk sent {request.type} to {count} allocations"
    if request.attachment_url:
        log_msg += f" with attachment: {request.attachment_url}"
    if request.link:
        log_msg += f" with link: {request.link}"
    if request.campaign_code:
        log_msg += f" with campaign code: {request.campaign_code}"
        
    print(log_msg)
    return {"status": "success", "count": count, "type": request.type}

@router.post("/templates", response_model=Template)
def create_template(template: TemplateCreate, db: Session = Depends(get_db)):
    db_template = NotificationTemplate(**template.dict())
    db.add(db_template)
    db.commit()
    db.refresh(db_template)
    return db_template

@router.get("/templates", response_model=list[Template])
def get_templates(db: Session = Depends(get_db)):
    return db.query(NotificationTemplate).all()
