import pytest
from app.models.user import UserRole
from app.models.ticket import TicketCategory, TicketPriority, TicketStatus


def get_token(client, email, password):
    res = client.post("/api/auth/login", json={"email": email, "password": password})
    return res.json()["access_token"]


def test_ticket_submission_triggers_ai(client, test_employee):
    """Submitting a ticket automatically classifies category, priority and generates grounded draft."""
    token = get_token(client, test_employee.email, "EmpSecret123!")
    headers = {"Authorization": f"Bearer {token}"}

    payload = {
        "title": "WireGuard VPN handshake fails after 5 minutes",
        "description": "I cannot stay connected to the internal network on my home router UDP port 51820.",
        "attachment_filename": "vpn.log"
    }

    res = client.post("/api/tickets", json=payload, headers=headers)
    assert res.status_code == 201
    ticket = res.json()

    # 1. AI category and priority suggested
    assert ticket["category"] == TicketCategory.IT
    assert ticket["ai_suggested_category"] == TicketCategory.IT
    assert ticket["priority"] == TicketPriority.HIGH
    assert ticket["ai_suggested_priority"] == TicketPriority.HIGH
    assert ticket["ai_confidence_score"] is not None

    # 2. Grounded RAG draft reply generated
    assert ticket["ai_drafted_reply"] is not None
    assert len(ticket["ai_drafted_reply"]) > 10

    # 3. Citations attached
    assert ticket["citations"] is not None
    assert len(ticket["citations"]) > 0

    # 4. Status is open and final reply is empty
    assert ticket["status"] == TicketStatus.OPEN
    assert ticket["final_reply"] is None


def test_employee_isolation_and_agent_visibility(client, test_employee, test_agent, db):
    """Employees can only view their own tickets; agents can view all tickets."""
    emp_token = get_token(client, test_employee.email, "EmpSecret123!")
    emp_headers = {"Authorization": f"Bearer {emp_token}"}

    agent_token = get_token(client, test_agent.email, "AgentSecret123!")
    agent_headers = {"Authorization": f"Bearer {agent_token}"}

    # Employee 1 creates Ticket 1
    t1_res = client.post(
        "/api/tickets",
        json={"title": "Emp1 Ticket Secret Issue", "description": "Details for ticket 1"},
        headers=emp_headers
    )
    t1_id = t1_res.json()["id"]

    # Register Employee 2
    emp2_email = "isolated_emp2@quickdesk.com"
    client.post("/api/auth/register", json={
        "email": emp2_email,
        "name": "Employee Two",
        "password": "Password123!",
        "role": UserRole.EMPLOYEE
    })
    emp2_token = get_token(client, emp2_email, "Password123!")
    emp2_headers = {"Authorization": f"Bearer {emp2_token}"}

    # Employee 2 creates Ticket 2
    t2_res = client.post(
        "/api/tickets",
        json={"title": "Emp2 Ticket Private Issue", "description": "Details for ticket 2"},
        headers=emp2_headers
    )
    t2_id = t2_res.json()["id"]

    # 1. Employee 1 lists tickets -> sees t1, NEVER sees t2
    emp1_list = client.get("/api/tickets", headers=emp_headers).json()
    emp1_ids = [t["id"] for t in emp1_list]
    assert t1_id in emp1_ids
    assert t2_id not in emp1_ids

    # 2. Employee 1 attempts to get Employee 2's ticket by ID -> 403 Forbidden!
    forbidden_res = client.get(f"/api/tickets/{t2_id}", headers=emp_headers)
    assert forbidden_res.status_code == 403
    assert "raised by other employees" in forbidden_res.json()["detail"].lower()

    # 3. Agent lists tickets -> sees BOTH t1 and t2
    agent_list = client.get("/api/tickets", headers=agent_headers).json()
    agent_ids = [t["id"] for t in agent_list]
    assert t1_id in agent_ids
    assert t2_id in agent_ids


