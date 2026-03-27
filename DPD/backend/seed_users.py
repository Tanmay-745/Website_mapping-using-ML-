#!/usr/bin/env python3

# Ensure project root is on sys.path so backend package imports work
import sys, os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy.orm import sessionmaker
from backend.database import engine
from backend.models import User
from backend.routers.auth import get_password_hash

# Create session
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def create_test_users():
    db = SessionLocal()
    try:
        # Helper to create or update user
        def upsert_user(username, password, lender=None, is_host=False):
            user = db.query(User).filter(User.username == username).first()
            if user:
                user.hashed_password = get_password_hash(password)
                user.lender = lender
                user.is_host = is_host
                print(f"Updated user: {username}")
            else:
                user = User(
                    username=username,
                    hashed_password=get_password_hash(password),
                    lender=lender,
                    is_host=is_host
                )
                db.add(user)
                print(f"Created user: {username}")

        # Upsert host user
        upsert_user("host", "host123", is_host=True)

        # Upsert lender-specific users
        lenders_data = {
            "Quidcash": "quid123",
            "Sarvgram": "sarv123",
            "OtherLender": "other123"
        }
        for lender, password in lenders_data.items():
            upsert_user(lender.lower(), password, lender=lender)

        db.commit()
        print("\nTest users configured successfully!")
        print("Host user: host / host123")
        for lender, password in lenders_data.items():
            print(f"{lender} user: {lender.lower()} / {password}")

    except Exception as e:
        print(f"Error: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    create_test_users()