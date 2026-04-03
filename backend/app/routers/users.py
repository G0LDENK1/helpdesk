"""
User management and notification routes.
Admin-only user management; all authenticated users can access notifications.
"""

from typing import List
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import User, Notification, UserRole
from app.schemas import UserResponse, UserUpdate, NotificationResponse
from app.core.deps import get_current_user, require_admin

router = APIRouter(tags=["Users"])


# ── User Management (Admin) ───────────────────────────────────────────

@router.get("/users", response_model=List[UserResponse])
def list_users(
    role: UserRole = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    """List all users. Admin only. Optionally filter by role."""
    query = db.query(User)
    if role:
        query = query.filter(User.role == role)
    return query.order_by(User.created_at.desc()).all()


@router.get("/users/technicians", response_model=List[UserResponse])
def list_technicians(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List all active technicians. Available to all authenticated users for assignment UI."""
    return db.query(User).filter(
        User.role.in_([UserRole.TECHNICIAN, UserRole.ADMIN]),
        User.is_active == True  # noqa: E712
    ).all()


@router.get("/users/{user_id}", response_model=UserResponse)
def get_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    """Get a specific user by ID. Admin only."""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user


@router.put("/users/{user_id}", response_model=UserResponse)
def update_user(
    user_id: int,
    req: UserUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    """Update user role or active status. Admin only."""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    if user.id == current_user.id and req.role and req.role != current_user.role:
        raise HTTPException(status_code=400, detail="Cannot change your own role")

    update_data = req.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(user, field, value)

    db.commit()
    db.refresh(user)
    return user


# ── Notifications ──────────────────────────────────────────────────────

@router.get("/notifications", response_model=List[NotificationResponse])
def list_notifications(
    unread_only: bool = Query(False),
    limit: int = Query(50, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get current user's notifications, newest first."""
    query = db.query(Notification).filter(Notification.user_id == current_user.id)
    if unread_only:
        query = query.filter(Notification.is_read == False)  # noqa: E712
    return query.order_by(Notification.created_at.desc()).limit(limit).all()


@router.post("/notifications/read-all", status_code=204)
def mark_all_read(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Mark all of the current user's notifications as read."""
    db.query(Notification).filter(
        Notification.user_id == current_user.id,
        Notification.is_read == False  # noqa: E712
    ).update({"is_read": True})
    db.commit()


@router.post("/notifications/{notification_id}/read", status_code=204)
def mark_read(
    notification_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Mark a single notification as read."""
    notif = db.query(Notification).filter(
        Notification.id == notification_id,
        Notification.user_id == current_user.id,
    ).first()
    if not notif:
        raise HTTPException(status_code=404, detail="Notification not found")
    notif.is_read = True
    db.commit()
