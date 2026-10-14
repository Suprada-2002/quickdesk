from datetime import datetime, timezone
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import or_

from app.core.database import get_db
from app.api.auth import get_current_user, require_agent
from app.models.user import User, UserRole
from app.models.ticket import Ticket, TicketStatus, TicketCategory, TicketPriority
from app.models.audit import TicketOverrideLog, OverrideField
from app.schemas.ticket import (
    TicketCreate,
    TicketResponse,
    TicketReplyRequest,
    TicketOverrideRequest,
)
from app.schemas.override import TicketOverrideLogResponse
from app.services.ai_service import (
    ai_service,
    sanitize_category,
    sanitize_priority,
)

router = APIRouter(prefix="/tickets", tags=["Tickets"])


@router.post("", response_model=TicketResponse, status_code=status.HTTP_201_CREATED)
def create_ticket(
    ticket_in: TicketCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Submit a support ticket.
    Triggers automated AI classification for Category, Priority, and initial RAG-drafted reply.
    """
    # 1. AI Classification (Category, Priority, Confidence)
    ai_classification = ai_service.classify_ticket(ticket_in.title, ticket_in.description)
    suggested_cat = ai_classification["category"]
    suggested_prio = ai_classification["priority"]
    confidence_score = ai_classification.get("confidence", 0.90)

    # 2. AI RAG Draft Reply Grounded in Knowledge Base
    draft_reply, citations = ai_service.generate_rag_reply(ticket_in.title, ticket_in.description)

    # 3. Create Ticket record
    new_ticket = Ticket(
        title=ticket_in.title.strip(),
        description=ticket_in.description.strip(),
        attachment_filename=ticket_in.attachment_filename.strip() if ticket_in.attachment_filename else None,
        status=TicketStatus.OPEN,
        category=suggested_cat,
        priority=suggested_prio,
        ai_suggested_category=suggested_cat,
        ai_suggested_priority=suggested_prio,
        ai_confidence_score=confidence_score,
        ai_drafted_reply=draft_reply,
        citations=citations,
        created_by_id=current_user.id,
    )
    db.add(new_ticket)
    db.commit()
    db.refresh(new_ticket)

    # Real-time notification hook (wired in Phase 4)
    from app.services.socket_service import broadcast_ticket_created
    broadcast_ticket_created(new_ticket)

    return new_ticket


@router.get("", response_model=List[TicketResponse])
def list_tickets(
    status_filter: Optional[str] = Query(None, alias="status"),
    category_filter: Optional[str] = Query(None, alias="category"),
    priority_filter: Optional[str] = Query(None, alias="priority"),
    search: Optional[str] = Query(None, min_length=1),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    List tickets with role enforcement and filters.
    - Employees: Restricted to view ONLY tickets they created.
    - Agents: Can view all tickets across all employees with multi-criteria filters.
    """
    query = db.query(Ticket)

    # Backend Role Enforcement: Employees only see their own tickets
    if current_user.role == UserRole.EMPLOYEE:
        query = query.filter(Ticket.created_by_id == current_user.id)

    # Filter by Status (open / resolved)
    if status_filter:
        query = query.filter(Ticket.status == status_filter.lower().strip())

    # Filter by Category
    if category_filter:
        query = query.filter(Ticket.category == category_filter.strip())

    # Filter by Priority
    if priority_filter:
        query = query.filter(Ticket.priority == priority_filter.strip())

    # Search query across title and description
    if search:
        search_pattern = f"%{search.strip()}%"
        query = query.filter(
            or_(
                Ticket.title.ilike(search_pattern),
                Ticket.description.ilike(search_pattern)
            )
        )

    # Return newest first
    tickets = query.order_by(Ticket.created_at.desc()).all()
    return tickets


@router.get("/{ticket_id}", response_model=TicketResponse)
def get_ticket(
    ticket_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Retrieve single ticket detail.
    Employees can only access tickets they submitted; Agents can access any ticket.
    """
    ticket = db.query(Ticket).filter(Ticket.id == ticket_id).first()
    if not ticket:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Ticket #{ticket_id} not found",
        )

    # Ownership check for employee
    if current_user.role == UserRole.EMPLOYEE and ticket.created_by_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access forbidden: You cannot view tickets raised by other employees",
        )

    return ticket


@router.patch("/{ticket_id}/override", response_model=TicketResponse)
def override_ticket_attribute(
    ticket_id: int,
    override_in: TicketOverrideRequest,
    current_user: User = Depends(require_agent),
    db: Session = Depends(get_db)
):
    """
    Agent-only action: Override the AI-suggested category or priority.
    Logs the change to the audit trail (who, when, from, to).
    """
    ticket = db.query(Ticket).filter(Ticket.id == ticket_id).first()
    if not ticket:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Ticket #{ticket_id} not found",
        )

    if ticket.status == TicketStatus.RESOLVED:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot modify or override attributes of an already resolved ticket. Reopen the ticket first.",
        )

    field_name = override_in.field_name.lower().strip()
    new_val = override_in.new_value.strip()

    if field_name == OverrideField.CATEGORY:
        sanitized_new = sanitize_category(new_val)
        old_val = ticket.category
        if old_val == sanitized_new:
            return ticket  # No change
        ticket.category = sanitized_new

    elif field_name == OverrideField.PRIORITY:
        sanitized_new = sanitize_priority(new_val)
        old_val = ticket.priority
        if old_val == sanitized_new:
            return ticket  # No change
        ticket.priority = sanitized_new
    else:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid override field. Must be 'category' or 'priority'",
        )

    # Record in audit log
    audit_entry = TicketOverrideLog(
        ticket_id=ticket.id,
        agent_id=current_user.id,
        field_name=field_name,
        from_value=old_val,
        to_value=sanitized_new,
    )
    db.add(audit_entry)
    db.commit()
    db.refresh(ticket)

    # Real-time notification hook
    from app.services.socket_service import broadcast_ticket_updated
    broadcast_ticket_updated(ticket)

    return ticket


@router.get("/{ticket_id}/overrides", response_model=List[TicketOverrideLogResponse])
def get_ticket_override_history(
    ticket_id: int,
    current_user: User = Depends(require_agent),
    db: Session = Depends(get_db)
):
    """Agent-only action: View audit log history of category and priority overrides."""
    ticket = db.query(Ticket).filter(Ticket.id == ticket_id).first()
    if not ticket:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Ticket #{ticket_id} not found",
        )

    logs = (
        db.query(TicketOverrideLog)
        .filter(TicketOverrideLog.ticket_id == ticket_id)
        .order_by(TicketOverrideLog.created_at.desc())
        .all()
    )
    return logs


@router.post("/{ticket_id}/generate-draft", response_model=TicketResponse)
def regenerate_rag_draft(
    ticket_id: int,
    current_user: User = Depends(require_agent),
    db: Session = Depends(get_db)
):
    """Agent-only action: Re-run RAG pipeline to generate a fresh draft and citations."""
    ticket = db.query(Ticket).filter(Ticket.id == ticket_id).first()
    if not ticket:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Ticket #{ticket_id} not found",
        )

    if ticket.status == TicketStatus.RESOLVED:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot regenerate AI draft for an already resolved ticket",
        )

    draft_reply, citations = ai_service.generate_rag_reply(ticket.title, ticket.description)
    ticket.ai_drafted_reply = draft_reply
    ticket.citations = citations
    db.commit()
    db.refresh(ticket)
    return ticket


@router.post("/{ticket_id}/reply", response_model=TicketResponse)
def send_final_reply(
    ticket_id: int,
    reply_in: TicketReplyRequest,
    current_user: User = Depends(require_agent),
    db: Session = Depends(get_db)
):
    """
    Agent-only action: Submit final edited reply.
    Preserves both AI draft and final reply.
    Moves ticket status to 'resolved' and records resolved_at timestamp.
    """
    ticket = db.query(Ticket).filter(Ticket.id == ticket_id).first()
    if not ticket:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Ticket #{ticket_id} not found",
        )

    if ticket.status == TicketStatus.RESOLVED:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This ticket is already resolved and locked",
        )

    ticket.final_reply = reply_in.reply.strip()
    ticket.status = TicketStatus.RESOLVED
    ticket.resolved_by_id = current_user.id
    ticket.resolved_at = datetime.now(timezone.utc)

    db.commit()
    db.refresh(ticket)

    # Real-time notification hook: flips status for employee
    from app.services.socket_service import broadcast_ticket_resolved
    broadcast_ticket_resolved(ticket)

    return ticket
