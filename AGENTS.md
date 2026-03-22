# AGENTS.md

## Purpose
This repository is a Next.js 16 food e-commerce app with:

- public storefront pages
- admin management pages
- kitchen/preparer workflow
- cart + checkout
- email notifications
- PostgreSQL via Prisma

This file gives coding agents project-specific rules so changes stay aligned with the current architecture.

## Should This File Be Tracked?
Yes. This file should be committed to Git.

Reasons:
- it documents repository-specific engineering rules
- it helps future contributors and coding agents behave consistently
- it reduces accidental architectural drift

Do not put secrets, tokens, private credentials, or machine-local paths in this file.

## Stack
- Next.js 16 App Router
- React 19
- TypeScript
- Tailwind CSS v4
- shadcn/ui primitives
- NextAuth v5 beta
- Prisma + PostgreSQL
- Zustand for cart client state
- Vitest for tests

## Important Paths
- `app/(public_pages)` public storefront pages
- `app/(mangment)` admin area and management pages
- `app/kitchen` kitchen board
- `app/api` route handlers
- `components` feature and UI components
- `components/ui` shadcn-style reusable primitives
- `lib` business logic, helpers, notifications, realtime utilities
- `store/cartStore.ts` persisted cart state + server sync
- `prisma/schema.prisma` database schema
- `prisma/seed.ts` seed script
- `tests` Vitest coverage

Note: the route group name is spelled `mangment` in the repo. Do not silently rename it unless explicitly requested, because that would ripple through imports and routing.

## Architecture Notes

### Architectural Style
This codebase is a modular Next.js monolith with light layered separation:

- presentation layer: App Router pages, layouts, route groups, UI components
- application layer: route handlers and orchestration logic
- domain/business layer: `lib/*` rules, validations, money, workflow, notifications
- persistence layer: Prisma schema, migrations, seed, and database access

This is not strict clean architecture, but it does follow a practical separation of concerns.
Keep business rules in `lib` or server handlers, not buried inside visual components.

### Routing
- Public pages live under `app/(public_pages)`.
- Admin pages live under `app/(mangment)/admin`.
- Kitchen is a separate workflow under `app/kitchen`.
- Server endpoints live under `app/api/.../route.ts`.

### Rendering Model
- The project uses the Next.js App Router.
- Use server components by default when client interactivity is not needed.
- Use `"use client"` only for interactive UI, browser APIs, local state, Zustand access, or SSE consumers.
- Fetching in client components should generally be reserved for live dashboards, forms, cart interactions, and similar cases.

### Data Access
- Use `@/lib/prisma` for Prisma access in app code.
- Prisma client is generated to `app/generated/prisma`.
- Schema is PostgreSQL-based.
- Prefer server-side reads in route handlers or server components when possible.
- Keep Prisma query shape close to the server boundary; do not move raw database access deep into leaf components.

### Auth and Roles
- Auth is configured in `auth.ts`.
- Roles are `CUSTOMER`, `ADMIN`, `PREPARER`.
- Admin portal logic also allows `PREPARER` access in some flows.
- When changing role-sensitive behavior, inspect both UI guards and API authorization.

### Cart and Checkout
- Cart state is stored in Zustand and persisted locally, then synced to `/api/cart`.
- Checkout validates server-side with `lib/checkout-validation.ts`.
- Checkout emits kitchen events and notification emails.
- Preserve server-side validation even if client validation exists.

### Orders and Kitchen Realtime
- Realtime uses SSE, not websockets.
- Kitchen stream endpoint: `app/api/kitchen/events/route.ts`
- Public customer orders stream endpoint: `app/api/orders/events/route.ts`
- Shared event bus: `lib/kitchen-events.ts`
- If an order mutation should update kitchen/admin/public tracking, ensure the relevant event is published.
- Order transitions are centralized in `lib/order-workflow.ts`; UI selectors must follow that source of truth.
- Admin order listing comes from `app/api/admin/orders/route.ts` and is filter/pagination based.

### Theming
- Theme tokens are centralized in `app/globals.css`.
- Prefer semantic tokens such as `primary-*`, `secondary-*`, `success-*`, `warning-*`, `info-*`.
- Do not introduce new hardcoded brand colors into components if a token can be used instead.

## Working Rules

