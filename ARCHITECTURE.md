<!-- markdownlint-disable MD013 -->
# Architecture

This document describes the frontend architecture for the Terraform State Manager, covering component hierarchy, routing, data fetching, authentication, and state management. It mirrors the structure of the sibling [terraform-registry-frontend](https://github.com/sethbacon/terraform-registry-frontend) so the two apps stay legible side by side, but every detail below is grounded in this repository.

## Component Hierarchy

```text
App
 |
 +-- QueryClientProvider     (@tanstack/react-query)
 |    +-- AppThemeProvider   (contexts/ThemeContext.tsx)
 |    |    +-- MuiThemeProvider + CssBaseline
 |    |    +-- AnnouncerProvider   (contexts/AnnouncerContext.tsx — SR live regions)
 |    |         +-- AuthProvider   (contexts/AuthContext.tsx)
 |    |              +-- HelpProvider   (contexts/HelpContext.tsx)
 |    |                   +-- BrowserRouter
 |    |                        +-- RouteFocusManager   (focus + announce on nav)
 |    |                        +-- ErrorBoundary
 |    |                        |    +-- Routes
 |    |                        |         +-- Standalone pages (no Layout)
 |    |                        |         |    LoginPage
 |    |                        |         |    CallbackPage
 |    |                        |         |    SetupWizardPage
 |    |                        |         |
 |    |                        |         +-- ProtectedRoute -> Layout (sidebar + topbar + Outlet)
 |    |                        |              +-- DashboardPage           (/)
 |    |                        |              +-- ApiDocumentation (lazy)
 |    |                        |              +-- SourcesPage (lazy)
 |    |                        |              +-- DriftPage (lazy)
 |    |                        |              +-- VersionLabPage (lazy)
 |    |                        |              +-- SchedulesPage (lazy)
 |    |                        |              +-- ReportsPage (lazy)
 |    |                        |              +-- TransferPage (lazy)
 |    |                        |              +-- APIKeysPage (lazy)
 |    |                        |              +-- Admin pages (lazy, scope-gated in nav)
 |    |                        |                   AdminDashboardPage
 |    |                        |                   OrganizationsPage
 |    |                        |                   RolesPage
 |    |                        |                   UsersPage
 |    |                        |                   GroupMappingsPage   (/admin/oidc)
 |    |                        |                   MTLSPage
 |    |                        |                   SSOPage
 |    |                        |                   NotificationsPage
 |    |                        |                   AuditLogPage
```

A notable structural difference from the registry frontend: **the entire app shell is behind `ProtectedRoute`**. There are no public, unauthenticated content pages — only `/login`, `/auth/callback`, and `/setup` render outside the `Layout`. Everything inside the `Layout` requires a session.

The emotion `CacheProvider` (carrying the CSP nonce) wraps `<App />` in `main.tsx`, above this tree. React Query Devtools are **not** mounted.

## Routing Structure

Routes are defined in `App.tsx`, but the **route table is derived from `navigation.tsx`** — the single source of truth for both the sidebar and the router. `App.tsx` maps each nav item whose `path` has a backing page (via the `realPages` record) to a `<Route>`. The app uses React Router v6.

### Standalone routes (no Layout shell)

| Path             | Component         | Notes                            |
| ---------------- | ----------------- | -------------------------------- |
| `/login`         | `LoginPage`       | SSO/OIDC, Azure AD, SAML, LDAP, dev login |
| `/auth/callback` | `CallbackPage`    | OAuth redirect handler           |
| `/setup`         | `SetupWizardPage` | First-run setup wizard           |

### Authenticated routes (inside Layout, behind ProtectedRoute)

The whole `Layout` subtree is wrapped once in `<ProtectedRoute>`. Individual routes are not separately guarded; instead, **the sidebar and command palette filter items by scope** (`useAuth().hasScope`), so a user only navigates to what their scopes permit. Admin pages are reachable by URL but rely on the backend to enforce authorization (the backend returns 403/401 for an out-of-scope call).

| Path                   | Component             | Loading | Nav scope (navigation.tsx) |
| ---------------------- | --------------------- | ------- | -------------------------- |
| `/`                    | `DashboardPage`       | Eager   | `null` (always visible)    |
| `/api-docs`            | `ApiDocumentation`    | Lazy    | `null`                     |
| `/sources`             | `SourcesPage`         | Lazy    | `state:read`               |
| `/drift`               | `DriftPage`           | Lazy    | `state:read`               |
| `/version-lab`         | `VersionLabPage`      | Lazy    | `state:read`               |
| `/schedules`           | `SchedulesPage`       | Lazy    | `sources:manage`           |
| `/reports`             | `ReportsPage`         | Lazy    | `state:read`               |
| `/transfer`            | `TransferPage`        | Lazy    | `state:transfer`           |
| `/admin/apikeys`       | `APIKeysPage`         | Lazy    | `null` (self-service)      |
| `/admin`               | `AdminDashboardPage`  | Lazy    | `admin`                    |
| `/admin/organizations` | `OrganizationsPage`   | Lazy    | `admin`                    |
| `/admin/roles`         | `RolesPage`           | Lazy    | `admin`                    |
| `/admin/users`         | `UsersPage`           | Lazy    | `admin`                    |
| `/admin/oidc`          | `GroupMappingsPage`   | Lazy    | `admin`                    |
| `/admin/mtls`          | `MTLSPage`            | Lazy    | `admin`                    |
| `/admin/sso`           | `SSOPage`             | Lazy    | `admin`                    |
| `/admin/notifications` | `NotificationsPage`   | Lazy    | `admin`                    |
| `/admin/audit-logs`    | `AuditLogPage`        | Lazy    | `admin`                    |

`ProtectedRoute` checks `useAuth()`: while `isLoading`, it shows a centered spinner; if not authenticated, it redirects to `/login`; if a `requiredScope` prop is supplied and missing, it renders an "insufficient permissions" message. (In the current wiring `ProtectedRoute` guards the whole `Layout` without a `requiredScope`, so per-route scope enforcement lives in the nav filter and the backend.)

The catch-all route (`*`) inside the `Layout` renders a `PlaceholderPage` titled "Page not found".

### Navigation model (`navigation.tsx`)

The sidebar is organized as a flat **Home** item, a standalone **API docs** item, an admin **Dashboard** item, and three collapsible `NavGroup`s — `main`, `identity`, and `system`. Each `NavItem` carries a `scope` (`string | null`); `null` means "visible to any authenticated user". `Layout` drops groups whose items are all filtered out, and persists each group's open/closed state to `localStorage` under `tsm-nav-groups-open`.

## Data Fetching

### Overview

```text
  Component
     |
     v
  useQuery / useMutation  (React Query)
     |
     v
  queryKeys.ts  (cache key factory)
     |
     v
  api.ts  (shared Axios instance + `api` wrapper map)
     |
     v
  Backend API  (/api/v1/...)
```

### API client (`services/api.ts`)

Unlike the registry's class-based singleton, this app exports a **shared `axios` instance (`apiClient`)** plus a flat object `api` of thin async wrappers, one per endpoint. Key features:

- **Base URL**: empty string. The SPA is same-origin with the backend in every environment — Vite proxies `/api`, `/health`, `/ready`, and `/swagger` to the backend in dev (`vite.config.ts`), and nginx proxies the same paths in production (`nginx.conf`). There is **no `VITE_API_URL`** and **no mock-data mode**.
- **Cookie credentials**: the instance is created with `withCredentials: true`, so the HttpOnly auth cookie and the readable `tsm_csrf` cookie are sent on every request. **Sessions are cookie-only — the JWT is never read by JavaScript, so there is no bearer token to attach** for the interactive session.
- **Request interceptor (CSRF)**: on mutating requests (`POST`/`PUT`/`PATCH`/`DELETE`), it reads the non-HttpOnly `tsm_csrf` cookie via `readCookie()` and echoes it in an `X-CSRF-Token` header — the double-submit pattern. The backend requires the header to match the cookie for cookie-authenticated mutations.
- **Response interceptor (401)**: on a 401, it calls `clearAuthStorage()` to drop stale cached view state but **does not navigate** — route guards own the redirect. This deliberately avoids redirect loops on anonymous probes like the initial `/auth/me` call.
- **Blob downloads**: `downloadReport` and `exportAdminUserData` request `responseType: 'blob'`, parse the `Content-Disposition` filename, and trigger a client-side download.

The `readCookie(name)` helper is exported so the Swagger UI "Try it out" request interceptor (`ApiDocumentation.tsx`) can attach the same `tsm_csrf` token on mutations.

### Query keys (`services/queryKeys.ts`)

Query keys use a centralized factory so invalidation stays predictable. Domains currently covered: `system` (version, health), `dashboard`, `admin` (stats, users, organizations, orgMembers, roles, auditLogs, sso, oidcConfig, identityMappings, mtls, notifications), `sources` (list, states, analysis, resources, outputs, raw, backups, history, modules, modulesFreshness), `pipelines`, `ciSources`, `drift` (runs, records), `apiKeys`, `schedules`, and `health` (Version Lab runs).

Mutations invalidate the relevant `all`/parent key to refresh a domain, e.g.:

```ts
queryClient.invalidateQueries({ queryKey: queryKeys.sources.all })
```

### React Query configuration

The `QueryClient` is configured in `App.tsx`:

```ts
const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 30_000, retry: 1, refetchOnWindowFocus: false },
  },
})
```

## Authentication Flow

Authentication is **cookie-only with CSRF double-submit**. The session is a JWT held in an HttpOnly cookie that JavaScript cannot read; a separate readable `tsm_csrf` cookie is echoed back on mutations.

```mermaid
sequenceDiagram
    participant U as User/Browser
    participant FE as Frontend (React)
    participant BE as Backend API
    participant IdP as OIDC / SAML / Azure AD

    U->>FE: Click "Sign in with SSO"
    FE->>FE: AuthContext.login(provider)
    FE->>BE: window.location = /api/v1/auth/login?provider=...
    BE-->>U: 302 Redirect to IdP authorize URL
    U->>IdP: Authenticate (credentials / MFA)
    IdP-->>U: 302 Redirect to /auth/callback
    Note over FE,BE: Backend set an HttpOnly auth cookie (+ readable tsm_csrf cookie) on the callback
    U->>FE: /auth/callback (CallbackPage)
    FE->>BE: GET /api/v1/auth/me  (cookie sent via withCredentials)
    BE-->>FE: { user, memberships, allowed_scopes, session_expires_at }
    FE->>FE: Hold user + scopes in React state (NOT localStorage)

    Note over FE,BE: Subsequent API calls
    FE->>BE: Any request (cookie sent automatically;<br/>mutations echo tsm_csrf in X-CSRF-Token)
    BE-->>FE: Response (or 401 → clearAuthStorage; guard redirects to /login)

    Note over FE,BE: Logout
    U->>FE: Click "Sign out"
    FE->>FE: Clear local state + clearAuthStorage()
    FE->>BE: window.location = /api/v1/auth/logout
    BE-->>U: Clear HttpOnly cookie + end IdP session
```

### Login methods (`LoginPage.tsx`)

The login page calls `GET /api/v1/auth/providers` and renders one button per configured provider:

- **OIDC / Azure AD / SAML** — full-page redirect to `/api/v1/auth/login?provider=...` (SAML targets a specific IdP via `provider=saml:<id>`).
- **LDAP** — an inline username/password form that POSTs to `/api/v1/auth/ldap/login` (search-bind); the backend sets the same HttpOnly session cookie.
- **Dev login** — when the backend reports `dev_mode: true`, a "Dev Login" button POSTs to `/api/v1/dev/login` and is resolved via `/auth/me`. Used by the local Compose stack and E2E tests.

### Key details (`contexts/AuthContext.tsx`)

- **Provides**: `user`, `allowedScopes`, `isAuthenticated`, `isLoading`, `sessionExpiresSoon`, `login`, `devLogin`, `ldapLogin`, `logout`, `refreshSession`, `hasScope`.
- **Session detection**: on mount, `AuthContext` calls `api.getCurrentUser()` (`GET /api/v1/auth/me`); the HttpOnly cookie is sent automatically. The response carries `allowed_scopes` and an optional `session_expires_at`. **There is no optimistic restore from `localStorage`** — the cookie is the single source of truth, and the user object is held only in React state.
- **Scope checks**: `hasScope(scope)` mirrors the backend — the `admin` scope is a wildcard that satisfies every check.
- **Session expiry warning**: `AuthContext` arms a timer to fire `SESSION_WARNING_LEAD_MS` (2 minutes) before `session_expires_at`. When it fires, `sessionExpiresSoon` flips true and `SessionExpiryWarning` (mounted in `Layout`) shows a Snackbar offering **Refresh** (`POST /api/v1/auth/refresh`, which re-sets the cookie and returns a new `expires_in`) or **Sign out**. A failed refresh logs the user out cleanly rather than letting requests start 401-ing. Delays beyond ~24.8 days (`2^31-1` ms) are skipped to avoid `setTimeout` overflow.
- **Logout**: clears React state, calls `clearAuthStorage()` (drops the cached `tsm_user`/`tsm_scopes` keys), then redirects to `/api/v1/auth/logout`.

### Suite coupling (`hooks/useSuite.ts`)

`useSuite` polls `GET /api/v1/ui/config` (every 60 s, failures swallowed) to discover an optional sibling app (the registry). It surfaces the sibling's reachability and identity provenance (`issuer`, `sharedStore`) to the `SuiteSwitcher` in the topbar. When `sharedStore` is absent/false, the switcher warns that opening the sibling may require a separate sign-in. The endpoint is optional — when absent, the switcher stays inert.

## State Management

The application uses three state layers:

| Layer               | Tool             | Scope                               | Examples                                                                 |
| ------------------- | ---------------- | ----------------------------------- | ------------------------------------------------------------------------ |
| **Server state**    | React Query      | API data, cached across components  | Dashboard overview, source/state lists, drift records, admin lists       |
| **App-level state** | React Context    | Shared across the entire app        | Auth session (`AuthContext`), theme (`ThemeContext`), help panel (`HelpContext`), SR announcer (`AnnouncerContext`) |
| **UI state**        | React `useState` | Local to a single component or hook | Form inputs, dialog open/close, selected tab, drawer/group toggles        |

### Contexts

| Context             | File                            | Provides                                                                                                               |
| ------------------- | ------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| `AuthContext`       | `contexts/AuthContext.tsx`      | `user`, `allowedScopes`, `isAuthenticated`, `isLoading`, `sessionExpiresSoon`, `login`, `devLogin`, `ldapLogin`, `logout`, `refreshSession`, `hasScope` |
| `ThemeContext`      | `contexts/ThemeContext.tsx`     | `mode` (`'light'`/`'dark'`), `toggle()`. Persists to `localStorage` (`tsm-theme`); falls back to `prefers-color-scheme`. |
| `HelpContext`       | `contexts/HelpContext.tsx`      | `helpOpen`, `openHelp()`, `closeHelp()`, `toggleHelp()`. Persists to `localStorage` (`tsm-help-panel-open`).            |
| `AnnouncerContext`  | `contexts/AnnouncerContext.tsx` | `announce(message, priority?)`. Renders two visually-hidden `aria-live` regions (`polite` / `assertive`).              |
| `SetupWizardContext`| `contexts/SetupWizardContext.tsx` | First-run wizard step state, consumed by `SetupWizardPage` and the step components.                                 |

Each context exports a `use*` hook that throws if called outside its provider.

## Key Hooks

### `useRouteFocus` (`hooks/useRouteFocus.ts`)

Mounted via `RouteFocusManager`. On every SPA route change (after the first render), it moves focus to the page's first `<h1>` (falling back to `<main>`), applying a temporary `tabindex="-1"` so the element is programmatically focusable, and announces the new page title through `useAnnouncer()`. This drives keyboard/screen-reader continuity across client-side navigations.

### `useSuite` (`hooks/useSuite.ts`)

See [Suite coupling](#suite-coupling-hooksusesuitets) above.

## Error Handling

### ErrorBoundary (`components/ErrorBoundary.tsx`)

A class component wrapping the route tree. On a render error it shows an accessible fallback (`role="alert"`, `aria-live="assertive"`) with the error message and **Try Again** / **Reload Page** actions, and reports via `captureError()`.

### Error reporting (`services/errorReporting.ts`)

This app's error reporter is a **minimal console-only shim**: `captureError(error, context?)` logs to the console, and `init()` is a placeholder. It exists to centralize the call site so a real reporter (e.g. Sentry) can be wired in later without touching consumers. There is **no batching, breadcrumb capture, retry, session tracking, or DSN/remote endpoint** — and no telemetry is sent anywhere.

## Code Splitting

`App.tsx` eager-loads the shell, `LoginPage`, `CallbackPage`, `SetupWizardPage`, and `DashboardPage` (`/`). Every other domain page — Sources, Drift, Version Lab, Schedules, Reports, Transfer, API Keys, API docs, and all admin pages — is `React.lazy()`-loaded, with a single `<Suspense>` spinner around the `Layout`'s `<Outlet />`. The Vite build splits vendor bundles into `react-vendor`, `mui`, `mui-icons`, `query`, and `router` chunks (`vite.config.ts`).

## Serving, CSP, and the nonce

In production the SPA is served by nginx (`frontend/nginx.conf`) with a SPA fallback (`try_files ... /index.html`) and a proxy for `/api`, `/health`, `/ready`, and `/swagger.(json|yaml)`. nginx sets strict security headers including a **Content-Security-Policy with a per-request style nonce**. The nonce is derived once via an nginx `map` (so the header and body agree across the `try_files` internal redirect), and `sub_filter` swaps the `__CSP_NONCE__` placeholder in `index.html`. `main.tsx` reads `<meta name="csp-nonce">` and feeds the nonce to the emotion cache; `ApiDocumentation.tsx` applies the same nonce to its injected `<style>` so Swagger UI's theme survives the policy. In development the placeholder is left literal and treated as "no nonce".

## Shared Suite Package (`@4cloudguru/cloud-suite-ui`)

Cross-cutting concerns shared with the other Terraform Suite apps live in the
private package [`@4cloudguru/cloud-suite-ui`](https://github.com/sethbacon/terraform-suite-ui),
published to the GitHub Packages npm registry and pinned to an **exact**
version in `package.json` (see the "Shared private package" section of
`SECURITY.md` for the audit/provenance/update policy — the package carries the
auth/session provider and is treated as load-bearing security code).

The following local files are thin wrappers or re-exports around it:

| Local file                    | Wraps / re-exports from the package                                |
| ------------------------------ | ------------------------------------------------------------------- |
| `contexts/AuthContext.tsx`     | `AuthProvider` (as `SuiteAuthProvider`), `useAuth`, `SESSION_WARNING_LEAD_MS` |
| `contexts/ConsentContext.tsx`  | `ConsentProvider` (as `SuiteConsentProvider`), `useConsent`, `ConsentPreferences` type |
| `contexts/ThemeContext.tsx`    | `SuiteThemeProvider`, `useThemeMode`                                |
| `components/Layout.tsx`        | `SuiteLayout` (sidebar/topbar app shell)                            |
| `components/PageHeader.tsx`    | `PageHeader` + `PageHeaderProps`                                    |
| `components/DashboardCard.tsx` | `DashboardCard` + `DashboardCardProps`                              |
| `components/ConsentBanner.tsx` | `ConsentBanner`                                                     |
| `components/SuiteSwitcher.tsx` | `SuiteSwitcher` (as `SuiteSwitcherBase`, cross-app switcher)        |
| `theme.ts`                     | `createAppTheme`, `BRAND_PRIMARY`, `ThemeMode`/`ThemeOverrides` types |

## Shared Components

| Component               | Purpose                                                                                       |
| ----------------------- | --------------------------------------------------------------------------------------------- |
| `Layout`                | App shell: fixed AppBar, collapsible scope-filtered drawer, settings/support/account menus, skip link, and a width-capped `<main>` with `<Outlet />` |
| `ProtectedRoute`        | Auth guard (loading spinner, unauthenticated redirect, optional scope message)                |
| `ErrorBoundary`         | Catches render errors with an accessible fallback                                             |
| `CommandPalette`        | `⌘K`/`Ctrl+K` keyboard-first navigator (cmdk), filtered to the user's scopes                  |
| `HelpPanel`             | Slide-out per-route contextual help panel                                                     |
| `SuiteSwitcher`         | Topbar switcher to the sibling registry app, driven by `useSuite`                             |
| `SessionExpiryWarning`  | Snackbar offering refresh/sign-out before the session lapses                                  |
| `AboutModal`            | About dialog showing frontend + backend (`/api/v1/version`) build info                        |
| `AdminBreadcrumbs`      | Breadcrumb trail for admin pages                                                              |
| `DashboardCard`, `EmptyState`, `PageHeader`, `ConfirmDialog` | Reusable presentational/dialog primitives                                  |
| `DriftRecordsSection`, `DriftRepoWizard`, `StateHistoryTab`, `TargetBackendHint` | Feature-specific building blocks                          |
| `skeletons/*`           | `CardGridSkeleton`, `TableSkeleton` loading placeholders                                       |
