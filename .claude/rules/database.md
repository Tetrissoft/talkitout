---
paths:
  - "backend/prisma/**"
---

# Database Rules

## Schema Conventions
- All models use UUID primary keys: `id String @id @default(uuid())`
- Use `@unique` for natural keys (email, etc.)
- Include `createdAt` and `updatedAt` timestamps on all new models
- Define explicit relation names when a model has multiple relations to the same table
- Use enums for fixed value sets (roles, statuses, types)

## Migrations
- Always create a named migration: `npx prisma migrate dev --name descriptive_name`
- Never edit existing migration files — create new ones
- Test migrations against a fresh database before committing
- Run `npx prisma generate` after schema changes to update the client

## Seeding
- Seed script at `backend/prisma/seed.ts`
- Run with: `npm run prisma:seed`
- Seeds should be idempotent (safe to run multiple times)

## Querying Best Practices
- Use `select` to limit returned fields when you don't need the full model
- Use `include` sparingly — only load relations when needed
- Use `where` filters at the database level, not in application code
- Use Prisma transactions for operations that must be atomic
