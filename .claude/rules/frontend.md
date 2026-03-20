---
paths:
  - "src/**/*.{ts,tsx}"
  - "src/**/*.css"
  - "index.html"
  - "vite.config.ts"
  - "tailwind.config.*"
---

# Frontend Rules

## Components
- Use functional components with TypeScript interfaces for props
- Destructure props in the function signature
- Use `React.FC` sparingly — prefer explicit return types
- Keep components under 150 lines; extract sub-components when larger
- Co-locate component-specific hooks and utilities

## Styling
- Use TailwindCSS utility classes exclusively
- Use `cn()` helper from `@/lib/utils` for conditional class merging
- Prefer Radix UI / shadcn primitives for interactive elements (Dialog, Select, Tabs, etc.)
- Mobile-first responsive design with Tailwind breakpoints

## State Management
- Use React Context for global state (auth, theme)
- Use React Query for server state / API caching
- Use local `useState` / `useReducer` for component-level state
- Avoid prop drilling beyond 2 levels — use context or composition

## Routing
- All routes defined in `src/App.tsx` via React Router v6
- Admin routes wrapped in `<ProtectedRoute>` with role checks
- Use `useNavigate()` for programmatic navigation

## API Calls
- All API calls go through `src/services/api.ts`
- Never call `fetch` directly from components
- Handle loading and error states in every data-fetching component

## Forms
- Use React Hook Form with Zod schemas for validation
- Show inline validation errors below each field
- Disable submit button during submission
