# TalkItOut - Project Architecture

## Overview

TalkItOut is a full-stack mental wellness platform offering free psychology consultation services. It features a React frontend, NestJS backend, and PostgreSQL database with role-based access control, appointment scheduling, AI-powered psychological assessments, daily check-ins (web + Telegram), and session notes.

## Tech Stack

| Layer        | Technology                                       |
| ------------ | ------------------------------------------------ |
| Frontend     | React 18, TypeScript, Vite, TailwindCSS, Radix UI |
| Backend      | NestJS 10, Prisma 5, Passport JWT                |
| Database     | PostgreSQL 16                                    |
| AI           | Google Gemini 2.0 Flash (Mira AI companion)      |
| Integrations | n8n (workflow automation), Telegram Bot API      |
| Deployment   | Docker Compose, Nginx                            |

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
│   │   └── admin/
│   │       ├── Dashboard.tsx     # Admin dashboard
│   │       ├── Users.tsx         # User management
│   │       ├── Doctors.tsx       # Doctor/therapist management
│   │       ├── Customers.tsx     # Customer list (links to profile)
│   │       ├── CustomerProfile.tsx # Patient profile: notes, check-ins, info
│   │       ├── Appointments.tsx  # Appointment management
│   │       ├── TimeSlots.tsx     # Doctor availability
│   │       ├── CheckInQuestions.tsx # Check-in question library (admin)
│   │       ├── SessionNotes.tsx  # Session notes (standalone view)
│   │       └── CustomerCheckIns.tsx # Check-in history (standalone view)
│   ├── contexts/AuthContext.tsx  # Global auth state (JWT + roles)
│   ├── services/api.ts          # Typed API client
│   ├── types/admin.ts           # TypeScript interfaces
│   ├── hooks/                   # use-mobile, use-toast, use-meta-pixel, use-calendly
│   ├── lib/config.ts            # API URL config
│   └── App.tsx                  # Route definitions
│
├── backend/                     # Backend (NestJS)
│   ├── src/
│   │   ├── auth/                # JWT auth, guards, strategies, decorators
│   │   ├── users/               # User CRUD + role management
│   │   ├── doctors/             # Therapist/intern profiles + supervision
│   │   ├── customers/           # Customer profiles + intern assignment
│   │   ├── appointments/        # Scheduling + status tracking
│   │   ├── time-slots/          # Doctor availability management
│   │   ├── assessments/         # Assessment submissions + AI reports
│   │   ├── ai/                  # AI report generation service (mock)
│   │   ├── checkins/            # Daily check-ins + Telegram bot API
│   │   ├── session-notes/       # Per-appointment therapist notes
│   │   ├── mira/                # Mira AI companion (Gemini function calling)
│   │   ├── common/              # Shared guards (API key guard)
│   │   ├── prisma/              # Prisma ORM client module
│   │   ├── app.module.ts        # Root module
│   │   └── main.ts              # Bootstrap (CORS, validation, Swagger)
│   └── prisma/
│       ├── schema.prisma        # Database schema
│       └── seed.ts              # Demo data seeder
│
├── docs/
│   └── features/                # Feature design documents
│       ├── telegram-checkin-bot.md
│       ├── customer-profile.md
│       └── mira-ai-companion.md
│
├── .claude/
│   ├── rules/                   # Claude behavior rules
│   │   ├── backend.md           # NestJS coding rules
│   │   ├── frontend.md          # React coding rules
│   │   ├── database.md          # Prisma/DB rules
│   │   ├── git-workflow.md      # Branch/commit strategy
│   │   └── documentation.md     # Documentation update rules
│   ├── settings.json            # Project-level Claude settings + hooks
│   └── settings.local.json      # Local overrides (gitignored)
│
├── docker-compose.yml           # PostgreSQL + Backend + Frontend containers
├── Dockerfile                   # Frontend container (Nginx)
├── ARCHITECTURE.md              # This file
├── CLAUDE.md                    # Development workflow & standards
└── .env.example                 # Environment variable template
```

## Database Schema

```
┌──────────────────┐       ┌──────────────┐       ┌──────────────┐
│      User        │──1:1──│    Doctor     │──1:N──│   TimeSlot   │
│                  │       │ (therapist/   │       └──────┬───────┘
│  email (unique)  │       │   intern)     │──1:N──┐     │
│  role (enum)     │       │               │       │     │
│  name, phone     │       │ specialization│       │     │
│  telegramId      │       │ licenseNumber │       │     │
│  isActive        │       └──────┬────────┘       │     │
└────────┬─────────┘         supervises            │     │
         │                       │                 │     │
         │1:1             ┌──────────────┐         │     │
         └────────────────│   Customer   │──1:N────┤     │
                          │              │         │     │
                          │ dateOfBirth  │    ┌────┴─────┴──┐
                          │ address      │    │ Appointment  │──1:N──┐
                          │ emergencyCon │    │              │       │
                          │ notes        │    │  date        │  ┌────┴──────┐
                          │ checkinCat.  │    │  status      │  │SessionNote│
                          │ telegramChat │    │  notes       │  │           │
                          └──────────────┘    │  scheduledBy │  │ content   │
                               │1:N           └──────────────┘  │ isPrivate │
                               │                                │ doctorId  │
                          ┌────┴────────────┐                   │ customerid│
                          │  DailyCheckIn   │──1:N──┐           └───────────┘
                          │                 │       │
                          │ date (unique/d) │  ┌────┴───────────┐
                          │ filledById      │  │ CheckInResponse │
                          │ source (enum)   │  │                 │
                          │ selectedQues.   │  │ answerText      │
                          │ completedAt     │  │ answerScale     │
                          └─────────────────┘  │ answerChoice    │
                                               │ questionId      │
