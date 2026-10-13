from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.security import verify_password, hash_password, create_access_token, decode_access_token
from app.models.user import User, UserRole
from app.schemas.user import UserCreate, UserLogin, UserResponse, Token

router = APIRouter(prefix="/auth", tags=["Authentication"])
security = HTTPBearer(auto_error=False)


def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
) -> User:
    """Validate Bearer JWT and return current authenticated User model."""
    if not credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing authentication credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )

    token = credentials.credentials
    payload = decode_access_token(token)
    if payload is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
            headers={"WWW-Authenticate": "Bearer"},
        )

    user_id = payload.get("sub")
    if user_id is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token payload missing subject identifier",
            headers={"WWW-Authenticate": "Bearer"},
        )

    user = db.query(User).filter(User.id == int(user_id)).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User associated with token no longer exists",
            headers={"WWW-Authenticate": "Bearer"},
        )

    return user


def require_agent(current_user: User = Depends(get_current_user)) -> User:
    """Enforce AGENT role on backend endpoints. Rejects employees with 403 Forbidden."""
    if current_user.role != UserRole.AGENT:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access forbidden: Agent privileges required",
        )
    return current_user


def require_employee(current_user: User = Depends(get_current_user)) -> User:
    """Enforce EMPLOYEE role on backend endpoints."""
    if current_user.role != UserRole.EMPLOYEE:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access forbidden: Employee role required",
        )
    return current_user


@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
def register(user_in: UserCreate, db: Session = Depends(get_db)):
    """Register a new user account (employee or agent)."""
    # Check if email is already registered
    existing_user = db.query(User).filter(User.email == user_in.email.lower()).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="An account with this email already exists",
        )

    # Securely hash password using Argon2
    hashed_pwd = hash_password(user_in.password)

    new_user = User(
        email=user_in.email.lower().strip(),
        name=user_in.name.strip(),
        password_hash=hashed_pwd,
        role=user_in.role,
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return new_user


@router.post("/login", response_model=Token)
def login(login_data: UserLogin, db: Session = Depends(get_db)):
    """Authenticate with email and password, returning JWT access token."""
    user = db.query(User).filter(User.email == login_data.email.lower().strip()).first()
    if not user or not verify_password(login_data.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Issue signed JWT with user ID, email, and role
    token_payload = {
        "sub": str(user.id),
        "email": user.email,
        "role": user.role,
        "name": user.name,
    }
    access_token = create_access_token(token_payload)

    return Token(
        access_token=access_token,
        token_type="bearer",
        user=UserResponse.model_validate(user),
    )


@router.get("/me", response_model=UserResponse)
def get_me(current_user: User = Depends(get_current_user)):
    """Retrieve profile and role of currently authenticated user."""
    return current_user


@router.get("/agent-check")
def agent_check(current_user: User = Depends(require_agent)):
    """Agent-only endpoint to verify role-based access control."""
    return {
        "message": "Authorized as agent",
        "agent_id": current_user.id,
        "email": current_user.email,
    }

