from datetime import datetime
from typing import Optional, List, Any
from pydantic import BaseModel, Field, ConfigDict
from app.schemas.user import UserResponse


class TicketCreate(BaseModel):
    title: str = Field(..., min_length=3, max_length=255)
    description: str = Field(..., min_length=5)
    attachment_filename: Optional[str] = Field(default=None, max_length=255)


class TicketReplyRequest(BaseModel):
    reply: str = Field(..., min_length=2)


class TicketOverrideRequest(BaseModel):
    field_name: str = Field(..., pattern="^(category|priority)$")
    new_value: str = Field(..., min_length=2, max_length=50)


class TicketResponse(BaseModel):
    id: int
    title: str
    description: str
    attachment_filename: Optional[str] = None
    status: str
    category: str
    priority: str
    ai_suggested_category: str
    ai_suggested_priority: str
    ai_confidence_score: Optional[float] = None
    ai_drafted_reply: Optional[str] = None
    final_reply: Optional[str] = None
    citations: Optional[List[Any]] = None
    created_by_id: int
    resolved_by_id: Optional[int] = None
    created_at: datetime
    resolved_at: Optional[datetime] = None
    updated_at: datetime
    creator: Optional[UserResponse] = None
    resolver: Optional[UserResponse] = None

    model_config = ConfigDict(from_attributes=True)

