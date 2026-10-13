import uuid
import pytest
from app.core.security import hash_password, verify_password, create_access_token
from app.models.user import UserRole


def test_password_hashing():
    """Verify passwords are never stored in plaintext and verify securely."""
    password = "SuperSecretPassword2026!"
    hashed = hash_password(password)

    # 1. Stored string is NOT plaintext
    assert hashed != password
    # 2. Starts with Argon2 identifier
    assert hashed.startswith("$argon2id$")
    # 3. Verification succeeds with right password
    assert verify_password(password, hashed) is True
    # 4. Verification fails with wrong password
    assert verify_password("WrongPassword123!", hashed) is False


def test_user_registration(client):
    """Test user registration endpoint with valid and duplicate emails."""
    unique_email = f"emp_{uuid.uuid4().hex[:8]}@quickdesk.com"
    payload = {
        "email": unique_email,
        "name": "New Hire",
        "password": "SecurePassword123!",
        "role": UserRole.EMPLOYEE,
    }


    # First registration should succeed
    res = client.post("/api/auth/register", json=payload)
    assert res.status_code == 201
    data = res.json()
    assert data["email"] == unique_email
    assert data["name"] == "New Hire"
    assert data["role"] == "employee"
    assert "password" not in data  # Never expose passwords in response
    assert "password_hash" not in data

    # Duplicate registration with same email must fail
    res_dup = client.post("/api/auth/register", json=payload)
    assert res_dup.status_code == 400
    assert "already exists" in res_dup.json()["detail"].lower()


def test_login_success_and_failure(client, test_employee):
    """Test login authentication flow with valid and invalid credentials."""
    # 1. Invalid password -> 401
    bad_login = client.post("/api/auth/login", json={
        "email": test_employee.email,
        "password": "IncorrectPassword!"
    })
    assert bad_login.status_code == 401
    assert "invalid email or password" in bad_login.json()["detail"].lower()

    # 2. Non-existent user -> 401
    missing_user = client.post("/api/auth/login", json={
        "email": "does_not_exist@quickdesk.com",
        "password": "AnyPassword!"
    })
    assert missing_user.status_code == 401

    # 3. Valid credentials -> 200 with JWT token
    good_login = client.post("/api/auth/login", json={
        "email": test_employee.email,
        "password": "EmpSecret123!"
    })
    assert good_login.status_code == 200
    token_data = good_login.json()
    assert "access_token" in token_data
    assert token_data["token_type"] == "bearer"
    assert token_data["user"]["email"] == test_employee.email
    assert token_data["user"]["role"] == "employee"


def test_get_current_user_me(client, test_employee):
    """Test /api/auth/me profile retrieval with valid vs invalid token."""
    # Login to get token
    login_res = client.post("/api/auth/login", json={
        "email": test_employee.email,
        "password": "EmpSecret123!"
    })
    token = login_res.json()["access_token"]

    # 1. Call /me with valid Bearer token
    headers = {"Authorization": f"Bearer {token}"}
    me_res = client.get("/api/auth/me", headers=headers)
    assert me_res.status_code == 200
    assert me_res.json()["email"] == test_employee.email
    assert me_res.json()["role"] == "employee"

    # 2. Call /me with NO token -> 401
    no_auth_res = client.get("/api/auth/me")
    assert no_auth_res.status_code == 401

    # 3. Call /me with corrupted token -> 401
    bad_token_res = client.get("/api/auth/me", headers={"Authorization": "Bearer bad.token.here"})
    assert bad_token_res.status_code == 401
