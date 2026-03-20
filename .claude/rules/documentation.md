---
paths:
  - "**/*.ts"
  - "**/*.tsx"
  - "backend/prisma/**"
  - "docs/**"
  - "ARCHITECTURE.md"
  - "CLAUDE.md"
---

# Documentation Strategy

Claude MUST keep documentation in sync with code changes. Documentation is a first-class deliverable, not an afterthought.

## Documentation Structure

```
docs/
├── features/              # Feature design documents (one per feature)
│   ├── telegram-checkin-bot.md
│   └── customer-profile.md
└── api/                   # API-specific docs (if needed beyond Swagger)

ARCHITECTURE.md            # System architecture, schema, flows, API table
CLAUDE.md                  # Dev workflow, coding standards, conventions
```

## What to Document

### Feature Design Documents (`docs/features/`)
- Created during Phase 2 of the Feature Development Workflow
- One file per feature, named with kebab-case: `feature-name.md`
- Must include: Problem Statement, User Stories, User Flow, Technical Design, API Contracts, Tasks
- These are living documents — update when implementation deviates from the original design
- Add a "Status" field at the top: `Draft`, `Approved`, `In Progress`, `Completed`

### ARCHITECTURE.md — Update When:
- A new backend module is added (update Project Structure + API Structure table)
- Database schema changes (update Database Schema diagram)
- A new integration is added (e.g., Telegram bot, n8n, external APIs)
- Authentication or authorization model changes
- A new user flow is added (add a new "## Flow" section)
- Ports or deployment config changes

### CLAUDE.md — Update When:
- New coding standards or conventions are established
- New scopes are added for commit messages
- Build commands change
- File structure conventions change
- Workflow rules change

## When to Update Documentation

### Auto-Detection — Claude MUST proactively update docs when:

1. **New API endpoints added** → Update ARCHITECTURE.md API Structure table
2. **New database model or field added** → Update ARCHITECTURE.md Database Schema
3. **New backend module created** → Update ARCHITECTURE.md Project Structure
4. **New feature completed** → Create or update `docs/features/<feature-name>.md` with final state
5. **New integration added** → Add integration section to ARCHITECTURE.md
6. **Schema migration run** → Verify ARCHITECTURE.md schema diagram matches
7. **New commit scope used** → Add to CLAUDE.md scopes list if not present
8. **Feature design approved** → Save feature doc to `docs/features/` before coding

### Action: After completing a feature or significant change, tell the user:
> "Documentation updated: [list of files updated and what changed]"

## Documentation Quality Rules

- Keep ARCHITECTURE.md concise — it's a reference, not a tutorial
- Feature docs can be detailed — they capture decisions and rationale
- Use tables for structured data (endpoints, roles, statuses)
- Use diagrams (ASCII art) for relationships and flows
- Always include API request/response contracts in feature docs
- Update the "Status" in feature docs as work progresses
- Never let ARCHITECTURE.md and actual code drift apart
