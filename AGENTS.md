# AGENTS.md — SMARTLOG

SMARTLOG is an OJT monitoring system for Tangub City Global College (research capstone). Product spec: `SMARTLOG-SYSTEM.md`; design system: `THEMES.md` (read both before domain/UI work).

## Layout

- `backend/` — Laravel 12 (PHP 8.2) pure REST/JSON API. **Not Inertia**: `backend/resources/`, `backend/vite.config.js`, `backend/package.json` are unused Laravel scaffold — leave them alone.
- `frontend/` — React 19 + Vite 8 SPA (react-router-dom v7). The only UI in the repo.
- `audit/` — per-task audit logs (see Workflow). Gitignored; never stage it.

## Commands

Backend (run in `backend/`):

- Serve: `php artisan serve` → API at `http://localhost:8000/api`
- Tests (Pest): `php artisan test --compact`; filter: `php artisan test --compact --filter=Name`
- Format after PHP edits: `vendor/bin/pint --dirty --format agent` (required)
- Seed: `php artisan db:seed` (users, academic terms, institutes, programs)
- DB: MySQL `smartlogdb` via XAMPP (root, empty password); tests use sqlite `:memory:` (phpunit.xml)

Frontend (run in `frontend/`):

- `npm run dev` (Vite :5173), `npm run build`, `npm run lint` (oxlint)
- API base: `VITE_API_URL` in `frontend/.env` → `http://localhost:8000/api` (no Vite proxy; CORS via Laravel defaults). `src/lib/api.js` falls back to that URL if env is missing.
- `npm run build` loads `frontend/.env.production` (`VITE_API_URL=https://smartlog-api.jezyk.me/api`) — a local build/preview will hit the production API, not localhost.
- New shadcn components: `npx shadcn@latest add <name>` from `frontend/` (config: JSX, style `radix-nova`)

## Backend conventions

- Response envelope: `{ "data": ... }` on every endpoint; paginated lists add `meta` (`current_page`, `last_page`, `per_page`, `total`, `from`, `to`); create → 201. Validation errors use Laravel's `{ "errors": { field: [...] } }`.
- Auth: JWT (`php-open-source-saver/jwt-auth`), guard `api` → `auth:api` middleware; routes in `routes/api.php`. `POST /login` returns `data.access_token` + `data.user`.
- Registration flow: public `POST /register` creates an **unverified** intern (auto-assigns active academic year); OTP email verification is mandatory before login (`POST /verify-email`, throttled `POST /verify-email/resend`). Unverified users cannot log in.
- Role guard: `role:` alias (`EnsureRole`, `bootstrap/app.php`) behind `auth:api`; groups like `->middleware('role:admin')`. Roles: `admin`, `ojt_coordinator`, `ojt_instructor`, `intern`, `hte`.
- Users keyed by `uuid` — route model binding is `{user:uuid}` (apiResources use `->parameters(['users' => 'user:uuid'])`). Never bind by numeric id.
- Role-specific one-to-one rows hang off users: `interns`, `htes`, `coordinators`, `locations`, exposed as nested endpoints (`users/{uuid}/intern`, ...).
- Controller layout: `app/Http/Controllers/Api/Admin/` per module; Form Requests in `app/Http/Requests/Admin/`; Resources in `app/Http/Resources/`. Copy `UserController` / `AcademicTermController` as templates.

## Frontend conventions

- **JSX only** — `components.json` has `"tsx": false`; shadcn components are `.jsx`. Never add `.tsx` (the lone `src/lib/utils.ts` is a shadcn artifact).
- Tailwind v4 via `@tailwindcss/vite` — **no `tailwind.config`**; tokens live in `src/index.css` `@theme`. Fonts Sora/DM Sans/JetBrains Mono, brand-green palette. **Ant Design does not exist in this repo** — do not import it.
- Icons: lucide-react only. Toasts: sonner (`toast.error(firstErrorMessage(err))` from `src/lib/errors.js`). Forms: react-hook-form + zod. All server calls through `src/lib/api.js` axios instance.
- Auth: `useAuth()` from `src/contexts/AuthContext.jsx`; token/user in localStorage (`smartlog_token`, `smartlog_user`); the axios 401 interceptor auto-redirects to `/login`.
- Page pattern: `src/pages/admin/<module>/XxxListPage.jsx` (server-side table — search/filter/sort/page as query params) + `XxxFormPage.jsx` (users: multi-step wizard) or `XxxFormDialog.jsx` (academic-terms, institutes, programs: dialog CRUD). Register routes in `src/App.jsx` and wrap pages in `ProtectedRoute roles={[...]}`. Each role has its own layout in `src/layouts/` (`AdminLayout`, `CoordinatorLayout`, `InternLayout`, `InstructorLayout`, `HteLayout`) — thin wrappers that pass nav/portal config to the shared `AppShell.jsx`.
- Mobile-first is mandatory: base styles target ~375px, enhance with `sm:`/`md:`/`lg:` only; touch targets ≥ 44px; sidebar only ≥ `lg`; bottom nav with `safe-area-inset-bottom` padding.

## Docs

- `SMARTLOG-SYSTEM.md` — product spec (roles, modules, ERD, sprint roadmap). Source of truth for domain behavior.
- `THEMES.md` — design system. **Partially stale**: it references a `client/` path and Ant Design v6, but the real code lives in `frontend/src/` and uses shadcn/ui. Use it for colors/fonts/layout recipes only.
- `backend/AGENTS.md` — Laravel Boost guidelines (auto-loaded when working in `backend/`); Boost MCP runs via `backend/opencode.json` (`php artisan boost:mcp`).

## Workflow

- Git: work on `dev`; `main` is the protected GitHub default (releases via PRs dev→main). Never commit, push, or PR without explicit instruction.
- After every task: write `audit/YYYYMMDD-HHMMSS-<task-slug>.md` and update `audit/README.md` (newest entry on top, keep table renumbered). audit/ is gitignored — don't commit it.
- Seeded demo logins: `<role>@smartlog.test` / `password` (admin, intern, instructor, coordinator, hte).
- The mobile experience is planned as a PWA of this same React codebase — Flutter is explicitly not used and nothing is scaffolded yet.