# Terraform State Manager — Frontend

React 19 + TypeScript + Vite + MUI single-page app for the Terraform State
Manager. It deliberately shares the look-and-feel, theme tokens, and shell
structure of the sibling
[`terraform-registry-frontend`](../terraform-registry-frontend) so the two apps
feel like one product. See
[`terraform-state-manager-OVERVIEW.md`](../terraform-state-manager-OVERVIEW.md)
for the full project plan.

> **Status: Phase 0 scaffold.** The app shell (themed AppBar + nav Drawer +
> routing), light/dark theme, an API client, and a Dashboard that reads the
> backend's health/version are in place. Domain pages (Sources, Drift, Version
> Lab, Reports, Transfer) are present as navigable placeholders and are built out
> in later phases.

## Layout

```
frontend/
├── index.html
├── vite.config.ts            # dev server + proxy to backend :8080
├── src/
│   ├── main.tsx              # entry
│   ├── App.tsx               # providers (React Query, theme) + router
│   ├── theme.ts              # MUI theme (brand tokens shared with registry)
│   ├── navigation.tsx        # single source of truth for sidebar + routes
│   ├── contexts/             # ThemeContext (light/dark)
│   ├── components/           # Layout (app shell), PlaceholderPage
│   ├── pages/                # DashboardPage (+ placeholders via navigation)
│   └── services/             # axios api client + React Query keys
├── Dockerfile                # build + nginx serve
└── nginx.conf                # SPA fallback + /api proxy
```

## Local development

```bash
cd frontend
npm install
npm run dev          # http://localhost:3000 (proxies /api + /health to :8080)
npm run build        # type-check + production build to dist/
npm test             # unit tests (vitest)
```

Run the backend separately (see the backend repo's `make run`) so the Dashboard
can reach `http://localhost:8080`. A full local stack (Postgres + backend +
frontend) lives in `deployments/` Docker Compose.