┌────────────────────┐                         └─────────────────┘
│  CheckInQuestion   │
│                    │
│ text, type (enum)  │
│ category (enum)    │
│ tags[]             │
│ options (Json)     │
│ scaleMin/Max       │
│ scaleMinLabel/Max  │
│ isActive, sortOrder│
└────────────────────┘

┌─────────────────────┐       ┌──────────────────────┐
│AssessmentParticipant │──1:N──│ AssessmentSubmission  │
│  name, email, age    │       │  testType, answers   │
└─────────────────────┘       │  report (AI Json)    │
                               └──────────────────────┘

Customer──1:N──┐                         Customer──1:N──┐
               │                                        │
        ┌──────┴──────────┐                     ┌───────┴──────┐
        │MiraConversation │──1:N──┐              │ CrisisAlert  │
        │                 │       │              │              │
        │ mode (enum)     │  ┌────┴────────┐    │ triggerMsg   │
        │ summary         │  │ MiraMessage  │    │ severity     │
        │ startedAt       │  │             │    │ notifiedAt   │
        │ endedAt         │  │ role (enum) │    │ resolvedAt   │
        └─────────────────┘  │ content     │    │ resolvedBy   │
                              │ metadata    │    └──────────────┘
                              └─────────────┘
```

### Enums

| Enum                     | Values                                                              |
| ------------------------ | ------------------------------------------------------------------- |
| `UserRole`               | `admin`, `therapist`, `intern`, `customer`                          |
| `DoctorType`             | `therapist`, `intern`                                               |
| `AppointmentStatus`      | `scheduled`, `completed`, `cancelled`, `no_show`                    |
| `CheckInQuestionType`    | `multiple_choice`, `scale`, `free_text`                             |
| `CheckInQuestionCategory`| `mood`, `anxiety`, `sleep`, `energy`, `social`, `stress`, `mindfulness`, `general` |
| `CheckInSource`          | `web`, `telegram`, `on_behalf`                                      |
| `MiraMode`               | `checkin`, `free_chat`                                              |
| `MiraMessageRole`        | `user`, `assistant`, `system`                                       |
| `CrisisSeverity`         | `low`, `medium`, `high`                                             |

### User Roles

| Role       | Capabilities                                                                     |
| ---------- | -------------------------------------------------------------------------------- |
| `admin`    | Full access: all therapist + intern capabilities, manage users, manage questions |
| `therapist`| Manage patients, assign interns, create appointments/time slots, write session notes, fill check-ins on behalf |
| `intern`   | View assigned patients, book appointments, fill check-ins on behalf              |
| `customer` | Take assessments, view bookings, complete daily check-ins via web or Telegram    |

### Appointment Statuses

`scheduled` → `completed` | `cancelled` | `no_show`

## Authentication Flow

1. User submits credentials to `POST /api/auth/login`
2. Backend validates with bcrypt, returns JWT
3. Frontend stores token in localStorage via `AuthContext`
4. All subsequent API calls include `Authorization: Bearer <token>`
5. `JwtAuthGuard` validates token globally; `RolesGuard` checks role permissions
6. `@Public()` decorator bypasses auth for open endpoints
7. Telegram API endpoints use API key auth (`x-api-key` header) instead of JWT

### First-Time Admin Setup

When the database is empty (no users), the login page detects this via `GET /auth/setup-status` and shows a one-time "Setup Admin Account" form instead of login/signup tabs.

1. Frontend calls `GET /api/auth/setup-status` → returns `{ setupRequired: true }`
2. Login page renders admin setup form (name, email, phone, password)
3. User submits → `POST /api/auth/setup` creates admin user, returns JWT
4. Setup endpoint refuses to work once any user exists (403 Forbidden)
5. Public signup endpoint is hardened: only `customer` role allowed

### Security Notes

- Public signup (`POST /auth/signup`) is restricted to `customer` role only
- Admin/therapist/intern accounts can only be created by an admin via `POST /users`
- First admin is created via `POST /auth/setup` (one-time, empty DB only)

## Assessment Flow

1. User navigates to `/plugin/assessment/:testId`
2. `AssessmentChat` presents conversational questions with typing indicators
3. Answers collected and submitted to `POST /api/assessments/submit`
4. `AssessmentsService` creates participant record, calls `AiService`
5. `AiService` generates a structured report (severity, recommendations, disclaimer)
6. `AssessmentReport` renders the result with severity levels

## Daily Check-in Flow

### Web Check-in
1. Patient logs in, navigates to check-in page
2. System selects up to 5 random questions from patient's assigned categories
3. Patient answers questions (scale, multiple choice, or free text)
4. Responses stored as `DailyCheckIn` + `CheckInResponse` records

### Fill on Behalf
1. Admin/therapist/intern opens patient profile → Check-ins tab
2. Clicks "Fill Check-in for Patient"
3. API selects questions based on patient's categories, creates check-in with `source: on_behalf` and `filledById`
4. Staff answers questions via dialog, submits responses
5. Check-in appears in history with "On behalf" badge and "Filled by" attribution

### Telegram Check-in (via n8n)
See [docs/features/telegram-checkin-bot.md](./docs/features/telegram-checkin-bot.md) for full design.

```
┌──────────┐    cron     ┌──────┐   GET /patients   ┌──────────┐
│ Telegram │◄────────────│  n8n │──────────────────►│ TalkItOut │
│   Bot    │  send msg   │      │  POST /start      │   API     │
│          │◄────────────│      │──────────────────►│           │
│          │             │      │  POST /respond    │           │
│  Patient │──callback──►│      │──────────────────►│           │
│  taps    │             │      │◄──next question───│           │
│  button  │◄──next Q────│      │                   │           │
└──────────┘             └──────┘                   └──────────┘
```

- **Auth**: API key (`x-api-key` header), not JWT
- **State**: API-managed (supports resume-later)
- **Questions**: Same selection logic as web (patient's assigned categories)
- **Conversation**: One question at a time, empathetic acknowledgments, warm greeting/completion

## Mira AI Companion

Mira is a Gemini-powered conversational AI wellness companion that makes Telegram check-ins feel like natural human conversation. See [docs/features/mira-ai-companion.md](./docs/features/mira-ai-companion.md) for full design.

### Architecture

```
┌──────────┐         ┌──────┐     POST /mira/message    ┌────────────┐
│ Telegram │◄────────│  n8n │───────────────────────────►│ MiraService │
│   User   │─reply──►│      │◄──────reply───────────────│            │
└──────────┘         └──────┘                            │  ┌────────┤
                                                         │  │ Gemini │
                                                         │  │  API   │
                                                         │  └──┬─────┤
                                                         │     │     │
                                                    ┌────┴─────┴──┐  │
                                                    │  Function   │  │
                                                    │  Calling    │  │
                                                    │  Loop       │  │
                                                    └──────┬──────┘  │
                                                           │         │
                                                    ┌──────┴──────┐  │
                                                    │ Memory/DB   │  │
                                                    │ Safety      │  │
                                                    │ Prompt      │  │
                                                    └─────────────┘  │
                                                         └───────────┘
