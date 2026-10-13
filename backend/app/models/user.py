from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, DateTime
from sqlalchemy.orm import relationship
from app.core.database import Base


class UserRole:
    EMPLOYEE = "employee"
    AGENT = "agent"
    ALL = [EMPLOYEE, AGENT]


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, index=True, nullable=False)
    name = Column(String(255), nullable=False)
    password_hash = Column(String(255), nullable=False)
    role = Column(String(20), nullable=False, default=UserRole.EMPLOYEE)
    created_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False
    )

    # Relationships
    tickets = relationship(
        "Ticket",
        back_populates="creator",
        foreign_keys="Ticket.created_by_id",
        cascade="all, delete-orphan"
    )
    resolved_tickets = relationship(
        "Ticket",
        back_populates="resolver",
        foreign_keys="Ticket.resolved_by_id"
    )
    override_logs = relationship(
        "TicketOverrideLog",
        back_populates="agent",
        foreign_keys="TicketOverrideLog.agent_id"
    )

    def is_agent(self) -> bool:
        return self.role == UserRole.AGENT

    def is_employee(self) -> bool:
        return self.role == UserRole.EMPLOYEE