def test_agent_override_and_audit_log(client, test_employee, test_agent):
    """Agents can override AI category/priority; changes are logged to audit history."""
    emp_token = get_token(client, test_employee.email, "EmpSecret123!")
    agent_token = get_token(client, test_agent.email, "AgentSecret123!")

    # Employee creates ticket
    ticket_res = client.post(
        "/api/tickets",
        json={
            "title": "Expense question for laptop stand",
            "description": "Is a $40 laptop stand eligible for reimbursement in Expensify?"
        },
        headers={"Authorization": f"Bearer {emp_token}"}
    )
    ticket_id = ticket_res.json()["id"]
    original_category = ticket_res.json()["category"]  # Finance

    # Employee cannot override -> 403
    emp_override = client.patch(
        f"/api/tickets/{ticket_id}/override",
        json={"field_name": "category", "new_value": "IT"},
        headers={"Authorization": f"Bearer {emp_token}"}
    )
    assert emp_override.status_code == 403

    # Agent overrides to a different category
    target_category = TicketCategory.HR if original_category != TicketCategory.HR else TicketCategory.FINANCE

    agent_override = client.patch(
        f"/api/tickets/{ticket_id}/override",
        json={"field_name": "category", "new_value": target_category},
        headers={"Authorization": f"Bearer {agent_token}"}
    )
    assert agent_override.status_code == 200
    updated_ticket = agent_override.json()
    assert updated_ticket["category"] == target_category
    assert updated_ticket["ai_suggested_category"] == original_category  # Immutable AI record

    # Agent checks audit logs
    audit_res = client.get(
        f"/api/tickets/{ticket_id}/overrides",
        headers={"Authorization": f"Bearer {agent_token}"}
    )
    assert audit_res.status_code == 200
    logs = audit_res.json()
    assert len(logs) >= 1
    assert logs[0]["field_name"] == "category"
    assert logs[0]["from_value"] == original_category
    assert logs[0]["to_value"] == target_category
    assert logs[0]["agent"]["email"] == test_agent.email



def test_agent_reply_and_resolution(client, test_employee, test_agent):
    """Agent sends edited reply: moves to Resolved, keeps both drafts, records resolved_at."""
    emp_token = get_token(client, test_employee.email, "EmpSecret123!")
    agent_token = get_token(client, test_agent.email, "AgentSecret123!")

    # Employee creates ticket
    t_res = client.post(
        "/api/tickets",
        json={
            "title": "How to rollover unused PTO days",
            "description": "I have 4 unused days left this year."
        },
        headers={"Authorization": f"Bearer {emp_token}"}
    )
    t_id = t_res.json()["id"]
    ai_draft = t_res.json()["ai_drafted_reply"]

    # Employee cannot reply/resolve -> 403
    emp_reply = client.post(
        f"/api/tickets/{t_id}/reply",
        json={"reply": "I am resolving this myself"},
        headers={"Authorization": f"Bearer {emp_token}"}
    )
    assert emp_reply.status_code == 403

    # Agent sends final reply
    agent_final_text = "Hi! You can roll over up to 5 unused PTO days into next year in BambooHR."
    reply_res = client.post(
        f"/api/tickets/{t_id}/reply",
        json={"reply": agent_final_text},
        headers={"Authorization": f"Bearer {agent_token}"}
    )
    assert reply_res.status_code == 200
    resolved_ticket = reply_res.json()

    # 1. Status flips to resolved
    assert resolved_ticket["status"] == TicketStatus.RESOLVED

    # 2. Both AI draft and final reply are preserved
    assert resolved_ticket["ai_drafted_reply"] == ai_draft
    assert resolved_ticket["final_reply"] == agent_final_text

    # 3. Resolver ID and timestamp set
    assert resolved_ticket["resolved_by_id"] == test_agent.id
    assert resolved_ticket["resolved_at"] is not None

    # 4. Immutability guardrails: override, draft regen, and re-reply are blocked (400)
    override_attempt = client.patch(
        f"/api/tickets/{t_id}/override",
        json={"field_name": "category", "new_value": "IT"},
        headers={"Authorization": f"Bearer {agent_token}"}
    )
    assert override_attempt.status_code == 400
    assert "already resolved" in override_attempt.json()["detail"].lower()

    draft_attempt = client.post(
        f"/api/tickets/{t_id}/generate-draft",
        headers={"Authorization": f"Bearer {agent_token}"}
    )
    assert draft_attempt.status_code == 400
    assert "already resolved" in draft_attempt.json()["detail"].lower()

    re_reply_attempt = client.post(
        f"/api/tickets/{t_id}/reply",
        json={"reply": "Another reply attempt"},
        headers={"Authorization": f"Bearer {agent_token}"}
    )
    assert re_reply_attempt.status_code == 400
    assert "already resolved" in re_reply_attempt.json()["detail"].lower()

