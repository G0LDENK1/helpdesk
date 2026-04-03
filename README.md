# 🛠️ IT Help Desk — Ticketing System

A production-ready IT Help Desk and Ticketing System built with FastAPI, React, PostgreSQL, and Docker.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | React 18 + Vite + Tailwind CSS + Axios |
| **Backend** | Python FastAPI + SQLAlchemy ORM |
| **Database** | PostgreSQL 16 |
| **Auth** | JWT (access + refresh tokens) + bcrypt + RBAC |
| **Deployment** | Docker + docker-compose + Nginx reverse proxy |

## Features

- **3-role RBAC**: End User, Technician, Admin with enforced permissions
- **Ticket lifecycle**: Create → Assign → In Progress → Resolved → Closed
- **Priority levels**: Low, Medium, High, Critical (color-coded)
- **Categories**: Network, Hardware, Software, Access, Other
- **Comment threads**: Public + internal (staff-only) comments
- **Audit logging**: Full change history on every ticket
- **In-app notifications**: Real-time notification system with polling
- **Search & filtering**: By status, priority, category, text search, date range
- **Dashboard**: Role-specific stats and recent tickets overview
- **Dark mode UI**: Clean, modern, responsive design
- **JWT security**: Access + refresh tokens with auto-refresh
- **Rate limiting**: API-level rate limiting via slowapi
- **Input validation**: Pydantic schemas + SQL injection prevention via ORM

## Quick Start

### Prerequisites
- Docker & Docker Compose installed

### Launch

```bash
cd projects/helpdesk

# Start all services
docker-compose up --build -d

# View logs
docker-compose logs -f
```

The app will be available at:
- **Frontend**: http://localhost:3000 (or http://localhost via nginx)
- **Backend API**: http://localhost:8000
- **API Docs**: http://localhost:8000/docs (Swagger UI)

### Demo Accounts

The system seeds three demo accounts on first run:

| Role | Username | Password |
|------|----------|----------|
| **Admin** | `admin` | `Admin123!` |
| **Technician** | `technician` | `Tech1234!` |
| **End User** | `user` | `User1234!` |

## API Endpoints

### Authentication
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Register new account |
| POST | `/api/auth/login` | Login, get JWT tokens |
| POST | `/api/auth/refresh` | Refresh access token |
| GET | `/api/auth/me` | Current user profile |

### Tickets
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/tickets` | List tickets (with filters) |
| POST | `/api/tickets` | Create ticket |
| GET | `/api/tickets/stats` | Dashboard statistics |
| GET | `/api/tickets/{id}` | Get ticket details |
| PUT | `/api/tickets/{id}` | Update ticket |
| DELETE | `/api/tickets/{id}` | Delete ticket (admin) |
| POST | `/api/tickets/{id}/assign` | Assign to technician |
| GET | `/api/tickets/{id}/comments` | List comments |
| POST | `/api/tickets/{id}/comments` | Add comment |
| GET | `/api/tickets/{id}/audit` | Audit log |

### Users & Notifications
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/users` | List users (admin) |
| GET | `/api/users/technicians` | List technicians |
| PUT | `/api/users/{id}` | Update user (admin) |
| GET | `/api/notifications` | User notifications |
| POST | `/api/notifications/read-all` | Mark all read |
| POST | `/api/notifications/{id}/read` | Mark one read |

## Database Schema

```
Users: id, username, email, password_hash, role, is_active, created_at
Tickets: id, title, description, status, priority, category, created_by, assigned_to, created_at, updated_at
Comments: id, ticket_id, user_id, content, is_internal, created_at
AuditLog: id, ticket_id, user_id, action, old_value, new_value, created_at
Notifications: id, user_id, ticket_id, message, is_read, created_at
```

## Project Structure

```
helpdesk/
├── docker-compose.yml
├── .env.example
├── README.md
├── backend/
│   ├── Dockerfile
│   ├── requirements.txt
│   ├── main.py                    # FastAPI app entry point
│   └── app/
│       ├── database.py            # DB engine + session
│       ├── models.py              # SQLAlchemy models
│       ├── schemas.py             # Pydantic schemas
│       ├── core/
│       │   ├── security.py        # JWT + bcrypt
│       │   └── deps.py            # Auth + RBAC dependencies
│       └── routers/
│           ├── auth.py            # Auth endpoints
│           ├── tickets.py         # Ticket CRUD + assign
│           ├── comments.py        # Comments + audit log
│           └── users.py           # User mgmt + notifications
├── frontend/
│   ├── Dockerfile
│   ├── package.json
│   ├── vite.config.js
│   ├── tailwind.config.js
│   ├── index.html
│   └── src/
│       ├── main.jsx
│       ├── App.jsx
│       ├── index.css
│       ├── api/client.js          # Axios + JWT interceptors
│       ├── context/AuthContext.jsx # Auth state management
│       ├── components/
│       │   ├── Sidebar.jsx
│       │   ├── TicketCard.jsx
│       │   ├── StatusBadge.jsx
│       │   └── CommentThread.jsx
│       └── pages/
│           ├── Login.jsx
│           ├── Dashboard.jsx
│           ├── Tickets.jsx
│           ├── TicketDetail.jsx
│           └── CreateTicket.jsx
└── nginx/
    └── nginx.conf                 # Reverse proxy config
```

## Production Deployment

1. **Change the SECRET_KEY** in docker-compose.yml (use `openssl rand -hex 32`)
2. **Change database passwords** in docker-compose.yml
3. **Update CORS origins** in `backend/main.py` to your domain
4. **Add HTTPS** via Let's Encrypt / Caddy / Cloudflare
5. **Set up backups** for the PostgreSQL volume

## Development

```bash
# Backend only (with hot reload)
cd backend
pip install -r requirements.txt
uvicorn main:app --reload --port 8000

# Frontend only (with hot reload)
cd frontend
npm install
npm run dev
```
