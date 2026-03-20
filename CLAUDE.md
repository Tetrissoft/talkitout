# TalkItOut - Project Context

## Project Overview

TalkItOut is a full-stack mental wellness platform with a React frontend and NestJS backend.
See [ARCHITECTURE.md](./ARCHITECTURE.md) for detailed system design.

## Tech Stack

- **Frontend:** React 18 + TypeScript + Vite + TailwindCSS + Radix UI
- **Backend:** NestJS 10 + Prisma 5 + PostgreSQL 16 + Passport JWT
- **Deployment:** Docker Compose with Nginx

## Build & Run Commands

### Frontend (root directory)

```bash
npm install          # Install dependencies
npm run dev          # Dev server on port 3030
npm run build        # Production build
npm run lint         # ESLint check
```

### Backend (backend/ directory)

```bash
cd backend
npm install              # Install dependencies
npm run start:dev        # Dev server with hot reload on port 3001
npm run build            # Compile to dist/
npm run prisma:migrate   # Run database migrations
npm run prisma:studio    # Open Prisma Studio
npm run prisma:seed      # Seed demo data
npm test                 # Run Jest tests
```

### Docker

```bash
docker-compose up -d --build   # Start all services
```

## Coding Standards

- Use TypeScript strict mode — no `any` types unless absolutely necessary
- Functional React components only — no class components
- One component per file, named matching the file name
- Use `@/` path alias for imports (configured in vite.config.ts and tsconfig.json)
- TailwindCSS for styling — no inline styles or CSS modules
- Backend follows NestJS modular architecture: module → controller → service → DTO
- All DTOs must use class-validator decorators for input validation
- Use Prisma for all database operations — no raw SQL

## Authentication & Authorization

- JWT-based auth with `@Public()` decorator for open endpoints
- Role-based access: `admin`, `therapist`, `intern`, `customer`
- Use `@Roles()` decorator + `RolesGuard` for endpoint protection
- Passwords hashed with bcrypt — never store plaintext

## API Conventions

- All endpoints prefixed with `/api`
- Swagger docs at `/api/docs`
- Use proper HTTP methods: GET (read), POST (create), PATCH (update), DELETE (remove)
- Return consistent error responses with appropriate status codes

## Database

- Schema defined in `backend/prisma/schema.prisma`
- Always create a migration after schema changes: `npm run prisma:migrate`
- UUIDs for all primary keys
- Soft relationships via foreign keys with proper cascading

## Git Workflow (MUST FOLLOW)

### Branch Strategy
- `main` — production-ready, protected (never commit directly)
- `develop` — integration branch for next release
- `feature/*` — new features (branch from develop)
- `fix/*` — bug fixes
- `refactor/*` — code improvements
- `chore/*` — deps, config, CI/CD
- `hotfix/*` — urgent production fixes (branch from main)

### Commit Convention: Conventional Commits
```
<type>(<scope>): <subject>
```
- **Types:** `feat`, `fix`, `refactor`, `style`, `docs`, `test`, `chore`, `perf`, `ci`
- **Scopes:** `ui`, `auth`, `api`, `users`, `doctors`, `customers`, `appointments`, `assessments`, `prisma`, `docker`, `deps`
- Use imperative mood: "add" not "added"
- Stage specific files only — NEVER `git add .` or `git add -A`
- NEVER commit to `main` or `develop` directly
- NEVER commit `.env`, secrets, or generated files
- NEVER amend pushed commits or force push

See `.claude/rules/git-workflow.md` for full workflow details.

## File Structure Reference

- Frontend pages: `src/pages/`
- Frontend components: `src/components/`
- Frontend API client: `src/services/api.ts`
- Frontend types: `src/types/admin.ts`
- Backend modules: `backend/src/<module>/`
- Database schema: `backend/prisma/schema.prisma`

@ARCHITECTURE.md
