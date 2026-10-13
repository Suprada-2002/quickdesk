import os
import sys
import pytest
from fastapi.testclient import TestClient

# Ensure backend root is on Python path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.main import app
from app.core.database import Base, engine, SessionLocal
from app.core.security import hash_password
from app.models.user import User, UserRole


@pytest.fixture(scope="session", autouse=True)
def setup_test_db():
    """Ensure database tables exist before running test suite."""
    Base.metadata.create_all(bind=engine)
    yield


@pytest.fixture
def db():
    """Yield a database session and roll back any changes afterwards."""
    session = SessionLocal()
    try:
        yield session
    finally:
        session.close()


@pytest.fixture
def client():
    """FastAPI TestClient for hitting HTTP endpoints."""
    with TestClient(app) as test_client:
        yield test_client


@pytest.fixture
def test_employee(db):
    """Fixture that provides an existing test employee."""
    user = db.query(User).filter(User.email == "test_emp@quickdesk.com").first()
    if not user:
        user = User(
            email="test_emp@quickdesk.com",
            name="Test Employee",
            password_hash=hash_password("EmpSecret123!"),
            role=UserRole.EMPLOYEE,
        )
        db.add(user)
        db.commit()
        db.refresh(user)
    return user


@pytest.fixture
def test_agent(db):
    """Fixture that provides an existing test agent."""
    user = db.query(User).filter(User.email == "test_agent@quickdesk.com").first()
    if not user:
        user = User(
            email="test_agent@quickdesk.com",
            name="Test Agent",
            password_hash=hash_password("AgentSecret123!"),
            role=UserRole.AGENT,
        )
        db.add(user)
        db.commit()
        db.refresh(user)
    return user
