from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, Text, Float, DateTime, ForeignKey, JSON
from sqlalchemy.orm import relationship
from app.core.database import Base


class TicketStatus:
    OPEN = "open"
    RESOLVED = "resolved"
    ALL = [OPEN, RESOLVED]


class TicketCategory:
    IT = "IT"
    HR = "HR"
    FINANCE = "Finance"
    ADMIN = "Admin"
    OTHER = "Other"
    ALL = [IT, HR, FINANCE, ADMIN, OTHER]


class TicketPriority:
    LOW = "Low"
    MEDIUM = "Medium"
    HIGH = "High"
    ALL = [LOW, MEDIUM, HIGH]


class Ticket(Base):
    __tablename__ = "tickets"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(255), nullable=False, index=True)
    description = Column(Text, nullable=False)
    attachment_filename = Column(String(255), nullable=True)

    status = Column(String(20), nullable=False, default=TicketStatus.OPEN, index=True)
    category = Column(String(50), nullable=False, default=TicketCategory.OTHER, index=True)
    priority = Column(String(20), nullable=False, default=TicketPriority.MEDIUM, index=True)

    # Immutable initial AI suggestions
    ai_suggested_category = Column(String(50), nullable=False, default=TicketCategory.OTHER)
    ai_suggested_priority = Column(String(20), nullable=False, default=TicketPriority.MEDIUM)
    ai_confidence_score = Column(Float, nullable=True)

    # Grounded RAG draft vs Agent's actual sent reply
    ai_drafted_reply = Column(Text, nullable=True)
    final_reply = Column(Text, nullable=True)
    citations = Column(JSON, nullable=True)  # List of article titles and excerpt snippets

    # User references
    created_by_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    resolved_by_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)

    # Timestamps
    created_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False
    )
    resolved_at = Column(DateTime(timezone=True), nullable=True)
    updated_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False
    )

    # Relationships
    creator = relationship(
        "User",
        back_populates="tickets",
        foreign_keys=[created_by_id]
    )
    resolver = relationship(
        "User",
        back_populates="resolved_tickets",
        foreign_keys=[resolved_by_id]
    )
    override_logs = relationship(
        "TicketOverrideLog",
        back_populates="ticket",
        cascade="all, delete-orphan",
        order_by="TicketOverrideLog.created_at.desc()"
    )
