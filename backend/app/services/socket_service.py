import asyncio
from typing import Dict, Any, Optional, List
import socketio
from app.core.security import decode_access_token
from app.models.ticket import Ticket
from app.models.user import UserRole

# Create Async Socket.IO Server with ASGI support
sio = socketio.AsyncServer(
    async_mode="asgi",
    cors_allowed_origins="*",
    logger=False,
    engineio_logger=False
)


def get_user_rooms_for_token(token: Optional[str]) -> List[str]:
    """Extract authorized Socket.IO rooms based on validated JWT token claims."""
    if not token:
        return []

    payload = decode_access_token(token)
    if not payload:
        return []

    rooms = []
    user_id = payload.get("sub")
    role = payload.get("role")

    if role == UserRole.AGENT:
        rooms.append("agents")
    if user_id:
        rooms.append(f"user_{user_id}")

    return rooms


@sio.event
async def connect(sid: str, environ: Dict[str, Any], auth: Optional[Dict[str, Any]] = None):
    """
    Handle client connection with JWT handshake authentication.
    Automatically assigns sockets to respective rooms:
    - Agents join 'agents' room
    - Employees join 'user_{user_id}' room
    """
    token = None
    if auth and isinstance(auth, dict):
        token = auth.get("token")

    # Fallback to query parameter token if not in auth payload
    if not token:
        query_string = environ.get("QUERY_STRING", "")
        for param in query_string.split("&"):
            if param.startswith("token="):
                token = param.split("=")[1]
                break

    rooms_to_join = get_user_rooms_for_token(token)
    for room in rooms_to_join:
        await sio.enter_room(sid, room)
        print(f"[*] Socket {sid}: Joined room '{room}'")

    return True


@sio.event
async def join_room(sid: str, data: Dict[str, Any]):
    """Allow client to explicitly join rooms after late authentication."""
    room = data.get("room")
    if room:
        await sio.enter_room(sid, room)


@sio.event
async def disconnect(sid: str):
    """Clean up on client disconnect."""
    pass


# Broadcasting helpers called from API routes
def broadcast_ticket_created(ticket: Ticket):
    """
    Broadcast newly created ticket to all agents in 'agents' room
    so their dashboard refreshes live without reloading.
    """
    try:
        creator_name = ticket.creator.name if ticket.creator else "Employee"
        creator_email = ticket.creator.email if ticket.creator else ""
        payload = {
            "id": ticket.id,
            "title": ticket.title,
            "description": ticket.description,
            "status": ticket.status,
            "category": ticket.category,
            "priority": ticket.priority,
            "ai_suggested_category": ticket.ai_suggested_category,
            "ai_suggested_priority": ticket.ai_suggested_priority,
            "ai_confidence_score": ticket.ai_confidence_score,
            "created_by_id": ticket.created_by_id,
            "creator_name": creator_name,
            "creator_email": creator_email,
            "created_at": ticket.created_at.isoformat() if ticket.created_at else None,
        }
        try:
            loop = asyncio.get_running_loop()
            asyncio.create_task(sio.emit("ticket_created", payload, room="agents"))
        except RuntimeError:
            pass
    except Exception as e:
        print(f"[!] Socket broadcast_ticket_created error: {e}")


def broadcast_ticket_updated(ticket: Ticket):
    """
    Broadcast category/priority override to 'agents' and the ticket creator.
    """
    try:
        payload = {
            "id": ticket.id,
            "category": ticket.category,
            "priority": ticket.priority,
            "status": ticket.status,
        }
        try:
            loop = asyncio.get_running_loop()
            asyncio.create_task(sio.emit("ticket_updated", payload, room="agents"))
            asyncio.create_task(sio.emit("ticket_updated", payload, room=f"user_{ticket.created_by_id}"))
        except RuntimeError:
            pass
    except Exception as e:
        print(f"[!] Socket broadcast_ticket_updated error: {e}")


def broadcast_ticket_resolved(ticket: Ticket):
    """
    Broadcast resolution and final reply to the specific employee who raised the ticket,
    causing their 'My Tickets' status badge to immediately flip to 'Resolved' without refreshing.
    Also notifies agents room so dashboard status updates live.
    """
    try:
        payload = {
            "id": ticket.id,
            "status": ticket.status,
            "final_reply": ticket.final_reply,
            "resolved_at": ticket.resolved_at.isoformat() if ticket.resolved_at else None,
        }
        try:
            loop = asyncio.get_running_loop()
            asyncio.create_task(sio.emit("ticket_resolved", payload, room=f"user_{ticket.created_by_id}"))
            asyncio.create_task(sio.emit("ticket_resolved", payload, room="agents"))
        except RuntimeError:
            pass
    except Exception as e:
        print(f"[!] Socket broadcast_ticket_resolved error: {e}")

