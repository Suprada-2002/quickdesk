from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict
from app.schemas.user import UserResponse


class TicketOverrideLogResponse(BaseModel):
    id: int
    ticket_id: int
    agent_id: int
    field_name: str
    from_value: str
    to_value: str
    created_at: datetime
    agent: Optional[UserResponse] = None

    model_config = ConfigDict(from_attributes=True)

