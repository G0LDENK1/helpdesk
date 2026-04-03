"""
IT Help Desk API — FastAPI application entry point.
Configures CORS, rate limiting, routers, and database initialization.
Seeds a default admin account on first run.
"""

import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

from app.database import engine, Base, SessionLocal
from app.models import User, UserRole
from app.core.security import hash_password
from app.routers import auth, tickets, comments, users

# Logging
logging.basicConfig(level=logging.INFO, format="%(asctime)s %(name)s %(levelname)s %(message)s")
logger = logging.getLogger("helpdesk")


def seed_admin():
    """Create a default admin account if none exists."""
    db = SessionLocal()
    try:
        admin = db.query(User).filter(User.role == UserRole.ADMIN).first()
        if not admin:
            admin = User(
                username="admin",
                email="admin@helpdesk.local",
                password_hash=hash_password("Admin123!"),
                role=UserRole.ADMIN,
            )
            db.add(admin)

            # Also seed a demo technician and end user
            tech = User(
                username="technician",
                email="tech@helpdesk.local",
                password_hash=hash_password("Tech1234!"),
                role=UserRole.TECHNICIAN,
            )
            end_user = User(
                username="user",
                email="user@helpdesk.local",
                password_hash=hash_password("User1234!"),
                role=UserRole.END_USER,
            )
            db.add_all([tech, end_user])
            db.commit()
            logger.info("Seeded default accounts: admin / technician / user")
    finally:
        db.close()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan: create tables and seed data on startup."""
    Base.metadata.create_all(bind=engine)
    seed_admin()
    logger.info("Help Desk API started successfully")
    yield
    logger.info("Help Desk API shutting down")


# Rate limiter
limiter = Limiter(key_func=get_remote_address)

# Application
app = FastAPI(
    title="IT Help Desk API",
    description="Production-ready IT Help Desk / Ticketing System",
    version="1.0.0",
    lifespan=lifespan,
)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# CORS — in production, restrict origins to your frontend domain
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:5173", "http://localhost"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routers
app.include_router(auth.router, prefix="/api")
app.include_router(tickets.router, prefix="/api")
app.include_router(comments.router, prefix="/api")
app.include_router(users.router, prefix="/api")


@app.get("/api/health")
def health_check():
    """Health check endpoint."""
    return {"status": "healthy", "service": "helpdesk-api"}
