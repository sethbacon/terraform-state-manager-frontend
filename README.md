# Terraform State Manager — Frontend

React TypeScript SPA for the [Terraform State Manager](https://github.com/sethbacon/terraform-state-manager-backend) — state analysis, manipulation, drift detection at scale, and Version Lab.

[![License: Apache 2.0](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](LICENSE)
[![React](https://img.shields.io/badge/React-19+-61DAFB?logo=react)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-6-3178C6?logo=typescript)](https://www.typescriptlang.org/)
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
npm run dev          # http://localhost:3000 (Vite proxies /api, /health, /ready, /swagger to :8080)
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
| Framework | React 19, TypeScript 6, Vite 8 |
| UI        | MUI 9, recharts |
| Data      | TanStack React Query, axios |
| i18n      | i18next (10 locales, DeepL pipeline) |
| Testing   | vitest + Testing Library (happy-dom), Playwright |
| Serving   | nginx (SPA fallback; proxies `/api`, `/health`, `/ready`, `/swagger` to the backend) |

## Configuration

The frontend reads two build-time environment variables (both optional):

| Variable | Default | Purpose |
|----------|---------|---------|
| `VITE_PROXY_TARGET` | `http://localhost:8080` | Backend target for the Vite dev-server proxy (`npm run dev`); override when the backend runs elsewhere (e.g. the Compose stack). |
| `VITE_ANALYZE` | _(unset)_ | When set (e.g. `npm run visualize`), emits a bundle treemap to `dist/stats.html`. |

In production, API requests are proxied by nginx (see the Serving row above), so no API-URL variable is needed.

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
└── nginx.conf.template       # SPA fallback + backend proxy (${BACKEND_URL})
└── docker-entrypoint.sh      # renders the template when BACKEND_URL is set
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

Lint, typecheck, unit tests (coverage-gated), and build run on every PR; pushes to `main` additionally publish the coverage badge. PR titles must follow [Conventional Commits](https://www.conventionalcommits.org/) — enforced by the `Conventional PR Title` check (`.github/workflows/pr-checks.yml`). Conventional Commits + release-please drive versioning; tagged releases build and publish the Docker image.

## History

This codebase is the second-generation implementation. The original draft is preserved on the [`archive/ogtsm`](https://github.com/sethbacon/terraform-state-manager-frontend/tree/archive/ogtsm) branch; releases up to v0.4.0 were cut from that lineage.

## License

This project is licensed under the Apache License, Version 2.0 — see the [LICENSE](LICENSE) file for details. Third-party attributions (including the Inter typeface, SIL OFL 1.1) are in [NOTICE](NOTICE).

## Disclaimer

This software is provided **"AS IS"**, without warranty of any kind, express or implied, including but not limited to the warranties of merchantability, fitness for a particular purpose, and non-infringement. In no event shall the authors or copyright holders be liable for any claim, damages, or other liability arising from the use of this software. See the [Apache 2.0 License](LICENSE) (Sections 7–8) for the full warranty disclaimer and limitation of liability.

**Operational security is the responsibility of the deploying organization.** This includes, but is not limited to: securing the deployment environment, managing secrets and credentials, configuring TLS, enforcing network boundaries, auditing access, keeping dependencies up to date, and validating the fitness of this software for your specific compliance and security requirements. The maintainers make no guarantees regarding the security posture of any deployment.
