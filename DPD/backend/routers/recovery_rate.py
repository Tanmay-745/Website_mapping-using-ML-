from datetime import datetime, date, timedelta
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func
from backend.database import get_db
from backend.models import RecoveryRateHistory, Allocation, User
from backend.schemas import RecoveryRateData
from backend.routers.auth import get_current_user

router = APIRouter(
    prefix="/recovery-rate",
    tags=["recovery-rate"],
)


@router.get("/history", response_model=List[RecoveryRateData])
async def get_recovery_rate_history(
    lender: Optional[str] = None,
    days: int = 30,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get recovery rate history for the specified lender and time period"""
    
    # Filter by lender based on user permissions
    if not current_user.is_host:
        lender = current_user.lender
    elif lender == "All":
        lender = None  # Will get data for all lenders combined
    
    # Calculate start date
    start_date = date.today() - timedelta(days=days)
    
    query = db.query(RecoveryRateHistory).filter(
        RecoveryRateHistory.date >= start_date
    )
    
    if lender:
        query = query.filter(RecoveryRateHistory.lender == lender)
    
    history = query.order_by(RecoveryRateHistory.date).all()
    
    return [
        {
            "date": record.date.isoformat(),
            "recovery_rate": record.recovery_rate,
            "total_cases": record.total_cases,
            "paid_cases": record.paid_cases
        }
        for record in history
    ]

@router.post("/snapshot")
async def create_recovery_rate_snapshot(
    lender: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create a snapshot of current recovery rate (admin/host only)"""
    
    if not current_user.is_host:
        raise HTTPException(status_code=403, detail="Only host users can create snapshots")
    
    today = date.today()
    
    # Get all lenders if lender is None
    if lender:
        lenders_to_process = [lender]
    else:
        # Get distinct lenders from allocations
        lenders_result = db.query(Allocation.lender).distinct().filter(Allocation.lender.isnot(None)).all()
        lenders_to_process = [row[0] for row in lenders_result]
    
    snapshots_created = 0
    
    for lender_name in lenders_to_process:
        # Calculate recovery rate for this lender
        total_cases = db.query(func.count(Allocation.id)).filter(Allocation.lender == lender_name).scalar()
        paid_cases = db.query(func.count(Allocation.id)).filter(
            Allocation.lender == lender_name,
            Allocation.is_paid == True
        ).scalar()
        
        if total_cases > 0:
            recovery_rate = (paid_cases / total_cases) * 100
            
            # Check if snapshot already exists for today
            existing = db.query(RecoveryRateHistory).filter(
                RecoveryRateHistory.date == today,
                RecoveryRateHistory.lender == lender_name
            ).first()
            
            if not existing:
                snapshot = RecoveryRateHistory(
                    date=today,
                    lender=lender_name,
                    recovery_rate=recovery_rate,
                    total_cases=total_cases,
                    paid_cases=paid_cases
                )
                db.add(snapshot)
                snapshots_created += 1
    
    db.commit()
    return {"message": f"Created {snapshots_created} recovery rate snapshots"}

@router.get("/current")
async def get_current_recovery_rate(
    lender: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get current recovery rate for the specified lender"""
    
    # Filter by lender based on user permissions
    if not current_user.is_host:
        lender = current_user.lender
    elif lender == "All":
        lender = None
    
    if lender:
        total_cases = db.query(func.count(Allocation.id)).filter(Allocation.lender == lender).scalar()
        paid_cases = db.query(func.count(Allocation.id)).filter(
            Allocation.lender == lender,
            Allocation.is_paid == True
        ).scalar()
    else:
        # All lenders combined
        total_cases = db.query(func.count(Allocation.id)).scalar()
        paid_cases = db.query(func.count(Allocation.id)).filter(Allocation.is_paid == True).scalar()
    
    if total_cases == 0:
        recovery_rate = 0
    else:
        recovery_rate = (paid_cases / total_cases) * 100
    
    return {
        "recovery_rate": round(recovery_rate, 1),
        "total_cases": total_cases,
        "paid_cases": paid_cases,
        "lender": lender or "All"
    }