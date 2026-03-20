# TalkItOut - Project Architecture

## Overview

TalkItOut is a full-stack mental wellness platform offering free psychology consultation services. It features a React frontend, NestJS backend, and PostgreSQL database with role-based access control, appointment scheduling, and AI-powered psychological assessments.

## Tech Stack

| Layer      | Technology                                      |
| ---------- | ----------------------------------------------- |
| Frontend   | React 18, TypeScript, Vite, TailwindCSS, Radix UI |
| Backend    | NestJS 10, Prisma 5, Passport JWT               |
| Database   | PostgreSQL 16                                   |
| Deployment | Docker Compose, Nginx                           |

## Project Structure

```
talkitout.com/
├── src/                          # Frontend (React)
│   ├── components/
│   │   ├── ui/                   # Radix/Shadcn UI primitives
│   │   ├── admin/                # AdminLayout, ProtectedRoute
│   │   └── assessments/          # AssessmentChat, AssessmentReport
│   ├── pages/
│   │   ├── Index.tsx             # Landing page
│   │   ├── Login.tsx             # Unified login/signup
│   │   ├── BookAppointment.tsx   # Public booking
│   │   ├── BookIntern.tsx        # Intern booking flow
│   │   ├── AssessmentPlugin.tsx  # Mental wellness assessment
│   │   └── admin/                # Dashboard, Users, Doctors, Customers,
│   │                             # Appointments, TimeSlots
│   ├── contexts/AuthContext.tsx  # Global auth state (JWT + roles)
│   ├── services/api.ts           # Typed API client
│   ├── types/admin.ts            # TypeScript interfaces
│   ├── hooks/                    # use-mobile, use-toast, use-meta-pixel, use-calendly
│   ├── lib/config.ts             # API URL config
│   └── App.tsx                   # Route definitions
│
├── backend/                      # Backend (NestJS)
│   ├── src/
│   │   ├── auth/                 # JWT auth, guards, strategies, decorators
│   │   ├── users/                # User CRUD + role management
│   │   ├── doctors/              # Therapist/intern profiles + supervision
│   │   ├── customers/            # Customer profiles + intern assignment
│   │   ├── appointments/         # Scheduling + status tracking
│   │   ├── time-slots/           # Doctor availability management
│   │   ├── assessments/          # Assessment submissions + AI reports
│   │   ├── ai/                   # AI report generation service (mock)
│   │   ├── prisma/               # Prisma ORM client module
│   │   ├── app.module.ts         # Root module
│   │   └── main.ts               # Bootstrap (CORS, validation, Swagger)
│   └── prisma/
│       └── schema.prisma         # Database schema
│
├── docker-compose.yml            # PostgreSQL + Backend + Frontend containers
├── Dockerfile                    # Frontend container (Nginx)
└── .env.example                  # Environment variable template
```

## Database Schema

```
┌──────────┐       ┌──────────┐       ┌──────────────┐
│   User   │──1:1──│  Doctor   │──1:N──│   TimeSlot   │
│          │       │(therapist/│       └──────┬───────┘
│  email   │       │  intern)  │──1:N──┐     │
│  role    │       │           │       │     │
│  name    │       └──────────┘       │     │
│  phone   │              │            │     │
└──────────┘         supervises        │     │
     │                    │            │     │
     │1:1          ┌──────────┐        │     │
     └─────────────│ Customer │──1:N───┤     │
                   │          │        │     │
                   │  dob     │   ┌────┴─────┴──┐
                   │  notes   │   │ Appointment  │
                   └──────────┘   │              │
                                  │  date        │
                                  │  status      │
                                  │  notes       │
                                  └──────────────┘

┌─────────────────────┐       ┌──────────────────────┐
│AssessmentParticipant │──1:N──│ AssessmentSubmission  │
│  name, email, age    │       │  testType, answers   │
└─────────────────────┘       │  report (AI JSON)    │
                               └──────────────────────┘
```

### User Roles

| Role       | Capabilities                                                    |
| ---------- | --------------------------------------------------------------- |
| `admin`    | Full access: manage users, doctors, customers, appointments     |
| `therapist`| Manage customers, assign interns, create appointments, time slots|
| `intern`   | View assigned customers, book appointments                      |
| `customer` | Take assessments, view bookings                                 |

### Appointment Statuses

`scheduled` → `completed` | `cancelled` | `no_show`

## Authentication Flow

1. User submits credentials to `POST /api/auth/login`
2. Backend validates with bcrypt, returns JWT
3. Frontend stores token in localStorage via `AuthContext`
4. All subsequent API calls include `Authorization: Bearer <token>`
5. `JwtAuthGuard` validates token globally; `RolesGuard` checks role permissions
6. `@Public()` decorator bypasses auth for open endpoints

## Assessment Flow

1. User navigates to `/plugin/assessment/:testId`
2. `AssessmentChat` presents conversational questions with typing indicators
3. Answers collected and submitted to `POST /api/assessments/submit`
4. `AssessmentsService` creates participant record, calls `AiService`
5. `AiService` generates a structured report (severity, recommendations, disclaimer)
6. `AssessmentReport` renders the result with severity levels

## API Structure

All endpoints are prefixed with `/api`. Swagger docs available at `/api/docs`.

| Module       | Key Endpoints                                       |
| ------------ | --------------------------------------------------- |
| Auth         | `POST /auth/login`, `POST /auth/signup`             |
| Users        | `GET/POST/PATCH/DELETE /users`                      |
| Doctors      | `GET/POST/PATCH/DELETE /doctors`, `POST /doctors/:id/assign-intern` |
| Customers    | `GET/POST/PATCH/DELETE /customers`, `POST /customers/:id/assign-intern` |
| Appointments | `GET/POST/PATCH/DELETE /appointments`               |
| Time Slots   | `GET/POST/PATCH/DELETE /time-slots`, `POST /time-slots/bulk` |
| Assessments  | `POST /assessments/submit`                          |

## Ports

| Service    | Development | Docker |
| ---------- | ----------- | ------ |
| Frontend   | 3030        | 3060   |
| Backend    | 3001        | 3061   |
| PostgreSQL | 5432        | 5062   |
