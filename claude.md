# CLAUDE.md — Terraform State Manager Frontend

## Development Workflow

All changes follow this workflow. Do not deviate from it.

### Branches

- `main` — production-ready, tagged releases only. **Must always exist — never delete.**
- `development` — integration branch; all feature/fix branches merge here first. **Must always exist — never delete.**
- Feature/fix branches are created from `development`, never from `main`. Delete them from remote after their PR is merged; clean up locally with `git branch -d`.

```bash
# After a feature/fix PR is merged:
git push origin --delete fix/short-description   # remove remote branch
git branch -d fix/short-description              # remove local branch
git remote prune origin                          # prune stale remote-tracking refs
```

### Step-by-step

1. **Open a GitHub issue** describing the bug or feature before writing any code.

2. **Create a branch from `development`**:

   ```bash
   git fetch origin
   git checkout -b fix/short-description origin/development
   # or: feature/short-description
   ```

3. **Implement the change.**

4. **Before committing — run the full local quality gate**:

   ```bash
   cd frontend

   # Lint (zero warnings enforced)
   npm run lint

   # Unit tests
   npm run test

   # Build (type-checks via tsc -b before bundling)
   npm run build
   ```

   Do not push until all of the above pass locally.

5. **Commit — no co-author attribution**:

   ```bash
   git add <specific files>
   git commit -m "fix: short description of what was fixed

   Closes #<issue-number>"
   ```

6. **Rebase onto `development` before pushing** to minimise merge conflicts with sibling branches:

   ```bash
   git fetch origin
   git rebase origin/development
   ```

7. **Push to origin**:

   ```bash
   git push -u origin fix/short-description
   ```

8. **Open a PR from the feature branch → `development`**:

   Include a `## Changelog` section in the PR body with the entry that should appear in `CHANGELOG.md` for this change (format: `- type: description`). **Do not edit `CHANGELOG.md` in the branch** — changelog entries are collected from merged PR bodies at release time.

   ```bash
   gh pr create --base development --title "fix: short description" --body "$(cat <<'EOF'
   Closes #<issue>

   ## Changelog
   - fix: short description of what was fixed
   EOF
   )"
   ```

   - Squash-merge into `development` when approved.

9. **Open a PR from `development` → `main`** when the integration branch is ready to ship:

   ```bash
   gh pr create --base main --title "chore: release vX.Y.Z" --body "..."
   ```

### Parallel agents — coordination rules

When multiple agents run concurrently, follow these rules to avoid conflicts:

- **Never assign two agents to work on the same files at the same time.** If their scopes overlap (e.g. both touch `App.tsx`, `services/api.ts`, or `types/index.ts`), serialise them.
- **Do not edit `CHANGELOG.md` in any branch.** Changelog entries live in PR bodies only (see step 8 above).
- **Each agent rebases on `origin/development` immediately before pushing** (step 6 above). After any sibling PR is merged, remaining open branches must rebase again before their own merge.

### Releasing a version

When a release is called for:

1. Collect the `## Changelog` sections from all PR bodies merged since the last release.

2. Update `CHANGELOG.md` on `development` — promote `[Unreleased]` to the new version with today's date and paste the collected entries.

3. Commit directly on `development` and push (**no tag yet**):

   ```bash
   git commit -m "chore: release vX.Y.Z"
   git push origin development
   ```

4. Merge `development` → `main` via PR (step 9 above).

5. **After the PR is merged**, tag the commit that landed on `main` and push the tag:

   ```bash
   git fetch origin
   git tag vX.Y.Z origin/main
   git push origin vX.Y.Z
   ```

   > **Why tag after the merge?** The release PR produces a new merge commit SHA on `main`.
   > Tagging on `development` before the merge leaves the tag pointing at the wrong commit —
   > it will never appear in `main`'s history as a tagged release.

---

## Project Overview

React 18 TypeScript SPA (single-page application) for the Terraform State Manager.

