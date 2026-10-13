from datetime import datetime
from typing import Optional
from pydantic import BaseModel, EmailStr, Field, ConfigDict


class UserBase(BaseModel):
    email: EmailStr
    name: str = Field(..., min_length=2, max_length=100)
    role: str = Field(default="employee", pattern="^(employee|agent)$")


class UserCreate(UserBase):
    password: str = Field(..., min_length=6, max_length=128)


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class UserResponse(BaseModel):
    id: int
    email: EmailStr
    name: str
    role: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)



class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse


class TokenData(BaseModel):
    user_id: Optional[int] = None
    email: Optional[str] = None
    role: Optional[str] = None
