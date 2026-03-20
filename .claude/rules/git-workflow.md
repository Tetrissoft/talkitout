# Git Branch & Commit Strategy

This document defines the branching model, commit conventions, and workflow
that Claude MUST follow when working on the TalkItOut project.

---

## Branch Structure

```
main                        ← Production-ready code (protected)
├── develop                 ← Integration branch for next release
│   ├── feature/*           ← New features
│   ├── fix/*               ← Bug fixes
│   ├── refactor/*          ← Code refactoring (no behavior change)
│   ├── chore/*             ← Tooling, deps, config, CI/CD
│   ├── docs/*              ← Documentation only
│   └── test/*              ← Adding or updating tests
├── release/*               ← Release preparation
└── hotfix/*                ← Urgent production fixes
```

## Branch Naming Convention

Format: `<type>/<short-description>`

| Type         | Use Case                          | Example                          |
| ------------ | --------------------------------- | -------------------------------- |
| `feature/`   | New functionality                 | `feature/appointment-reminders`  |
| `fix/`       | Bug fixes                         | `fix/login-token-expiry`         |
| `refactor/`  | Code improvements, no new feature | `refactor/api-error-handling`    |
| `chore/`     | Dependencies, config, CI/CD       | `chore/upgrade-prisma-v6`        |
| `docs/`      | Documentation changes             | `docs/api-endpoint-guide`        |
| `test/`      | Test additions or fixes           | `test/auth-guard-unit-tests`     |
| `release/`   | Release candidates                | `release/v1.2.0`                 |
| `hotfix/`    | Critical production fixes         | `hotfix/fix-jwt-crash`           |

### Rules
- Use lowercase and kebab-case: `feature/user-profile` NOT `Feature/UserProfile`
- Keep branch names under 50 characters
- Be descriptive but concise
- Never commit directly to `main` or `develop`

---

## Commit Message Convention

Follow **Conventional Commits** format:

```
<type>(<scope>): <subject>

<body>

<footer>
```

### Type (required)

| Type         | When to Use                                    |
| ------------ | ---------------------------------------------- |
| `feat`       | New feature for the user                       |
| `fix`        | Bug fix                                        |
| `refactor`   | Code change that neither fixes a bug nor adds a feature |
| `style`      | Formatting, whitespace, missing semicolons (no logic change) |
| `docs`       | Documentation only changes                     |
| `test`       | Adding or updating tests                       |
| `chore`      | Build process, dependencies, CI/CD, tooling    |
| `perf`       | Performance improvement                        |
| `ci`         | CI/CD configuration changes                    |
| `revert`     | Reverting a previous commit                    |

### Scope (optional but recommended)

Use the module or area affected:

- **Frontend:** `ui`, `auth`, `pages`, `components`, `hooks`, `api-client`, `styles`
- **Backend:** `api`, `auth`, `users`, `doctors`, `customers`, `appointments`, `time-slots`, `assessments`, `ai`, `prisma`
- **Infra:** `docker`, `ci`, `config`, `deps`

### Subject (required)
- Use imperative mood: "add" not "added" or "adds"
- No period at the end
- Max 50 characters
- Lowercase first letter

### Body (optional)
- Explain **what** and **why**, not **how**
- Wrap at 72 characters
- Separate from subject with a blank line

### Footer (optional)
- Reference issues: `Closes #123`, `Fixes #456`
- Breaking changes: `BREAKING CHANGE: description`

### Examples

```
feat(appointments): add email notification on booking

Send confirmation email to customer and therapist when a new
appointment is scheduled. Uses the existing email service.

Closes #42
```

```
fix(auth): resolve token refresh race condition

Multiple simultaneous API calls could trigger parallel token
refreshes, causing 401 errors. Added mutex lock to refresh flow.
```

```
chore(deps): upgrade prisma to v5.22

Updated Prisma client and engine. Ran migrations successfully.
No schema changes required.
```

```
refactor(api-client): extract error handling into interceptor

Moved repetitive try-catch blocks from individual API functions
into a centralized Axios response interceptor.
```

```
docs(readme): update setup instructions for docker workflow
```

---

## Workflow: Feature Development

Claude MUST follow this workflow when implementing features or fixes:

### 1. Create Branch
```bash
git checkout develop
git pull origin develop
git checkout -b feature/descriptive-name
```

### 2. Make Changes
- Write code in small, logical commits
- Each commit should be a single logical change
- Keep commits atomic — one commit should not mix unrelated changes

### 3. Commit Changes
```bash
git add <specific-files>
git commit -m "feat(scope): descriptive message"
```

**IMPORTANT Rules:**
- Stage specific files — never use `git add .` or `git add -A`
- Never commit `.env`, credentials, or secrets
- Never amend commits unless explicitly asked
- Never force push
- Never skip hooks (`--no-verify`)
- Create NEW commits after hook failures, don't amend

### 4. Push & Create PR
```bash
git push -u origin feature/descriptive-name
```

Then create a PR targeting `develop` (not `main`).

### 5. PR Merge Strategy
- **feature → develop:** Squash merge (clean history)
- **develop → main:** Merge commit (preserve release context)
- **hotfix → main:** Merge commit, then cherry-pick to develop

---

## Workflow: Hotfix

For urgent production fixes:

```bash
git checkout main
git pull origin main
git checkout -b hotfix/describe-the-fix
# ... make fix ...
git commit -m "fix(scope): describe the fix"
git push -u origin hotfix/describe-the-fix
# Create PR → main
# After merge, cherry-pick to develop
```

---

## Workflow: Release

```bash
git checkout develop
git pull origin develop
git checkout -b release/v1.x.x
# ... version bump, final testing ...
git commit -m "chore(release): bump version to v1.x.x"
git push -u origin release/v1.x.x
# Create PR → main
# Tag after merge: git tag v1.x.x
```

---

## What NOT to Do

- Do NOT commit directly to `main` or `develop`
- Do NOT use `git add .` or `git add -A` (stage specific files)
- Do NOT force push to shared branches
- Do NOT amend commits that are already pushed
- Do NOT mix unrelated changes in a single commit
- Do NOT commit generated files (dist/, node_modules/, .prisma/)
- Do NOT commit environment files (.env, .env.local)
- Do NOT write vague commit messages ("fix stuff", "update", "wip")
- Do NOT create commits without being asked by the user
