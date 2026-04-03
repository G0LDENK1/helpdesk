"""
Comment routes for ticket discussion threads.
Supports public and internal (staff-only) comments with audit logging.
"""

from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload

from app.database import get_db
from app.models import Ticket, Comment, Notification, User, UserRole
from app.schemas import CommentCreate, CommentResponse, AuditLogResponse
from app.core.deps import get_current_user

router = APIRouter(prefix="/tickets/{ticket_id}", tags=["Comments"])


def _get_ticket_or_404(ticket_id: int, db: Session) -> Ticket:
    """Fetch ticket or raise 404."""
    ticket = db.query(Ticket).filter(Ticket.id == ticket_id).first()
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")
    return ticket


@router.get("/comments", response_model=List[CommentResponse])
def list_comments(
    ticket_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List all comments for a ticket. Internal comments hidden from end users."""
    ticket = _get_ticket_or_404(ticket_id, db)

    # End users can only see their own tickets' comments
    if current_user.role == UserRole.END_USER and ticket.created_by != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied")

    query = db.query(Comment).options(joinedload(Comment.author)).filter(Comment.ticket_id == ticket_id)

    # Hide internal comments from end users
    if current_user.role == UserRole.END_USER:
        query = query.filter(Comment.is_internal == False)  # noqa: E712

    return query.order_by(Comment.created_at.asc()).all()


@router.post("/comments", response_model=CommentResponse, status_code=status.HTTP_201_CREATED)
def create_comment(
    ticket_id: int,
    req: CommentCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Add a comment to a ticket. Only technicians/admins can post internal comments."""
    ticket = _get_ticket_or_404(ticket_id, db)

    # End users can only comment on their own tickets
    if current_user.role == UserRole.END_USER:
        if ticket.created_by != current_user.id:
            raise HTTPException(status_code=403, detail="Access denied")
        if req.is_internal:
            raise HTTPException(status_code=403, detail="End users cannot post internal comments")

    comment = Comment(
        ticket_id=ticket_id,
        user_id=current_user.id,
        content=req.content,
        is_internal=req.is_internal,
    )
    db.add(comment)

    # Notify relevant users
    notify_targets = set()
    if ticket.created_by != current_user.id and not req.is_internal:
        notify_targets.add(ticket.created_by)
    if ticket.assigned_to and ticket.assigned_to != current_user.id:
        notify_targets.add(ticket.assigned_to)

    for uid in notify_targets:
        notif = Notification(
            user_id=uid, ticket_id=ticket_id,
            message=f"New comment on ticket #{ticket_id} by {current_user.username}"
        )
        db.add(notif)

    db.commit()
    db.refresh(comment)
    return comment


@router.get("/audit", response_model=List[AuditLogResponse])
def get_audit_log(
    ticket_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get audit log for a ticket. Technicians and admins only for non-owned tickets."""
    ticket = _get_ticket_or_404(ticket_id, db)

    if current_user.role == UserRole.END_USER and ticket.created_by != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied")

    from app.models import AuditLog
    logs = db.query(AuditLog).filter(AuditLog.ticket_id == ticket_id)\
        .order_by(AuditLog.created_at.desc()).all()
    return logs
