"""
Ticket CRUD routes with filtering, search, pagination, assignment, and audit logging.
Enforces RBAC: end users see only their own tickets; technicians see assigned + unassigned.
"""

from datetime import datetime
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import or_

from app.database import get_db
from app.models import (
    Ticket, User, AuditLog, Notification,
    UserRole, TicketStatus, TicketPriority, TicketCategory,
)
from app.schemas import (
    TicketCreate, TicketUpdate, TicketAssign,
    TicketResponse, TicketListResponse, DashboardStats,
)
from app.core.deps import get_current_user, require_technician_or_admin, require_admin

router = APIRouter(prefix="/tickets", tags=["Tickets"])


def _log_audit(db: Session, ticket_id: int, user_id: int, action: str,
               old_value: str = None, new_value: str = None):
    """Helper to create an audit log entry."""
    entry = AuditLog(
        ticket_id=ticket_id, user_id=user_id, action=action,
        old_value=old_value, new_value=new_value,
    )
    db.add(entry)


def _notify(db: Session, user_id: int, ticket_id: int, message: str):
    """Helper to create an in-app notification."""
    notif = Notification(user_id=user_id, ticket_id=ticket_id, message=message)
    db.add(notif)


@router.get("", response_model=TicketListResponse)
def list_tickets(
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    status_filter: Optional[TicketStatus] = Query(None, alias="status"),
    priority: Optional[TicketPriority] = None,
    category: Optional[TicketCategory] = None,
    search: Optional[str] = Query(None, max_length=200),
    assigned_to: Optional[int] = None,
    created_by: Optional[int] = None,
    date_from: Optional[datetime] = None,
    date_to: Optional[datetime] = None,
    unassigned: Optional[bool] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List tickets with filtering, search, and pagination. Respects RBAC visibility."""
    query = db.query(Ticket).options(joinedload(Ticket.creator), joinedload(Ticket.assignee))

    # RBAC: end users only see their own tickets
    if current_user.role == UserRole.END_USER:
        query = query.filter(Ticket.created_by == current_user.id)

    # Filters
    if status_filter:
        query = query.filter(Ticket.status == status_filter)
    if priority:
        query = query.filter(Ticket.priority == priority)
    if category:
        query = query.filter(Ticket.category == category)
    if assigned_to:
        query = query.filter(Ticket.assigned_to == assigned_to)
    if created_by and current_user.role != UserRole.END_USER:
        query = query.filter(Ticket.created_by == created_by)
    if unassigned:
        query = query.filter(Ticket.assigned_to.is_(None))
    if date_from:
        query = query.filter(Ticket.created_at >= date_from)
    if date_to:
        query = query.filter(Ticket.created_at <= date_to)

    # Text search on title and description
    if search:
        search_term = f"%{search}%"
        query = query.filter(or_(Ticket.title.ilike(search_term), Ticket.description.ilike(search_term)))

    total = query.count()
    tickets = query.order_by(Ticket.updated_at.desc()).offset((page - 1) * per_page).limit(per_page).all()

    return TicketListResponse(tickets=tickets, total=total, page=page, per_page=per_page)


@router.post("", response_model=TicketResponse, status_code=status.HTTP_201_CREATED)
def create_ticket(
    req: TicketCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Create a new support ticket."""
    ticket = Ticket(
        title=req.title,
        description=req.description,
        priority=req.priority,
        category=req.category,
        created_by=current_user.id,
    )
    db.add(ticket)
    db.flush()

    _log_audit(db, ticket.id, current_user.id, "created", new_value=f"status={ticket.status.value}")

    # Notify all technicians about new ticket
    technicians = db.query(User).filter(User.role.in_([UserRole.TECHNICIAN, UserRole.ADMIN])).all()
    for tech in technicians:
        _notify(db, tech.id, ticket.id, f"New ticket #{ticket.id}: {ticket.title}")

    db.commit()
    db.refresh(ticket)
    return ticket


@router.get("/stats", response_model=DashboardStats)
def get_stats(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get dashboard statistics. Admins see system-wide; others see scoped stats."""
    base = db.query(Ticket)

    if current_user.role == UserRole.END_USER:
        base = base.filter(Ticket.created_by == current_user.id)
    elif current_user.role == UserRole.TECHNICIAN:
        base = base.filter(
            or_(Ticket.assigned_to == current_user.id, Ticket.assigned_to.is_(None))
        )

    return DashboardStats(
        total_tickets=base.count(),
        open_tickets=base.filter(Ticket.status == TicketStatus.OPEN).count(),
        in_progress_tickets=base.filter(Ticket.status == TicketStatus.IN_PROGRESS).count(),
        resolved_tickets=base.filter(Ticket.status == TicketStatus.RESOLVED).count(),
        closed_tickets=base.filter(Ticket.status == TicketStatus.CLOSED).count(),
        critical_tickets=base.filter(Ticket.priority == TicketPriority.CRITICAL).count(),
        unassigned_tickets=base.filter(Ticket.assigned_to.is_(None)).count(),
        total_users=db.query(User).count() if current_user.role == UserRole.ADMIN else 0,
        total_technicians=db.query(User).filter(User.role == UserRole.TECHNICIAN).count()
            if current_user.role == UserRole.ADMIN else 0,
    )


@router.get("/{ticket_id}", response_model=TicketResponse)
def get_ticket(
    ticket_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get a single ticket by ID with creator/assignee details."""
    ticket = (
        db.query(Ticket)
        .options(joinedload(Ticket.creator), joinedload(Ticket.assignee))
        .filter(Ticket.id == ticket_id)
        .first()
    )
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")

    # End users can only view their own tickets
    if current_user.role == UserRole.END_USER and ticket.created_by != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied")

    return ticket


@router.put("/{ticket_id}", response_model=TicketResponse)
def update_ticket(
    ticket_id: int,
    req: TicketUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Update ticket fields. End users can only update their own open tickets' title/description."""
    ticket = db.query(Ticket).filter(Ticket.id == ticket_id).first()
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")

    # RBAC enforcement
    if current_user.role == UserRole.END_USER:
        if ticket.created_by != current_user.id:
            raise HTTPException(status_code=403, detail="Access denied")
        if req.status or req.priority:
            raise HTTPException(status_code=403, detail="End users cannot change status or priority")

    update_data = req.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        old_val = str(getattr(ticket, field))
        new_val = str(value.value if hasattr(value, 'value') else value)
        if old_val != new_val:
            _log_audit(db, ticket.id, current_user.id, f"updated_{field}",
                      old_value=old_val, new_value=new_val)
        setattr(ticket, field, value)

    # Notify ticket creator about updates
    if ticket.created_by != current_user.id:
        _notify(db, ticket.created_by, ticket.id, f"Ticket #{ticket.id} was updated")

    db.commit()
    db.refresh(ticket)
    return ticket


@router.delete("/{ticket_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_ticket(
    ticket_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    """Delete a ticket. Admin only."""
    ticket = db.query(Ticket).filter(Ticket.id == ticket_id).first()
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")
    db.delete(ticket)
    db.commit()


@router.post("/{ticket_id}/assign", response_model=TicketResponse)
def assign_ticket(
    ticket_id: int,
    req: TicketAssign,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_technician_or_admin),
):
    """Assign a ticket to a technician. Technicians and admins only."""
    ticket = db.query(Ticket).filter(Ticket.id == ticket_id).first()
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")

    technician = db.query(User).filter(
        User.id == req.technician_id,
        User.role.in_([UserRole.TECHNICIAN, UserRole.ADMIN])
    ).first()
    if not technician:
        raise HTTPException(status_code=400, detail="Invalid technician ID")

    old_assignee = str(ticket.assigned_to) if ticket.assigned_to else "none"
    ticket.assigned_to = technician.id

    # Auto-set status to in_progress if currently open
    if ticket.status == TicketStatus.OPEN:
        _log_audit(db, ticket.id, current_user.id, "status_changed",
                  old_value=ticket.status.value, new_value=TicketStatus.IN_PROGRESS.value)
        ticket.status = TicketStatus.IN_PROGRESS

    _log_audit(db, ticket.id, current_user.id, "assigned",
              old_value=old_assignee, new_value=str(technician.id))

    # Notify the assigned technician
    _notify(db, technician.id, ticket.id, f"Ticket #{ticket.id} assigned to you: {ticket.title}")
    # Notify the ticket creator
    _notify(db, ticket.created_by, ticket.id,
            f"Ticket #{ticket.id} assigned to {technician.username}")

    db.commit()
    db.refresh(ticket)
    return ticket
