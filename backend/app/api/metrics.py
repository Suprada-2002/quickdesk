import statistics
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func, distinct

from app.core.database import get_db
from app.api.auth import require_agent
from app.models.user import User
from app.models.ticket import Ticket, TicketStatus, TicketCategory, TicketPriority
from app.models.audit import TicketOverrideLog, OverrideField
from app.schemas.metrics import MetricsResponse

router = APIRouter(prefix="/metrics", tags=["Metrics"])


@router.get("", response_model=MetricsResponse)
def get_agent_metrics(
    current_user: User = Depends(require_agent),
    db: Session = Depends(get_db)
):
    """
    Agent-only route providing operational helpdesk analytics:
    - Total tickets by status (open vs resolved)
    - Tickets by category distribution
    - Median resolution time in minutes
    - How often agents overrode the AI's suggested category (percentage)
    """
    # 1. Total Tickets
    total_tickets = db.query(Ticket).count()

    # 2. Status Breakdown
    status_counts = {"open": 0, "resolved": 0}
    status_rows = db.query(Ticket.status, func.count(Ticket.id)).group_by(Ticket.status).all()
    for s_val, count in status_rows:
        status_counts[s_val] = count

    # 3. Category Breakdown
    category_counts = {cat: 0 for cat in TicketCategory.ALL}
    category_rows = db.query(Ticket.category, func.count(Ticket.id)).group_by(Ticket.category).all()
    for cat_val, count in category_rows:
        category_counts[cat_val] = count

    # 4. Priority Breakdown
    priority_counts = {prio: 0 for prio in TicketPriority.ALL}
    priority_rows = db.query(Ticket.priority, func.count(Ticket.id)).group_by(Ticket.priority).all()
    for prio_val, count in priority_rows:
        priority_counts[prio_val] = count

    # 5. Median Resolution Time
    resolved_tickets = (
        db.query(Ticket.created_at, Ticket.resolved_at)
        .filter(Ticket.status == TicketStatus.RESOLVED, Ticket.resolved_at.isnot(None))
        .all()
    )

    resolution_durations_minutes = []
    for created_at, resolved_at in resolved_tickets:
        if resolved_at and created_at:
            duration_minutes = (resolved_at - created_at).total_seconds() / 60.0
            if duration_minutes >= 0:
                resolution_durations_minutes.append(duration_minutes)

    if resolution_durations_minutes:
        median_time = round(float(statistics.median(resolution_durations_minutes)), 2)
    else:
        median_time = 0.0

    # 6. AI Category Override Percentage
    # How often did agents override the AI category across all tickets?
    distinct_category_overrides = (
        db.query(func.count(distinct(TicketOverrideLog.ticket_id)))
        .filter(TicketOverrideLog.field_name == OverrideField.CATEGORY)
        .scalar()
        or 0
    )

    if total_tickets > 0:
        override_percentage = round((distinct_category_overrides / total_tickets) * 100.0, 2)
    else:
        override_percentage = 0.0

    return MetricsResponse(
        total_tickets=total_tickets,
        status_counts=status_counts,
        category_counts=category_counts,
        priority_counts=priority_counts,
        median_resolution_time_minutes=median_time,
        category_override_percentage=override_percentage,
        total_category_overrides=distinct_category_overrides,
    )
