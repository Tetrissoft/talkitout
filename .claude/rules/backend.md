---
paths:
  - "backend/src/**/*.ts"
  - "backend/prisma/**"
  - "backend/test/**"
---

# Backend Rules

## NestJS Architecture
- Follow module → controller → service → DTO pattern
- Each feature gets its own module directory under `backend/src/`
- Register all modules in `app.module.ts`
- Use dependency injection — never instantiate services manually

## Controllers
- Keep controllers thin — business logic belongs in services
- Use proper HTTP decorators: `@Get()`, `@Post()`, `@Patch()`, `@Delete()`
- Apply `@Roles()` decorator for role-restricted endpoints
- Use `@Public()` decorator for unauthenticated endpoints
- Return consistent response shapes

## Services
- All database operations via Prisma (`this.prisma.<model>`)
- Throw `NotFoundException`, `BadRequestException`, etc. for errors
- Never expose internal errors to clients

## DTOs & Validation
- Create separate DTOs for create and update operations
- Use `class-validator` decorators: `@IsString()`, `@IsEmail()`, `@IsOptional()`, etc.
- Update DTOs should extend create DTOs with `PartialType()`
- Global validation pipe is configured — DTOs are auto-validated

## Authentication & Guards
- `JwtAuthGuard` is applied globally — all endpoints require auth by default
- Use `@Public()` to opt out of auth
- Use `@Roles('admin', 'therapist')` for role-based access
- Access the current user via `@Request() req` → `req.user`

## Prisma & Database
- Schema lives in `backend/prisma/schema.prisma`
- After any schema change, run: `npm run prisma:migrate`
- Use `include` for relations, but only include what's needed
- Use transactions for multi-step database operations
- UUIDs for all primary keys (`@default(uuid())`)

## Testing
- Unit tests with Jest in `*.spec.ts` files
- Mock Prisma service in unit tests
- E2E tests in `backend/test/` directory