```

### Modes
- **Check-in mode**: Mira asks daily check-in questions conversationally, extracts structured answers from natural responses, stores via `store_checkin_response` function call
- **Free chat mode**: Supportive listener outside check-in hours, no data collection

### Gemini Function Calling Tools
| Tool                      | Purpose                                    |
| ------------------------- | ------------------------------------------ |
| `get_patient_info`        | Fetch patient context (name, therapist)    |
| `get_checkin_questions`   | Get today's selected questions             |
| `store_checkin_response`  | Save a structured answer                   |
| `get_next_question`       | Get next unanswered question               |
| `get_checkin_history`     | Fetch historical scores for trends         |
| `mark_checkin_complete`   | Mark today's check-in as done              |
| `trigger_crisis_alert`    | Create crisis alert for therapist           |
| `save_conversation_note`  | Save therapist-relevant observation         |

### Crisis Detection
- **Fast path**: Keyword scan before Gemini call (immediate detection)
- **Nuanced path**: Gemini classifies during conversation (contextual detection)
- Alerts stored as `CrisisAlert` with severity levels, visible to therapists

## Customer Profile Page

Unified patient profile at `/admin/customers/:customerId` with 3 tabs:

| Tab                    | Content                                                           |
| ---------------------- | ----------------------------------------------------------------- |
| Appointments & Notes   | All session notes summary + per-appointment cards with inline notes |
| Daily Check-ins        | Check-in history with "On behalf" badges + "Fill for Patient" button |
| Info                   | Editable profile fields, Telegram Chat ID, check-in category pills |

## API Structure

All endpoints are prefixed with `/api`. Swagger docs available at `/api/docs`.

### JWT-Protected Endpoints

| Module       | Key Endpoints                                                          |
| ------------ | ---------------------------------------------------------------------- |
| Auth         | `POST /auth/login`, `POST /auth/signup`, `GET /auth/validate`, `GET /auth/setup-status`, `POST /auth/setup` |
| Users        | `GET/POST/PATCH/DELETE /users`                                        |
| Doctors      | `GET/POST/PATCH/DELETE /doctors`, `POST /doctors/assign-intern`       |
| Customers    | `GET/POST/PATCH/DELETE /customers`, `POST /customers/assign-intern`, `POST /customers/:id/telegram-link` |
| Appointments | `GET/POST/PATCH/DELETE /appointments`                                 |
| Time Slots   | `GET/POST/DELETE /time-slots`, `POST /time-slots/bulk`                |
| Assessments  | `POST /assessments/submit`                                            |
| Session Notes| `GET/POST/PATCH/DELETE /session-notes`, `GET /session-notes/customer/:id` |
| Check-ins    | `GET/POST /checkins/questions`, `PATCH/DELETE /checkins/questions/:id` |
| Check-ins    | `POST /checkins`, `POST /checkins/:id/responses`, `GET /checkins/my`  |
| Check-ins    | `GET /checkins/customer/:id`, `GET /checkins/customer/:id/summary`    |
| Check-ins    | `POST /checkins/customer/:id/fill`, `POST /checkins/customer/:id/:checkInId/responses` |
| Mira         | `GET /mira/conversations/:customerId`, `GET /mira/conversations/:id/summary`            |
| Mira         | `GET /mira/crisis-alerts`, `PATCH /mira/crisis-alerts/:id/resolve`                      |

### API Key-Protected Endpoints (Telegram / n8n)

| Endpoint                             | Method | Purpose                              |
| ------------------------------------ | ------ | ------------------------------------ |
| `/checkins/telegram/patients`        | GET    | List patients with Telegram Chat ID  |
| `/checkins/telegram/start`           | POST   | Start or resume daily check-in       |
| `/checkins/telegram/respond`         | POST   | Submit one answer, get next question  |
| `/checkins/telegram/status/:chatId`  | GET    | Check pending check-in status         |
| `/mira/message`                      | POST   | Send message to Mira AI companion     |

## Frontend Routes

| Path                              | Component         | Access     |
| --------------------------------- | ----------------- | ---------- |
| `/`                               | Index             | Public     |
| `/login`                          | Login             | Public     |
| `/book-appointment`               | BookAppointment   | Public     |
| `/book-intern`                    | BookIntern        | Public     |
| `/plugin/assessment/:testId`      | AssessmentPlugin  | Public     |
| `/admin/dashboard`                | Dashboard         | Protected  |
| `/admin/users`                    | Users             | Protected  |
| `/admin/doctors`                  | Doctors           | Protected  |
| `/admin/customers`                | Customers         | Protected  |
| `/admin/customers/:customerId`    | CustomerProfile   | Protected  |
| `/admin/appointments`             | Appointments      | Protected  |
| `/admin/time-slots`               | TimeSlots         | Protected  |
| `/admin/checkin-questions`        | CheckInQuestions   | Protected (admin) |

## Ports

| Service    | Development | Docker |
| ---------- | ----------- | ------ |
| Frontend   | 3030        | 3060   |
| Backend    | 3001        | 3061   |
| PostgreSQL | 5432        | 5062   |