### When editing UI
- Reuse existing shadcn primitives from `components/ui`.
- Keep styling aligned with the semantic color system in `app/globals.css`.
- For new admin/kitchen UI, follow the current utility-class approach rather than introducing a separate styling pattern.
- Keep public copy in Spanish unless the surrounding screen is already intentionally English.
- Maintain correct Spanish grammar and spelling in all user-facing text.
- Use accents and tildes correctly in labels, buttons, alerts, descriptions, tables, and helper text.
- If a visible Spanish string appears degraded by encoding (for example `Configuracion`, `resenas`, `mÃ¡x`), fix it before closing the change.

### When editing API routes
- Keep authorization checks near the top of the handler.
- Validate request payloads with `zod` where the repo already does so.
- Return consistent JSON errors with appropriate status codes.
- Avoid moving business rules into components when they belong in API or `lib`.
- For mutations, consider whether the action should emit realtime events or notifications.

### When editing Prisma
- Update `prisma/schema.prisma`.
- Add a migration instead of editing old migrations.
- If seed data depends on the schema change, update `prisma/seed.ts`.
- Be aware the generated client output is `app/generated/prisma`.

### When editing notifications
- Notification templates live in `lib/notifications`.
- Keep email content logic separate from checkout/order mutation logic where possible.
- If you change notification triggers, review checkout and order update routes together.

### When editing orders
- Review both admin and kitchen flows.
- Status transitions are constrained by `lib/order-workflow.ts`.
- Do not bypass workflow rules in UI-only code.
- If you add a new mutation path, consider whether SSE refresh behavior must also change.
- Check public order tracking if the change affects customer-visible statuses.

### When editing cart behavior
- Preserve the current `Zustand + persist + server sync` design in `store/cartStore.ts`.
- Be careful with line-key semantics; item merging depends on them.
- Do not assume client cart state is the source of truth for checkout validation.

## Commands
- Install deps: `npm install`
- Dev server: `npm run dev`
- Build: `npm run build`
- Lint: `npm run lint`
- Tests: `npm test`
- Prisma generate: runs on `postinstall`, but can also be run with `npx prisma generate`
- Prisma migrate dev: `npx prisma migrate dev`
- Seed: `npx prisma db seed`

Prisma seed is configured through `prisma.config.ts` and runs `tsx prisma/seed.ts`.

## Environment Expectations
At minimum, changes in these areas may depend on environment variables:

- database: `DATABASE_URL`
- auth providers: Google/Facebook credentials
- auth/email flows
- notifications/email delivery
- seed defaults such as `SEED_*`

Do not hardcode secrets in code or tests.

## Testing Guidance
- Prefer targeted Vitest runs when changing pure logic in `lib`.
- Add or update tests for:
  - order workflow rules
  - checkout validation
  - route handler behavior
  - notification payload generation
- After modifying TypeScript-heavy UI/API code, at least run `npx tsc --noEmit` when possible.
- For realtime/order changes, validate the affected admin or kitchen screen behavior manually as well.
- When a change touches visible Spanish copy, also review accents, spelling, grammar, and UTF-8 integrity before closing the task.

## Repo Conventions
- Use path aliases like `@/lib/...`, `@/components/...`, `@/auth` where already established.
- Keep files in ASCII unless the file already uses non-ASCII and there is a clear reason.
- Avoid large refactors when a scoped patch fits the request.
- Respect existing Spanish copy in user-facing text.
- Preserve current naming and folder conventions unless the task is explicitly structural.
- Keep commit scope tight; prefer separate commits for unrelated admin, checkout, theme, and notification changes.

## Good Change Patterns
- Small feature change:
  - update UI
  - update route or `lib` logic
  - add or adjust tests

- Order lifecycle change:
  - update workflow rules
  - update mutation route
  - publish/consume realtime event if needed
  - verify admin/kitchen/public views

- Theme change:
  - adjust tokens in `app/globals.css`
  - migrate component classes to semantic tokens if needed

## Avoid
- Introducing parallel state machines for orders outside `lib/order-workflow.ts`
- Hardcoding brand colors in components
- Duplicating Prisma query logic across many UI components
- Renaming `app/(mangment)` casually
- Removing SSE refresh behavior from kitchen/admin flows without replacing it
