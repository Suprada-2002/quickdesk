import pytest


def test_rbac_unauthenticated_access(client):
    """Unauthenticated request must be denied with 401 Unauthorized."""
    res = client.get("/api/auth/agent-check")
    assert res.status_code == 401
    assert "missing authentication credentials" in res.json()["detail"].lower()


def test_rbac_employee_denied_agent_route(client, test_employee):
    """An employee attempting to hit an agent-only route MUST receive 403 Forbidden."""
    # Authenticate as employee
    login_res = client.post("/api/auth/login", json={
        "email": test_employee.email,
        "password": "EmpSecret123!"
    })
    token = login_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # Attempt to access agent route
    res = client.get("/api/auth/agent-check", headers=headers)
    assert res.status_code == 403
    assert "agent privileges required" in res.json()["detail"].lower()


def test_rbac_agent_allowed_agent_route(client, test_agent):
    """An agent accessing an agent-only route MUST be granted 200 OK access."""
    # Authenticate as agent
    login_res = client.post("/api/auth/login", json={
        "email": test_agent.email,
        "password": "AgentSecret123!"
    })
    token = login_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # Access agent route
    res = client.get("/api/auth/agent-check", headers=headers)
    assert res.status_code == 200
    data = res.json()
    assert data["message"] == "Authorized as agent"
    assert data["email"] == test_agent.email
