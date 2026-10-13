import os
import sys

# Ensure backend root is on Python path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../..")))

from datetime import datetime, timezone, timedelta
from app.core.database import engine, SessionLocal, Base
from app.core.security import hash_password
from app.models.user import User, UserRole
from app.models.ticket import Ticket, TicketStatus, TicketCategory, TicketPriority
from app.models.audit import TicketOverrideLog, OverrideField


def seed_database():
    print("[*] Creating database tables if not existing...")
    Base.metadata.create_all(bind=engine)

    db = SessionLocal()
    try:
        # 1. Seed Users
        print("[*] Seeding demo users...")
        sample_users = [
            {
                "email": "employee@quickdesk.com",
                "name": "John Employee",
                "password": "Password123!",
                "role": UserRole.EMPLOYEE,
            },
            {
                "email": "bob@quickdesk.com",
                "name": "Bob Martinez",
                "password": "Password123!",
                "role": UserRole.EMPLOYEE,
            },
            {
                "email": "agent@quickdesk.com",
                "name": "Sarah Agent",
                "password": "Password123!",
                "role": UserRole.AGENT,
            },
            {
                "email": "david.agent@quickdesk.com",
                "name": "David Support",
                "password": "Password123!",
                "role": UserRole.AGENT,
            },
        ]

        created_users = {}
        for u_data in sample_users:
            user = db.query(User).filter(User.email == u_data["email"]).first()
            if not user:
                user = User(
                    email=u_data["email"],
                    name=u_data["name"],
                    password_hash=hash_password(u_data["password"]),
                    role=u_data["role"],
                )
                db.add(user)
                db.commit()
                db.refresh(user)
                print(f"    [+] Created user: {user.email} ({user.role})")
            else:
                print(f"    [=] User already exists: {user.email}")
            created_users[user.email] = user

        # 2. Seed Initial Tickets
        print("[*] Seeding sample tickets...")
        emp1 = created_users["employee@quickdesk.com"]
        emp2 = created_users["bob@quickdesk.com"]
        agent1 = created_users["agent@quickdesk.com"]

        sample_tickets = [
            {
                "title": "VPN connection drops every 5 minutes",
                "description": "Whenever I connect to the internal WireGuard / OpenVPN client from my home Wi-Fi, the connection resets after 5 minutes with a TLS handshake timeout.",
                "attachment_filename": "vpn_error.log",
                "status": TicketStatus.OPEN,
                "category": TicketCategory.IT,
                "priority": TicketPriority.HIGH,
                "ai_suggested_category": TicketCategory.IT,
                "ai_suggested_priority": TicketPriority.HIGH,
                "ai_confidence_score": 0.95,
                "ai_drafted_reply": "Please ensure your WireGuard client is updated to version 1.0.2023 or above, and verify that UDP port 51820 is not blocked by your home router firewall. If using OpenVPN, download the latest ovpn configuration profile from https://intranet.company.internal/vpn.",
                "citations": [{"title": "VPN Setup & Troubleshooting Guide", "section": "Common Connection Drops"}],
                "creator": emp1,
            },
            {
                "title": "Need access to the Q3 Finance shared drive",
                "description": "Hi team, I recently transferred to the budget planning committee and need read/write permissions for the Q3 Finance drive in Google Workspace.",
                "attachment_filename": None,
                "status": TicketStatus.OPEN,
                "category": TicketCategory.FINANCE,
                "priority": TicketPriority.MEDIUM,
                "ai_suggested_category": TicketCategory.FINANCE,
                "ai_suggested_priority": TicketPriority.MEDIUM,
                "ai_confidence_score": 0.88,
                "ai_drafted_reply": "Access to finance drives requires approval from your department head or the Finance controller. Please submit an approval ticket referencing Form F-12 or have your manager approve the request in BambooHR.",
                "citations": [{"title": "Finance Shared Drive Access Policy", "section": "Authorization Workflow"}],
                "creator": emp1,
            },
            {
                "title": "Laptop battery drains completely in 45 minutes",
                "description": "My ThinkPad T14 battery health shows 42% maximum capacity and dies during meetings if unplugged. Can I get a replacement battery or swap for a new machine?",
                "attachment_filename": "battery_report.html",
                "status": TicketStatus.RESOLVED,
                "category": TicketCategory.IT,
                "priority": TicketPriority.MEDIUM,
                "ai_suggested_category": TicketCategory.IT,
                "ai_suggested_priority": TicketPriority.LOW,
                "ai_confidence_score": 0.91,
                "ai_drafted_reply": "Hardware refresh requests are processed for machines older than 24 months. Please schedule an appointment with IT desk.",
                "final_reply": "Hi John, I checked your ThinkPad serial number; it is 28 months old and eligible for a full refresh. A replacement MacBook Pro / ThinkPad T14s has been reserved for you at the 4th-floor IT desk. Please bring your old laptop tomorrow between 10am and 4pm.",
                "citations": [{"title": "Hardware Replacement & Laptop Policy", "section": "Battery Degraded"}],
                "creator": emp1,
                "resolver": agent1,
                "resolved_at": datetime.now(timezone.utc) - timedelta(hours=2),
                "override": {
                    "field_name": OverrideField.PRIORITY,
                    "from_value": TicketPriority.LOW,
                    "to_value": TicketPriority.MEDIUM,
                }
            },
            {
                "title": "How do I claim reimbursement for home monitor?",
                "description": "I purchased an ergonomic 27-inch external monitor for remote work last week for $240. Where do I upload the invoice and what is the policy limit?",
                "attachment_filename": "receipt_monitor.pdf",
                "status": TicketStatus.OPEN,
                "category": TicketCategory.HR,
                "priority": TicketPriority.LOW,
                "ai_suggested_category": TicketCategory.HR,
                "ai_suggested_priority": TicketPriority.LOW,
                "ai_confidence_score": 0.89,
                "ai_drafted_reply": "Remote work equipment expenses up to $300 per calendar year can be submitted via Expensify under category 'Home Office Stipend'. Please attach the original itemized receipt.",
                "citations": [{"title": "Expense Reimbursement & Home Office Policy", "section": "Hardware Stipend"}],
                "creator": emp2,
            },
        ]

        for t_info in sample_tickets:
            existing_ticket = db.query(Ticket).filter(
                Ticket.title == t_info["title"],
                Ticket.created_by_id == t_info["creator"].id
            ).first()

            if not existing_ticket:
                ticket = Ticket(
                    title=t_info["title"],
                    description=t_info["description"],
                    attachment_filename=t_info["attachment_filename"],
                    status=t_info["status"],
                    category=t_info["category"],
                    priority=t_info["priority"],
                    ai_suggested_category=t_info["ai_suggested_category"],
                    ai_suggested_priority=t_info["ai_suggested_priority"],
                    ai_confidence_score=t_info["ai_confidence_score"],
                    ai_drafted_reply=t_info["ai_drafted_reply"],
                    final_reply=t_info.get("final_reply"),
                    citations=t_info.get("citations"),
                    created_by_id=t_info["creator"].id,
                    resolved_by_id=t_info.get("resolver").id if t_info.get("resolver") else None,
                    resolved_at=t_info.get("resolved_at"),
                )
                db.add(ticket)
                db.commit()
                db.refresh(ticket)
                print(f"    [+] Created ticket: #{ticket.id} - '{ticket.title}'")

                # If there's an override to seed:
                if "override" in t_info:
                    ov = t_info["override"]
                    override_log = TicketOverrideLog(
                        ticket_id=ticket.id,
                        agent_id=t_info["resolver"].id,
                        field_name=ov["field_name"],
                        from_value=ov["from_value"],
                        to_value=ov["to_value"],
                    )
                    db.add(override_log)
                    db.commit()
                    print(f"        [+] Created override audit log for ticket #{ticket.id}")
            else:
                print(f"    [=] Ticket already exists: '{t_info['title']}'")

        print("[*] Database seeding completed successfully!")

    except Exception as e:
        db.rollback()
        print(f"[!] Seeding failed: {e}")
        raise
    finally:
        db.close()


if __name__ == "__main__":
    seed_database()
