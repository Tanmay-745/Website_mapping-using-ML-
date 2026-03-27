from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from backend.database import get_db
from backend.models import Allocation, User
from backend.schemas import Allocation as AllocationSchema, AllocationCreate
from backend.routers.auth import get_current_user

router = APIRouter(
    prefix="/allocations",
    tags=["allocations"],
)

from sqlalchemy.orm import joinedload

@router.get("/", response_model=List[AllocationSchema])
def read_allocations(
    skip: int = 0, 
    limit: int = 100, 
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = db.query(Allocation).options(joinedload(Allocation.logs))
    
    # Filter by lender if user is not host
    if not current_user.is_host:
        query = query.filter(Allocation.lender == current_user.lender)
    
    allocations = query.offset(skip).limit(limit).all()
    return allocations

@router.post("/", response_model=AllocationSchema)
def create_allocation(
    allocation: AllocationCreate, 
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Only allow host users to create allocations for any lender
    if not current_user.is_host and allocation.lender != current_user.lender:
        raise HTTPException(status_code=403, detail="Cannot create allocation for different lender")
    
    db_allocation = Allocation(**allocation.dict())
    db.add(db_allocation)
    db.commit()
    db.refresh(db_allocation)
    return db_allocation

@router.put("/{allocation_id}", response_model=AllocationSchema)
def update_allocation(
    allocation_id: str, 
    allocation: AllocationCreate, 
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    db_allocation = db.query(Allocation).filter(Allocation.id == allocation_id).first()
    if not db_allocation:
        raise HTTPException(status_code=404, detail="Allocation not found")
    
    # Check if user can access this allocation
    if not current_user.is_host and db_allocation.lender != current_user.lender:
        raise HTTPException(status_code=403, detail="Cannot access allocation for different lender")
    
    # Only allow host users to change lender
    if not current_user.is_host and allocation.lender != current_user.lender:
        raise HTTPException(status_code=403, detail="Cannot change allocation lender")
    
    for key, value in allocation.dict().items():
        setattr(db_allocation, key, value)
    
    db.commit()
    db.refresh(db_allocation)
    return db_allocation
@router.post("/upload", response_model=dict)
def upload_allocations(
    allocations: List[AllocationCreate], 
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    count = 0
    for allocation in allocations:
        # Check if user can upload for this lender
        if not current_user.is_host and allocation.lender != current_user.lender:
            continue  # Skip allocations for other lenders
        
        # Simple upsert or ignore based on ID
        existing = db.query(Allocation).filter(Allocation.id == allocation.id).first()
        if not existing:
            db_allocation = Allocation(**allocation.dict())
            db.add(db_allocation)
            count += 1
    
    db.commit()
    return {"message": f"Successfully uploaded {count} allocations"}

@router.delete("/")
def delete_all_allocations(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Only allow host users to delete all allocations
    if not current_user.is_host:
        raise HTTPException(status_code=403, detail="Only host users can delete all allocations")
    
    # Delete all allocations
    deleted_count = db.query(Allocation).delete()
    db.commit()
    
    return {"message": f"Successfully deleted {deleted_count} allocations"}
