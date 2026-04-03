"""
FastAPI dependencies for authentication and role-based access control (RBAC).
Provides reusable dependencies that extract and validate the current user.
"""

from typing import List
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import User, UserRole
from app.core.security import decode_token

# Bearer token scheme for OpenAPI docs
bearer_scheme = HTTPBearer()


def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
    db: Session = Depends(get_db)
) -> User:
    """Extract and validate the current user from the JWT bearer token."""
    payload = decode_token(credentials.credentials)
    if payload is None or payload.get("type") != "access":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired access token",
            headers={"WWW-Authenticate": "Bearer"},
        )

    user_id = payload.get("sub")
    if user_id is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token payload")

    user = db.query(User).filter(User.id == int(user_id)).first()
    if user is None or not user.is_active:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found or inactive")

    return user


def require_roles(allowed_roles: List[UserRole]):
    """
    Factory that returns a dependency enforcing role-based access.
    Usage: Depends(require_roles([UserRole.ADMIN, UserRole.TECHNICIAN]))
    """
    def role_checker(current_user: User = Depends(get_current_user)) -> User:
        if current_user.role not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Requires one of: {[r.value for r in allowed_roles]}"
            )
        return current_user
    return role_checker


# Convenience shortcuts
require_admin = require_roles([UserRole.ADMIN])
require_technician_or_admin = require_roles([UserRole.ADMIN, UserRole.TECHNICIAN])
