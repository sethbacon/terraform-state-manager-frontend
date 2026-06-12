# Terraform State Manager — Frontend

React TypeScript SPA for the [Terraform State Manager](https://github.com/sethbacon/terraform-state-manager-backend) — state analysis, manipulation, drift detection at scale, and Version Lab.

[![React](https://img.shields.io/badge/React-19+-61DAFB?logo=react)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-3178C6?logo=typescript)](https://www.typescriptlang.org/)
[![Coverage](https://img.shields.io/endpoint?url=https://gist.githubusercontent.com/sethbacon/04a5fcc9b19b7b263059a3c62f5481bc/raw/frontend-coverage.json)](https://github.com/sethbacon/terraform-state-manager-frontend/actions/workflows/ci.yml)

This repository contains the frontend UI, the Playwright E2E smoke pack, and the local development Docker Compose stack. The backend API, database, and production deployment infrastructure live in **[terraform-state-manager-backend](https://github.com/sethbacon/terraform-state-manager-backend)**. The app deliberately shares the look-and-feel, theme tokens, and shell structure of the sibling [terraform-registry-frontend](https://github.com/sethbacon/terraform-registry-frontend) so the two products feel like one suite.

## Features

- **Home dashboard** — cross-source charts (recharts): RUM, providers, resource types, Terraform versions
- **Sources** — manage all ten state-backend connector types; browse states with per-state analysis and history
- **Drift** — drift records with acknowledge/resolve workflow and CI pipeline wiring (GitHub Actions / Azure DevOps pickers)
- **Version Lab** — validate repositories against newer module/provider/Terraform versions
- **Schedules, Reports, Transfer** — recurring runs, report generation, and scope-gated state transfers
- **Administration** — admin dashboard plus grouped Identity (organizations, roles, users, OIDC groups, mTLS, SSO, API keys) and System (notifications, audit logs) sections; API keys are self-service for every authenticated user
- **App shell** — collapsible scope-filtered navigation, command palette (⌘K), per-route help panel, light/dark theme, About modal
- **i18n** — i18next with 10 locales (`en` is the source of truth; the rest are machine-filled via the DeepL workflow)
- **Accessibility** — route-change focus management, live-region announcements, labelled controls
- **Security posture** — cookie-only sessions (no tokens in localStorage), `X-CSRF-Token` on mutations, CSP-nonce emotion cache

## Prerequisites

- Node.js 24+
- A running backend — see [terraform-state-manager-backend](https://github.com/sethbacon/terraform-state-manager-backend), or use the Compose stack below

## Quick Start

### Development (against a local backend)

```bash
cd frontend
npm install
npm run dev          # http://localhost:3000 (Vite proxies /api, /health, /swagger to :8080)
npm run build        # type-check + production build to dist/
npm test             # unit tests (vitest)
```

### Full Docker Compose stack

A complete dev stack — PostgreSQL, backend, frontend, and a pre-configured Keycloak IdP with seed state files — lives in [`deployments/`](deployments/):

```bash
cd deployments
docker compose up -d
# Frontend:  http://localhost:3001
# Backend:   http://localhost:8081
# Keycloak:  http://localhost:8180  (requires `127.0.0.1 keycloak` in /etc/hosts)
```

Keycloak boots slowly on first run; if `docker compose up` exits non-zero, wait for the backend health check to pass and re-run it. See [`deployments/README.md`](deployments/README.md) for test users and seeding details.

## Tech Stack

| Component | Technology |
|-----------|------------|
| Framework | React 19, TypeScript 5.9, Vite 6 |
| UI        | MUI 7, recharts |
| Data      | TanStack React Query, axios |
| i18n      | i18next (10 locales, DeepL pipeline) |
| Testing   | vitest + Testing Library (happy-dom), Playwright |
| Serving   | nginx (SPA fallback; proxies `/api`, `/scim`, `/health`, `/ready`, `/swagger` to the backend) |

## Repository Layout

```
frontend/
├── src/
│   ├── App.tsx               # providers + lazy route table
│   ├── navigation.tsx        # single source of truth for sidebar + routes
│   ├── theme.ts              # MUI theme (brand tokens shared with the registry)
│   ├── components/           # app shell, help panel, command palette, dialogs
│   ├── pages/                # feature pages (+ pages/admin/ for the admin area)
│   ├── services/             # axios api client + React Query keys
│   └── locales/              # en source + 9 translated locales
├── Dockerfile                # build + nginx serve
└── nginx.conf                # SPA fallback + backend proxy
e2e/                          # Playwright smoke pack (own package.json)
deployments/                  # local dev Docker Compose (postgres/backend/frontend/keycloak)
```

## Testing

- **Unit tests** (vitest): `npm test` — CI enforces ratchet coverage gates via `vitest.config.ts` thresholds; floors only move up
- **E2E smoke pack** (Playwright, [`e2e/`](e2e/)): 13 self-cleaning tests run against the live Compose stack before UAT — deliberately not PR-gated

```bash
cd e2e
npm install && npx playwright install chromium
npx playwright test    # expects the Compose stack on http://localhost:3001 with DEV_MODE
```

## CI Pipeline

Lint, typecheck, unit tests (coverage-gated), and build run on every PR; pushes to `main` additionally publish the coverage badge. Conventional Commits + release-please drive versioning; tagged releases build and publish the Docker image.

## History

This codebase is the second-generation implementation. The original draft is preserved on the [`archive/ogtsm`](https://github.com/sethbacon/terraform-state-manager-frontend/tree/archive/ogtsm) branch; releases up to v0.4.0 were cut from that lineage.