Backend API lives in a separate repository: [terraform-state-manager-backend](https://github.com/sethbacon/terraform-state-manager-backend)

---

## Repository Structure

```txt
terraform-state-manager-frontend/
├── Makefile                          # Local dev and deployment shortcuts
├── frontend/                         # React 18 TypeScript SPA (Vite + MUI)
│   ├── src/
│   │   ├── App.tsx                   # Root component: router, providers, lazy-loaded pages
│   │   ├── main.tsx                  # Application entry point
│   │   ├── pages/                    # Top-level page components
│   │   │   ├── LoginPage.tsx         # OIDC login prompt
│   │   │   ├── CallbackPage.tsx      # OIDC callback handler; stores token and redirects
│   │   │   ├── SetupWizardPage.tsx   # First-run setup wizard (OIDC + storage + admin)
│   │   │   ├── DashboardPage.tsx     # Main landing page with charts and overview stats
│   │   │   ├── AnalysisPage.tsx      # Analysis run list and trigger
│   │   │   ├── AnalysisDetailPage.tsx# Per-run workspace results
│   │   │   ├── WorkspacesPage.tsx    # Workspace browser across all sources
│   │   │   ├── WorkspaceDetailPage.tsx# Per-workspace snapshot/drift history
│   │   │   ├── BackupsPage.tsx       # Backup list, creation, restore, retention policies
│   │   │   ├── MigrationsPage.tsx    # State migration jobs and dry-run
│   │   │   ├── ReportsPage.tsx       # Report generation and download
│   │   │   ├── AlertsPage.tsx        # Alerts list and alert rules
│   │   │   ├── CompliancePage.tsx    # Compliance policies and results
│   │   │   ├── ApiDocumentation.tsx  # Swagger UI embedded page
│   │   │   └── admin/
│   │   │       ├── DashboardPage.tsx # Admin stats (users, orgs, API keys)
│   │   │       ├── UsersPage.tsx     # User management
│   │   │       ├── OrganizationsPage.tsx # Organization and member management
│   │   │       ├── APIKeysPage.tsx   # API key management
│   │   │       ├── RolesPage.tsx     # Role template management
│   │   │       ├── OIDCSettingsPage.tsx # Runtime OIDC configuration
│   │   │       ├── SourcesPage.tsx   # State source management
│   │   │       └── SchedulerPage.tsx # Scheduled task management
│   │   ├── components/               # Reusable UI components
│   │   │   ├── Layout.tsx            # Shell: sidebar nav, header, theme toggle
│   │   │   ├── ProtectedRoute.tsx    # Auth + scope guard for route protection
│   │   │   ├── ErrorBoundary.tsx     # React error boundary
│   │   │   ├── LoadingOverlay.tsx    # Full-screen loading spinner
│   │   │   ├── StatusChip.tsx        # Colour-coded status badge
│   │   │   ├── HelpPanel.tsx         # Contextual help drawer
│   │   │   ├── DevUserSwitcher.tsx   # DEV_MODE user impersonation switcher
│   │   │   ├── DashboardCard.tsx     # Metric summary card
│   │   │   ├── AlertsList.tsx        # Alert list with acknowledge action
│   │   │   ├── AlertRuleForm.tsx     # Alert rule create/edit form
│   │   │   ├── AnalysisRunDialog.tsx # Trigger analysis dialog
│   │   │   ├── NotificationChannelForm.tsx # Channel create/edit form
│   │   │   ├── ReportGenerateDialog.tsx    # Report generation dialog
│   │   │   ├── ScheduleForm.tsx      # Cron schedule form with human-readable preview
│   │   │   ├── SnapshotCompareView.tsx # Side-by-side snapshot diff
│   │   │   ├── SourceConfigForm.tsx  # State source backend config form
│   │   │   ├── cards/
│   │   │   │   ├── AnalysisRunCard.tsx    # Run summary card
│   │   │   │   ├── SourceCard.tsx         # State source overview card
│   │   │   │   └── WorkspaceResultCard.tsx# Per-workspace result card
│   │   │   └── charts/
│   │   │       ├── ProviderDistributionChart.tsx # Recharts pie: provider breakdown
│   │   │       ├── ResourceOverviewChart.tsx     # Recharts bar: resource counts
│   │   │       ├── RUMTrendChart.tsx              # Recharts line: RUM over time
│   │   │       ├── TerraformVersionsChart.tsx     # Recharts bar: version distribution
│   │   │       └── TopResourceTypesChart.tsx      # Recharts bar: top resource types
│   │   ├── contexts/
│   │   │   ├── AuthContext.tsx        # Auth state, token storage, scope helpers
│   │   │   ├── ThemeContext.tsx       # MUI light/dark theme toggle
│   │   │   └── HelpContext.tsx        # Help panel open/close state
│   │   ├── services/
│   │   │   └── api.ts                 # Axios-based ApiClient; every backend call goes here
│   │   └── types/
│   │       ├── index.ts               # Core types: User, Organization, APIKey, OIDCConfig, etc.
│   │       ├── alerts.ts              # Alert and AlertRule types
│   │       ├── analysis.ts            # AnalysisRun and AnalysisResult types
│   │       └── dashboard.ts           # Dashboard overview and chart types
│   ├── Dockerfile                     # Multi-stage: node build → nginx serve
│   ├── nginx.conf                     # Nginx config; proxies /api/ to backend
│   ├── vite.config.ts                 # Vite config: proxy, aliases, manual chunks, Vitest
│   ├── eslint.config.js               # ESLint 9 flat config
│   ├── tsconfig.json / tsconfig.app.json / tsconfig.node.json
│   └── package.json
├── e2e/                               # Playwright end-to-end tests
│   ├── tests/
│   │   ├── auth.spec.ts               # Login/logout/callback flow
│   │   ├── setup.spec.ts              # Setup wizard flow
│   │   ├── dashboard.spec.ts          # Dashboard page
│   │   ├── analysis.spec.ts           # Analysis runs
│   │   ├── backups.spec.ts            # Backup operations
│   │   └── admin.spec.ts              # Admin pages
│   ├── fixtures/auth.ts               # Shared auth helpers
│   ├── playwright.config.ts           # Playwright config (Chromium, baseURL via BASE_URL)
│   └── package.json
└── deployments/
    ├── docker-compose.yml             # Base dev stack: PostgreSQL + backend + frontend
    ├── docker-compose.prod.yml        # Production overrides: published images, resource limits
    ├── docker-compose.oidc.yml        # OIDC overlay: adds Keycloak + db-seed for local OIDC testing
    ├── .env.production.example        # Production env var template
    └── keycloak/
        ├── realm-export.json          # Keycloak realm with test users and OIDC client
        └── seed-oidc-dev.sql          # Seeds DB: marks setup complete, provisions admin user
```

---

## Tech Stack

| Concern      | Technology                                  |
| ------------ | ------------------------------------------- |
| Language     | TypeScript 5.7.2 (strict mode)              |
| Framework    | React 18.3.1                                |
| Build Tool   | Vite 6.2.0                                  |
| UI           | Material-UI v6 + Emotion                    |
| Charts       | Recharts 2.15.3                             |
| HTTP         | Axios 1.8.4                                 |
| Router       | React Router v6                             |
| Cron display | cronstrue 3.13.0 (human-readable cron text) |
| Date utility | date-fns 4.1.0                              |
| API docs     | swagger-ui-react 5.18.2                     |
| Unit tests   | Vitest 4 + Testing Library + jsdom          |
| E2E tests    | Playwright 1.42                             |
| Linting      | ESLint 9 flat config + TypeScript ESLint    |

---

## Common Commands

### Frontend

```bash
cd frontend

# Install dependencies
npm install

# Start development server (http://localhost:3000, proxies /api/* to backend:8080)
npm run dev

# Build for production (runs tsc -b then Vite build)
npm run build

# Lint (must produce zero warnings before pushing)
npm run lint

# Run unit tests once
npm run test

# Run unit tests in watch mode
npm run test:watch

# Unit test coverage report
npm run test:coverage

# Preview production build locally
npm run preview
```

### E2E Tests

```bash
cd e2e

# Install dependencies and Playwright browsers
npm install
npx playwright install chromium

# Run all tests (requires a running stack; set BASE_URL if not using default)
npx playwright test

# Run with visible browser
npx playwright test --headed

# Run with Playwright UI
npx playwright test --ui

# Open the last HTML report
npm run report
```

Default `BASE_URL` for Playwright is `http://localhost:5173`. Override with `BASE_URL=http://localhost:3000` when testing against the Docker stack.

### Docker Compose stacks

| Make target      | Compose files                                    | Purpose                                       |
| ---------------- | ------------------------------------------------ | --------------------------------------------- |
| `make dev-up`    | `docker-compose.yml`                             | Local dev: build from source, `DEV_MODE=true` |
| `make dev-down`  | `docker-compose.yml`                             | Stop dev stack                                |
| `make oidc-up`   | `docker-compose.yml` + `docker-compose.oidc.yml` | Add Keycloak for OIDC end-to-end testing      |
| `make oidc-down` | same                                             | Stop OIDC stack                               |
| `make prod-up`   | `docker-compose.yml` + `docker-compose.prod.yml` | Production: pull published images             |
| `make prod-down` | same                                             | Stop production stack                         |

```bash
# Dev stack — builds both backend and frontend locally
make dev-up
# Frontend: http://localhost:3000  |  Backend API: http://localhost:8080

# OIDC stack — adds Keycloak on port 8180; requires hosts file entry:
#   127.0.0.1  keycloak
make oidc-up
# Keycloak admin: http://keycloak:8180/admin  (admin / admin)
# Test users (password: TestPass123!): admin.user, alice.analyst, bob.operator, carol.viewer

# Production — uses ghcr.io images; copy and fill .env.production first
cp deployments/.env.production.example deployments/.env.production
make prod-up
```

---

## Frontend Conventions

- **All API calls** go through `services/api.ts` (the `ApiClient` class). Never call `axios` or `fetch` directly from components or hooks.
- **Token storage** uses `localStorage` under the key `tsm_auth_token`. Token injection and 401 redirects are handled by Axios interceptors in `ApiClient` — do not add auth logic elsewhere.
- **Global state** uses React Context only (`AuthContext`, `ThemeContext`, `HelpContext`). Redux is not used.
- **Protected routes** use `components/ProtectedRoute.tsx` with an optional `requiredScope` or `requiredScopes` prop. Unauthenticated users are redirected to `/login`; authenticated users without the required scope are redirected to `/`.
- **Scope enforcement** in `AuthContext.hasScope` mirrors the backend: `admin` implies all scopes; `:write` implies the corresponding `:read`.
- **TypeScript strict mode** is enforced — `noUnusedLocals`, `noUnusedParameters`, and `noFallthroughCasesInSwitch` are errors. Avoid `any`; if unavoidable, add a comment explaining why.
- **Path alias** `@/` resolves to `./src/` — use it for all imports into `src/` from within `src/`.
- **Lazy loading** — every page-level component in `App.tsx` is wrapped with `React.lazy()` and served through the top-level `<Suspense>` boundary. New pages must follow the same pattern.
- **New pages** must be added to the router in `App.tsx`, wrapped in `ProtectedRoute` with the appropriate `requiredScope`, and exported as a lazy import.
- **New API methods** must be added to the `ApiClient` class in `services/api.ts`. Follow the existing one-liner pattern: call the appropriate HTTP verb method and resolve `.then(r => r.data)`.
- **Cron expressions** — use `cronstrue` for human-readable display wherever a schedule string is rendered. `ScheduleForm.tsx` demonstrates the pattern.
- **MUI `TextField` inputs** for non-obvious fields must include a `helperText` prop explaining the expected value.

### Vite manual chunks

The production build splits output into three named chunks to optimise long-term caching:

| Chunk    | Contents                                 |
| -------- | ---------------------------------------- |
| `vendor` | `react`, `react-dom`, `react-router-dom` |
| `mui`    | `@mui/material`, `@mui/icons-material`   |
| `charts` | `recharts`                               |

When adding large new dependencies, consider whether they warrant their own chunk.

---

## Authentication Flow

1. User visits any protected route → `ProtectedRoute` redirects to `/login`.
2. `LoginPage` calls `AuthContext.login()` → redirects to `/api/v1/auth/login` (backend OIDC redirect).
3. Backend performs OIDC flow with the configured provider and redirects to `/callback?token=<jwt>`.
4. `CallbackPage` extracts the token from the query string, calls `AuthContext.setToken(token)` (persisted to `localStorage`), then calls `api.getCurrentUser()` to populate user and scopes.
5. Subsequent requests attach `Authorization: Bearer <token>` via the Axios request interceptor.
6. On 401 response, the Axios response interceptor clears the token and redirects to `/login`.
7. `AuthContext.refreshToken()` can extend the session by calling `POST /api/v1/auth/refresh`.

### DEV_MODE

When the backend is started with `DEV_MODE=true`, a `DevUserSwitcher` component (`components/DevUserSwitcher.tsx`) is rendered in the UI. It calls `/api/v1/dev/users` to list available users and `/api/v1/dev/impersonate/:id` to switch the active session — useful for testing different roles without a real OIDC provider.

---

## Setup Wizard (First-Run)

- **Route:** `/setup` — public, no auth layout.
- **Page:** `pages/SetupWizardPage.tsx` — multi-step wizard covering OIDC configuration, storage configuration, and initial admin account.
- **Flow:** On mount, the wizard calls `api.getSetupStatus()`. If `completed: true`, it redirects to `/`.
- **Setup Token:** Sensitive setup API calls require a setup token obtained from the backend logs (or `SETUP_TOKEN_FILE`). The `ApiClient` uses standard `Bearer` auth for setup endpoints — the setup token is passed as the bearer value for these calls.
- **Steps:**
  1. Validate setup token
  2. Configure OIDC provider (with `testOIDCConfig` live-test)
  3. Configure storage backend (with `testStorageConfig` live-test)
  4. Configure initial admin account
  5. Complete setup (`api.completeSetup()`)
- After `completeSetup()`, setup endpoints return 403 permanently.

---

## Development Notes

- No GitHub Actions CI pipeline exists yet. Run the quality gate (lint, test, build) manually before pushing.
- The `deployments/docker-compose.oidc.yml` overlay provides a pre-configured Keycloak instance for testing the full OIDC login flow locally. See the file header for required hosts file entry and test user credentials.
- `deployments/keycloak/realm-export.json` defines the Keycloak realm; edit this file to change the OIDC client config or test users.
- `deployments/keycloak/seed-oidc-dev.sql` is idempotent — it marks setup as complete and provisions the admin user on every stack start.
- For backend configuration, API documentation, and architecture details, see [terraform-state-manager-backend](https://github.com/sethbacon/terraform-state-manager-backend).
- `CHANGELOG.md` tracks version history; do not edit it in feature branches.
