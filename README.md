# TalkItOut

A free psychology consultation platform connecting people with therapists and interns for mental wellness support. Features appointment scheduling, role-based admin portal, and AI-powered psychological assessments.

## Features

- **Appointment Booking** — Schedule sessions with therapists and interns
- **Admin Portal** — Manage users, doctors, customers, appointments, and time slots
- **Role-Based Access** — Admin, therapist, intern, and customer roles with granular permissions
- **Psychological Assessments** — Interactive chat-based questionnaires with AI-generated wellness reports
- **Intern Supervision** — Assign interns to therapists for supervised practice
- **Responsive UI** — Modern interface with TailwindCSS and Radix UI components

## Tech Stack

- **Frontend:** React 18, TypeScript, Vite, TailwindCSS, Radix UI
- **Backend:** NestJS 10, Prisma ORM, Passport JWT
- **Database:** PostgreSQL 16
- **Deployment:** Docker Compose with Nginx

## Getting Started

### Prerequisites

- Node.js 18+
- PostgreSQL 16 (or Docker)
- npm

### Option 1: Docker (Recommended)

```bash
# Clone and configure
cp .env.example .env

# Start all services
docker-compose up -d --build
```

- Frontend: http://localhost:3060
- Backend API: http://localhost:3061/api
- Swagger Docs: http://localhost:3061/api/docs

### Option 2: Local Development

**1. Database**

Start a PostgreSQL instance and set `DATABASE_URL` in `backend/.env`:

```
DATABASE_URL="postgresql://user:password@localhost:5432/talkitout"
```

**2. Backend**

```bash
cd backend
npm install
npm run prisma:migrate    # Run database migrations
npm run prisma:seed       # Seed demo data (optional)
npm run start:dev         # Start on port 3001
```

**3. Frontend**

```bash
npm install
npm run dev               # Start on port 3030
```

## Environment Variables

| Variable       | Description              | Default                          |
| -------------- | ------------------------ | -------------------------------- |
| `DATABASE_URL` | PostgreSQL connection    | `postgresql://...`               |
| `JWT_SECRET`   | JWT signing secret       | —                                |
| `PORT`         | Backend port             | `3001`                           |
| `VITE_API_URL` | Backend API URL          | `http://localhost:3001`          |

## Scripts

### Frontend

| Command          | Description              |
| ---------------- | ------------------------ |
| `npm run dev`    | Start dev server         |
| `npm run build`  | Production build         |
| `npm run lint`   | Run ESLint               |

### Backend

| Command                    | Description                |
| -------------------------- | -------------------------- |
| `npm run start:dev`        | Dev server with hot reload |
| `npm run build`            | Compile to dist/           |
| `npm run start:prod`       | Run production build       |
| `npm run prisma:migrate`   | Run database migrations    |
| `npm run prisma:studio`    | Open Prisma Studio GUI     |
| `npm run prisma:seed`      | Seed demo data             |
| `npm test`                 | Run tests                  |

## API Documentation

Swagger/OpenAPI docs are available at `/api/docs` when the backend is running. All endpoints are prefixed with `/api`.

## Architecture

See [ARCHITECTURE.md](./ARCHITECTURE.md) for detailed project structure, database schema, and system design.

## License

All rights reserved. &copy; 2026 TalkItOut.
