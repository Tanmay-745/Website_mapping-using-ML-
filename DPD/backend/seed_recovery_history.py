#!/usr/bin/env python3
"""
Seed script to populate recovery rate history with sample data
"""
import sys
import os
# Ensure project root is on sys.path so backend package imports work
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from datetime import datetime, date, timedelta
from sqlalchemy.orm import Session
from database import SessionLocal, engine, Base
from models import RecoveryRateHistory, Allocation
from sqlalchemy import func

def seed_recovery_rate_history():
    """Create historical recovery rate data for the last 30 days"""
    db = SessionLocal()
    
    try:
        # Get all distinct lenders
        lenders_result = db.query(Allocation.lender).distinct().filter(Allocation.lender.isnot(None)).all()
        lenders = [row[0] for row in lenders_result]
        
        if not lenders:
            print("No lenders found in allocations. Please add some allocations first.")
            return
        
        print(f"Found lenders: {lenders}")
        
        # Create recovery rate snapshots for the last 30 days
        today = date.today()
        
        for i in range(30):
            snapshot_date = today - timedelta(days=i)
            
            for lender in lenders:
                # Check if snapshot already exists
                existing = db.query(RecoveryRateHistory).filter(
                    RecoveryRateHistory.date == snapshot_date,
                    RecoveryRateHistory.lender == lender
                ).first()
                
                if existing:
                    print(f"Snapshot already exists for {lender} on {snapshot_date}")
                    continue
                
                # Calculate recovery rate for this lender on this date
                # For historical data, we'll simulate some variation
                total_cases = db.query(func.count(Allocation.id)).filter(Allocation.lender == lender).scalar()
                paid_cases = db.query(func.count(Allocation.id)).filter(
                    Allocation.lender == lender,
                    Allocation.is_paid == True
                ).scalar()
                
                if total_cases > 0:
                    # Add some historical variation (simulate that recovery rate changed over time)
                    base_rate = (paid_cases / total_cases) * 100
                    # Simulate historical variation: ±15% from current rate
                    import random
                    variation = (random.random() - 0.5) * 30
                    recovery_rate = max(0, min(100, base_rate + variation))
                    
                    snapshot = RecoveryRateHistory(
                        date=snapshot_date,
                        lender=lender,
                        recovery_rate=round(recovery_rate, 1),
                        total_cases=total_cases,
                        paid_cases=int(paid_cases * (recovery_rate / 100))  # Adjust paid cases to match rate
                    )
                    db.add(snapshot)
                    print(f"Created snapshot for {lender} on {snapshot_date}: {recovery_rate:.1f}%")
        
        # Also create "All" lender snapshots (combined view)
        for i in range(30):
            snapshot_date = today - timedelta(days=i)
            
            existing = db.query(RecoveryRateHistory).filter(
                RecoveryRateHistory.date == snapshot_date,
                RecoveryRateHistory.lender == "All"
            ).first()
            
            if existing:
                continue
            
            # Calculate combined recovery rate
            total_cases = db.query(func.count(Allocation.id)).scalar()
            paid_cases = db.query(func.count(Allocation.id)).filter(Allocation.is_paid == True).scalar()
            
            if total_cases > 0:
                base_rate = (paid_cases / total_cases) * 100
                import random
                variation = (random.random() - 0.5) * 30
                recovery_rate = max(0, min(100, base_rate + variation))
                
                snapshot = RecoveryRateHistory(
                    date=snapshot_date,
                    lender="All",
                    recovery_rate=round(recovery_rate, 1),
                    total_cases=total_cases,
                    paid_cases=int(paid_cases * (recovery_rate / 100))
                )
                db.add(snapshot)
                print(f"Created combined snapshot for All on {snapshot_date}: {recovery_rate:.1f}%")
        
        db.commit()
        print("Recovery rate history seeding completed!")
        
    except Exception as e:
        print(f"Error seeding recovery rate history: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    # Create tables if they don't exist
    Base.metadata.create_all(bind=engine)
    seed_recovery_rate_history()