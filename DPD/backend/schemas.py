from pydantic import BaseModel
from typing import Optional, List
from datetime import date
import datetime

class AllocationBase(BaseModel):
    customer_name: str
    account_number: str
    amount: float
    original_amount: float
    dpd: int
    allocation_date: date
    lender: str
    status: Optional[str] = "Active"
    contact_phone: Optional[str] = None
    contact_email: Optional[str] = None
    address: Optional[str] = None
    is_paid: bool = False

class AllocationCreate(AllocationBase):
    id: str # We might generate this or parse from CSV

class CommunicationLogBase(BaseModel):
    type: str
    status: str
    timestamp: datetime.datetime

    class Config:
        orm_mode = True

class CommunicationLog(CommunicationLogBase):
    id: int
    allocation_id: str

class Allocation(AllocationBase):
    id: str
    uploaded_at: Optional[datetime.datetime] = None
    logs: List[CommunicationLog] = []

    class Config:
        orm_mode = True

class NotificationRequest(BaseModel):
    allocation_id: str
    type: str # 'whatsapp', 'email', 'sms'
    template_id: Optional[int] = None
    attachment_url: Optional[str] = None
    link: Optional[str] = None
    campaign_code: Optional[str] = None

class BulkNotificationRequest(BaseModel):
    allocation_ids: List[str]
    type: str
    content: Optional[str] = None
    attachment_url: Optional[str] = None
    link: Optional[str] = None
    campaign_code: Optional[str] = None

class TemplateCreate(BaseModel):
    type: str
    content: str
    subject: Optional[str] = None

class Template(TemplateCreate):
    id: int
    class Config:
        orm_mode = True

class UserBase(BaseModel):
    username: str
    lender: Optional[str] = None
    is_host: bool = False
    is_active: bool = True

class UserCreate(UserBase):
    password: str

class User(UserBase):
    id: int
    class Config:
        orm_mode = True

class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    username: Optional[str] = None

class RecoveryRateData(BaseModel):
    date: str
    recovery_rate: float
    total_cases: int
    paid_cases: int

    class Config:
        orm_mode = True
