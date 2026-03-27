from sqlalchemy import Column, Integer, String, Float, Boolean, Date, ForeignKey, Text, DateTime
from sqlalchemy.orm import relationship
from backend.database import Base
import datetime

class Allocation(Base):
    __tablename__ = "allocations"

    id = Column(String, primary_key=True, index=True)
    customer_name = Column(String)
    account_number = Column(String, index=True)
    amount = Column(Float)
    original_amount = Column(Float)
    dpd = Column(Integer)
    allocation_date = Column(Date)
    lender = Column(String) # Quidcash, Sarvgram, etc.
    status = Column(String, default="Active")
    contact_phone = Column(String)
    contact_email = Column(String)
    address = Column(String)
    is_paid = Column(Boolean, default=False)
    uploaded_at = Column(DateTime, default=datetime.datetime.utcnow)

    logs = relationship("CommunicationLog", back_populates="allocation")

class CommunicationLog(Base):
    __tablename__ = "communication_logs"
    
    id = Column(Integer, primary_key=True, index=True)
    allocation_id = Column(String, ForeignKey("allocations.id"))
    type = Column(String) # "sms", "email", "whatsapp", "call"
    status = Column(String) # "Sent", "Failed", "Delivered"
    timestamp = Column(DateTime, default=datetime.datetime.utcnow)
    
    allocation = relationship("Allocation", back_populates="logs")

class ClientSettings(Base):
    __tablename__ = "client_settings"
    
    id = Column(Integer, primary_key=True, index=True)
    daily_interest_rate = Column(Float, default=0.05)
    buffer_days = Column(Integer, default=3)
    interest_calculation_type = Column(String, default="compound")

class NotificationTemplate(Base):
    __tablename__ = "notification_templates"

    id = Column(Integer, primary_key=True, index=True)
    type = Column(String, unique=True) # e.g., "whatsapp_0_30", "email_90_plus"
    content = Column(Text) # Editable template content
    subject = Column(String, nullable=True) # For emails

class RecoveryRateHistory(Base):
    __tablename__ = "recovery_rate_history"
    
    id = Column(Integer, primary_key=True, index=True)
    date = Column(Date, index=True)
    lender = Column(String, index=True) # Specific lender or "All" for host view
    recovery_rate = Column(Float) # Percentage (0-100)
    total_cases = Column(Integer)
    paid_cases = Column(Integer)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

class User(Base):
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True)
    hashed_password = Column(String)
    lender = Column(String, nullable=True) # Specific lender for non-host users
    is_host = Column(Boolean, default=False) # Host can see all lenders
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
