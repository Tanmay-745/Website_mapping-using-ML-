from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from backend.database import get_db
# Add Settings models/schemas later as needed

router = APIRouter(
    prefix="/settings",
    tags=["settings"],
)

@router.get("/")
def get_settings():
    return {"message": "Settings endpoint"}
