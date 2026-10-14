import pytest
from app.core.security import create_access_token
from app.models.user import UserRole
from app.models.ticket import Ticket, TicketCategory, TicketPriority, TicketStatus
from app.services.socket_service import (
    get_user_rooms_for_token,
    broadcast_ticket_created,
    broadcast_ticket_updated,
    broadcast_ticket_resolved,
)


def test_socket_room_assignment_agent(test_agent):
    """An agent JWT token must be mapped to both 'agents' room and 'user_{id}' room."""
    token = create_access_token({
        "sub": str(test_agent.id),
        "email": test_agent.email,
        "role": UserRole.AGENT,
    })

    rooms = get_user_rooms_for_token(token)
    assert "agents" in rooms
    assert f"user_{test_agent.id}" in rooms


def test_socket_room_assignment_employee(test_employee):
    """An employee JWT token must be mapped to 'user_{id}' room but NEVER to 'agents' room."""
    token = create_access_token({
        "sub": str(test_employee.id),
        "email": test_employee.email,
        "role": UserRole.EMPLOYEE,
    })

    rooms = get_user_rooms_for_token(token)
    assert f"user_{test_employee.id}" in rooms
    assert "agents" not in rooms  # Critical: employees must never receive the agent broadcast channel


def test_socket_invalid_or_missing_token():
    """Unauthenticated or corrupted tokens receive zero room access."""
    assert get_user_rooms_for_token(None) == []
    assert get_user_rooms_for_token("") == []
    assert get_user_rooms_for_token("invalid.jwt.token") == []


def test_broadcast_functions_execute_safely(test_employee):
    """Verify that broadcast functions can be safely invoked from API routes."""
    sample_ticket = Ticket(
        id=999,
        title="Test Socket Ticket",
        description="Testing socket broadcasts",
        status=TicketStatus.OPEN,
        category=TicketCategory.IT,
        priority=TicketPriority.HIGH,
        ai_suggested_category=TicketCategory.IT,
        ai_suggested_priority=TicketPriority.HIGH,
        ai_confidence_score=0.92,
        created_by_id=test_employee.id,
    )

    broadcast_ticket_created(sample_ticket)
    broadcast_ticket_updated(sample_ticket)

    sample_ticket.status = TicketStatus.RESOLVED
    sample_ticket.final_reply = "Resolved cleanly"
    broadcast_ticket_resolved(sample_ticket)
