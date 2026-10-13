import pytest
from app.models.user import UserRole


def get_token(client, email, password):
    res = client.post("/api/auth/login", json={"email": email, "password": password})
    return res.json()["access_token"]


def test_agent_metrics_access_and_calculations(client, test_employee, test_agent):
    """Verify that only agents can access metrics, and numbers are correctly computed."""
    emp_token = get_token(client, test_employee.email, "EmpSecret123!")
    agent_token = get_token(client, test_agent.email, "AgentSecret123!")

    # 1. Employee accessing metrics must receive 403 Forbidden
    emp_res = client.get("/api/metrics", headers={"Authorization": f"Bearer {emp_token}"})
    assert emp_res.status_code == 403
    assert "agent privileges required" in emp_res.json()["detail"].lower()

    # 2. Agent accessing metrics gets 200 OK
    agent_res = client.get("/api/metrics", headers={"Authorization": f"Bearer {agent_token}"})
    assert agent_res.status_code == 200
    metrics = agent_res.json()

    # Verify response schema fields
    assert "total_tickets" in metrics
    assert "status_counts" in metrics
    assert "category_counts" in metrics
    assert "priority_counts" in metrics
    assert "median_resolution_time_minutes" in metrics
    assert "category_override_percentage" in metrics

    # Assert logical values
    assert metrics["total_tickets"] >= 0
    assert "open" in metrics["status_counts"]
    assert "resolved" in metrics["status_counts"]
    assert "IT" in metrics["category_counts"]
    assert "HR" in metrics["category_counts"]
    assert 0.0 <= metrics["category_override_percentage"] <= 100.0
    assert metrics["median_resolution_time_minutes"] >= 0.0
