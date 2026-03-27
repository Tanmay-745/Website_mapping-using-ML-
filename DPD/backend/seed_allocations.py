#!/usr/bin/env python3
"""
Seed script to create sample allocations for testing
"""
import sys
import os
# Ensure project root is on sys.path so backend package imports work
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from datetime import date, timedelta
from sqlalchemy.orm import sessionmaker
from database import engine
from models import Allocation

# Create session
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def create_sample_allocations():
    db = SessionLocal()
    try:
        # Sample data for different lenders
        lenders = ["Quidcash", "Sarvgram", "OtherLender"]
        sample_data = []

        for lender in lenders:
            # Create 20 allocations per lender with varying DPD and payment status
            for i in range(20):
                allocation_date = date.today() - timedelta(days=i*2)  # Spread over last 40 days
                dpd = i * 2  # DPD from 0 to 38
                is_paid = i < 8  # First 8 are paid (40% recovery rate)

                allocation = Allocation(
                    id=f"{lender.lower()}_{i:03d}",
                    customer_name=f"Customer {lender} {i+1}",
                    account_number=f"ACC{lender[:3].upper()}{i:03d}",
                    amount=10000.0 + (i * 500),  # Amount from 10k to 19.5k
                    original_amount=10000.0 + (i * 500),
                    dpd=dpd,
                    allocation_date=allocation_date,
                    lender=lender,
                    status="Active",
                    contact_phone=f"98765432{i:02d}",
                    contact_email=f"customer{i}@{lender.lower()}.com",
                    address=f"Address {i+1}, City",
                    is_paid=is_paid
                )
                sample_data.append(allocation)

        # Add all allocations to database
        for allocation in sample_data:
            db.add(allocation)

        db.commit()
        print(f"Created {len(sample_data)} sample allocations!")
        print("Lenders:", lenders)

    except Exception as e:
        print(f"Error: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    create_sample_allocations()