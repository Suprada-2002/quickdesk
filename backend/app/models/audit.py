from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from app.core.database import Base


class OverrideField:
    CATEGORY = "category"
    PRIORITY = "priority"
    ALL = [CATEGORY, PRIORITY]


class TicketOverrideLog(Base):
    __tablename__ = "ticket_override_logs"

    id = Column(Integer, primary_key=True, index=True)
    ticket_id = Column(Integer, ForeignKey("tickets.id", ondelete="CASCADE"), nullable=False, index=True)
    agent_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)

    field_name = Column(String(50), nullable=False)  # "category" or "priority"
    from_value = Column(String(50), nullable=False)
    to_value = Column(String(50), nullable=False)

    created_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False
    )

    # Relationships
    ticket = relationship("Ticket", back_populates="override_logs")
    agent = relationship("User", back_populates="override_logs")
