# Work Brief — State Manager frontend: identity surface 1:1 with the registry

> **Audience:** a competent frontend agent picking this up cold. You own the **frontend track (F)**
> of the identity-1:1 program. A **separate backend agent owns the backend track (B)** in a
> different repo — you will **not** touch the backend, and they will not touch the frontend, so you
> cannot step on each other.
>
> **Your repo:** `terraform-state-manager-frontend` — work only in `frontend/src` (the React app)
> and its tests. **Source of truth:** `terraform-registry-frontend` (read-only reference).
> **Workflow:** this repo's contributing workflow (branch from `main`, Conventional Commits, PR;
> the frontend gate is typecheck + build + lint + vitest). Read `frontend/package.json` scripts.

## The goal (original revitalization prompt, #1)

The State Manager's **identity surface** must be **100% identical** to the Terraform Registry
frontend — style, components, iconography, CSS, layout, **i18n translations**, **authentication**,
and **administrative controls** — built on the shared canonical identity model. The registry
frontend is the source of truth; you are porting its identity surface into the State Manager.

Read `terraform-state-manager-backend/IDENTITY-1TO1-PLAN.md` for the full program context (it lives
in the backend repo; read it once for the shared picture).

## The contract (how you avoid being blocked by the backend)

The identity **API contract is the registry's existing identity API** — the backend agent is making
the State Manager backend serve it **identically**. So you port the registry frontend's identity
calls **as-is**; do not invent or adapt endpoints. Key identity endpoints (from the registry's
`frontend/src/services/api.ts`):
`/api/v1/auth/me` (returns `memberships[]` + `scopes`, no single-org, no `is_active`),
`/api/v1/apikeys` (+ `/:id`, `/:id/rotate`), `/api/v1/admin/role-templates`,
`/api/v1/admin/oidc/config` + `/api/v1/admin/oidc/group-mapping`, `/api/v1/admin/audit-logs`,
`/api/v1/admin/users/:id/export` + `/erase`, plus users/organizations CRUD. The canonical identity
model has **no `is_active`**, **multi-org `memberships[]`**, JSONB scopes, and uuid role ids — the
registry frontend already reflects this.

Integration UAT (frontend ↔ State Manager backend) happens once both tracks land; until then,
develop against the registry contract + types (and the registry backend if you need a live shape).

## Scope — what to port vs preserve vs drop

**PORT 1:1 from the registry frontend** (`terraform-registry-frontend/frontend/src` → this repo's
`frontend/src`), adapting only branding + routing:
- **Shared infra**: `i18n.ts` + `locales/` (all locales — port the identity/common keys),
  `config.ts`, `hooks/`, and bring `contexts/ThemeContext.tsx` + theme to parity. (This repo is
  currently **missing** i18n/locales/hooks/config entirely.)
- **Auth**: `contexts/AuthContext.tsx`, `pages/LoginPage.tsx`, `pages/CallbackPage.tsx`,
  `components/ProtectedRoute.tsx`, session-expiry handling — memberships-based `/me`.
- **Identity admin pages** (the six): `pages/admin/{UsersPage, OrganizationsPage, APIKeysPage,
  RolesPage, OIDCSettingsPage, AuditLogPage}.tsx` — including the GDPR export/erase controls on
  Users. `AuditLogPage` does **not** exist in this repo yet — add it.
- **Shared components** the above depend on: `AdminBreadcrumbs`, `ConfirmDialog`, `EmptyState`,
  `components/skeletons/`, the admin nav in `Layout.tsx`, `QuickApiKeyDialog`, etc.
- **`services/api.ts`** identity methods + `services/queryKeys.ts` + identity TS types.

**PRESERVE (do not delete or registry-fy)** — the State Manager's own feature surface:
`pages/{DashboardPage, AnalysisPage, AnalysisDetailPage, SourcesPage (admin), WorkspacesPage,
Snapshots, BackupsPage, MigrationsPage, CompliancePage, ReportsPage, AlertsPage}` and their
components. Integrate them into the registry-styled `Layout`/nav alongside the identity admin nav —
they keep their existing State Manager API calls.

**DROP / do not port** — registry-domain pages with no State Manager analogue:
modules, providers, mirrors, SCM providers, terraform-binaries, security-scanning, and (deferred)
`MTLSPage` / `SCIMProvisioningPage`. Their nav entries must not appear.

**Branding adaptation**: "Terraform Registry" → "Terraform State Manager" everywhere (titles,
`<title>`, logo/wordmark, about modal, footer); keep the registry's visual design/theme/iconography
exactly. Auth token storage key stays `tsm_auth_token` (already used by this repo).

## Phases (each a reviewable PR; F0–F2 unblock the rest)

- **F0 Infra**: port `i18n.ts` + `locales/` + `config.ts` + `hooks/` + ThemeContext parity. Wire
  i18n into `main.tsx`/`App.tsx`. Verify the app still builds + boots.
- **F1 API + types**: port the registry identity methods into `services/api.ts` (correct endpoints,
  canonical shapes) + `queryKeys.ts` + identity types. Remove this repo's wrong calls (e.g.
  `/admin/api-keys` → `/apikeys`).
- **F2 Auth**: `AuthContext` + `LoginPage` + `CallbackPage` + `ProtectedRoute` 1:1 (memberships `/me`).
- **F3 Identity pages 1:1**: the six admin pages (+ AuditLog new) + GDPR controls; registry styling.
- **F4 Components + chrome**: `AdminBreadcrumbs`, `ConfirmDialog`, `EmptyState`, `skeletons/`,
  `Layout` nav (identity admin + preserved State Manager feature nav), command palette if present.
- **F5 Gate + UAT**: `npm run build` (tsc) + `npm run lint` (max-warnings 0) + `npm test` (vitest)
  all green; then browser UAT against the running State Manager stack (frontend :3001) once the
  backend track lands — log in, exercise Users/Orgs/API Keys/Roles/OIDC/Audit, confirm it looks
  identical to the registry.

## Rules / non-overlap

- **Work only in `terraform-state-manager-frontend`** (mainly `frontend/src`). Do **not** edit the
  backend repo or `terraform-state-manager-frontend/deployments/*` (the backend agent + UAT stack own
  those). If you believe a backend endpoint is wrong, **flag it in your PR description** — do not
  change the backend.
- The registry frontend is **read-only reference** — never modify it.
- Keep PRs per-phase and reviewable. Match the registry's component patterns exactly (MUI v9,
  FontAwesome + simple-icons, react-query, react-i18next, react-router v6).
- Don't introduce new dependencies that the registry frontend doesn't use.

## Done criteria
- [ ] i18n + locales + config + hooks present and wired; app builds + boots.
- [ ] `services/api.ts` identity methods match the registry contract (correct endpoints + canonical
      shapes); no stale `/admin/api-keys`, no `is_active`, `/me` consumes `memberships[]`.
- [ ] All six identity admin pages + auth pages are visually + behaviorally 1:1 with the registry
      (AuditLog added); GDPR export/erase present on Users.
- [ ] State Manager feature pages preserved + integrated into the registry-styled layout/nav;
      registry-domain pages absent.
- [ ] Frontend gate green (build + lint + vitest); browser UAT confirms registry-identical identity UX.

## If you get stuck
- Reference layout: `terraform-registry-frontend/frontend/src/{App.tsx, main.tsx, i18n.ts,
  config.ts, contexts, hooks, locales, services/api.ts, components, pages/admin}`.
- This repo's current state: `frontend/src/{App.tsx, contexts, services/api.ts, pages, pages/admin}`
  (first-draft identity pages to replace; feature pages to preserve).
- Backend API questions → note them for the backend agent; do not block on them (port against the
  registry contract).
