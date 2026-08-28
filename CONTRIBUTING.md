<!-- markdownlint-disable MD013 -->
# Contributing to Terraform State Manager — Frontend

Thank you for your interest in contributing to the frontend UI and E2E test suite.

## Table of Contents

- [Contributing to Terraform State Manager — Frontend](#contributing-to-terraform-state-manager--frontend)
  - [Table of Contents](#table-of-contents)
  - [Code of Conduct](#code-of-conduct)
  - [Getting Started](#getting-started)
    - [Prerequisites](#prerequisites)
    - [Fork and Clone](#fork-and-clone)
    - [Local Setup](#local-setup)
  - [Development Workflow](#development-workflow)
    - [Branch Naming](#branch-naming)
    - [Conventional Commits](#conventional-commits)
  - [Frontend (TypeScript) Standards](#frontend-typescript-standards)
    - [Linting](#linting)
    - [Conventions](#conventions)
  - [Testing Requirements](#testing-requirements)
  - [Data Fetching: React Query Patterns](#data-fetching-react-query-patterns)
  - [Component File Organization](#component-file-organization)
  - [Code Style](#code-style)
  - [Translation Workflow](#translation-workflow)
  - [Pull Request Process](#pull-request-process)
  - [Reporting Security Vulnerabilities](#reporting-security-vulnerabilities)
  - [Documentation](#documentation)

---

## Code of Conduct

This project expects all participants to interact with each other professionally and respectfully. Harassment, discrimination, or disruptive behavior of any kind is not acceptable. See [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md).

---

## Getting Started

### Prerequisites

- Node.js 24.x and npm (the `engines` field pins `>=24.0.0 <25`)
- Docker and Docker Compose (for running the backend during development)

### Fork and Clone

```bash
git clone https://github.com/sethbacon/terraform-state-manager-frontend.git
cd terraform-state-manager-frontend
```

### Local Setup

The fastest path is the frontend dev server pointed at a separately running backend:

```bash
cd frontend
npm install
npm run dev          # http://localhost:3000 (Vite proxies /api, /health, /swagger to :8080)
```

Or bring up the full local stack — Postgres, Keycloak (OIDC), the Go backend (built
from the sibling `terraform-state-manager-backend` checkout), and this frontend served
by nginx:

```bash
cd deployments
docker compose up --build   # or `make oidc-up` from the repo root
# Frontend:  http://localhost:3001
# Backend:   http://localhost:8081  (also via the frontend /api proxy)
# Keycloak:  http://localhost:8180
# Postgres:  localhost:5433
```

The compose stack ports are deliberately offset so they coexist with a running
`terraform-registry` stack. Add a hosts-file entry so the browser and backend resolve
the Keycloak issuer to the same place:

```text
127.0.0.1 keycloak
```

Sign in as a realm test user (realm `terraform-state-manager`, password `TestPass123!`):
`admin.user`, `alice.analyst`, `bob.operator`, `carol.viewer`. See
[deployments/README.md](deployments/README.md) for seeding details.

> **DEV_MODE**: The compose stack starts the backend with `DEV_MODE=true`, which
> enables the **Dev Login (Admin)** button used by Playwright E2E fixtures to bypass
> Keycloak. Never set `DEV_MODE=true` in a shared or production environment.

---

## Development Workflow

All work branches from `main` and is merged back to `main` via squash merge.

### Branch Naming

| Type          | Pattern                  | Example                       |
| ------------- | ------------------------ | ----------------------------- |
| Feature       | `feat/short-description` | `feat/drift-resolve-workflow` |
| Bug fix       | `fix/issue-description`  | `fix/source-list-null-ref`    |
| Documentation | `docs/topic`             | `docs/e2e-setup`              |
| Refactor      | `refactor/area`          | `refactor/auth-context`       |

### Conventional Commits

PR titles **must** follow [Conventional Commits](https://www.conventionalcommits.org/) — enforced by CI:

```text
<type>(<optional scope>): <description>
```

Accepted types: `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `build`, `ci`, `chore`, `revert`, `deps`, `security`.

> The full accepted set is enforced by `.github/workflows/pr-checks.yml`
> (the `Conventional PR Title` job, which runs `amannn/action-semantic-pull-request`).

Breaking changes use `feat!:` or include a `BREAKING CHANGE:` footer.

Examples:

- `feat: add drift acknowledge/resolve workflow to the drift page`
- `fix: prevent null reference on a source with no states`
- `docs: update e2e setup instructions`
- `chore: bump axios to 1.13.5`
- `feat!: remove legacy v1 source endpoint`

---

## Frontend (TypeScript) Standards

### Linting

```bash
cd frontend
npm run lint   # eslint . --max-warnings 0 — must produce zero warnings
npm run build  # tsc && vite build — must complete without errors
```

TypeScript strict mode is enforced. `any` types require explicit justification in a comment.

### Conventions

- **All API calls** go through the shared `apiClient` in `services/api.ts` (an Axios
  instance with `withCredentials` plus the CSRF and 401 interceptors). Never call
  `fetch` directly or create a second Axios instance.
- **Global state** uses React Context (`AuthContext`, `ThemeContext`, `HelpContext`).
  Redux is not used.
- **Server state** uses TanStack React Query with keys from `services/queryKeys.ts`
  (see [below](#data-fetching-react-query-patterns)).
- **Protected routes** are guarded by scope; admin-only routes live under `pages/admin/`.
- **Navigation** is defined once in `navigation.tsx` — the single source of truth for the
  sidebar and the route table consumed by `App.tsx`.

---

## Testing Requirements

Before submitting a pull request:

```bash
cd frontend
npm run lint
npx tsc --noEmit
npm test         # vitest run
npm run build
```

### What needs tests

| Change type          | Required tests                                                                  |
| -------------------- | ------------------------------------------------------------------------------- |
| New component        | Unit test in `components/__tests__/ComponentName.test.tsx`                       |
| New hook             | Unit test alongside the hook, named `hookName.test.ts`                           |
| New context          | Unit test in `contexts/ContextName.test.tsx`                                     |
| New service function | Unit test in `services/serviceName.test.ts`                                      |
| New utility          | Unit test in `utils/utilName.test.ts`                                            |
| New page / user flow | Page unit test, plus an E2E flow in `e2e/tests/` if it is a smoke-critical path |
| Bug fix              | Regression test covering the fixed behavior                                      |

Tests must pass with `npm test`. Coverage thresholds are enforced by `frontend/vitest.config.ts`
as a **ratchet floor** (raise with every change that touches an area; never lower). The
current floors are **85% statements / 80% branches / 82% functions / 88% lines**. CI fails the
build if any threshold is not met.

The Playwright E2E pack in [`e2e/`](e2e/) is a thin smoke suite run on demand against the
local Compose stack (frontend on `:3001` with `DEV_MODE`). It is deliberately **not**
PR-gated:

```bash
cd e2e
npm install && npx playwright install chromium
npx playwright test
```

---

## Data Fetching: React Query Patterns

All server state should use React Query (`@tanstack/react-query`), not `useState` +
`useEffect` for data fetching.

### Preferred pattern

```tsx
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '../services/queryKeys';
import { apiClient } from '../services/api';

// Reading data
const { data, isLoading, error } = useQuery({
  queryKey: queryKeys.sources.list(),
  queryFn: () => apiClient.get('/api/v1/sources').then((r) => r.data),
});

// Mutating data
const queryClient = useQueryClient();
const resolveDrift = useMutation({
  mutationFn: (id: string) => apiClient.post(`/api/v1/drift/${id}/resolve`),
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: queryKeys.drift._def });
  },
});
```

### Query keys

Query keys are defined in `services/queryKeys.ts` using a factory pattern. Each domain has
a `_def` base key and specific sub-keys. When adding a new domain, add its keys to
`queryKeys.ts` following the existing pattern. Mutations should invalidate the relevant
`_def` key to refresh all related queries.

### Anti-pattern (do not use for server state)

```tsx
// BAD: manual fetch with useState + useEffect
const [data, setData] = useState([]);
const [loading, setLoading] = useState(true);
useEffect(() => {
  apiClient.get('/api/v1/sources').then((r) => setData(r.data)).finally(() => setLoading(false));
}, []);
```

---

## Component File Organization

```text
frontend/src/
  App.tsx               # providers + lazy route table
  navigation.tsx        # single source of truth for sidebar + routes
  theme.ts              # MUI theme (brand tokens shared with the registry)
  components/           # shared app shell, help panel, command palette, dialogs
  contexts/             # React Context providers (auth, theme, help)
  hooks/                # custom React hooks
  pages/                # route-level page components
    admin/              # admin-only pages
  services/             # axios apiClient, query keys, error reporting
  types/                # TypeScript type definitions
  utils/                # pure utility functions
  locales/              # en source + 9 translated locales
```

**Conventions**:

- One component per file. File name matches the exported component/function.
- Tests live next to their source, named `SourceFile.test.ts(x)`.
- New pages go in `pages/` (general) or `pages/admin/` (admin). Register the route and its
  sidebar entry in `navigation.tsx`.

---

## Code Style

- **TypeScript strict mode** is enforced. Avoid `any`; if unavoidable, add a comment
  explaining why.
- **ESLint** runs with zero warnings (`npm run lint`). No `// eslint-disable` without a
  comment justifying it.
- **No unused variables or imports**. ESLint catches these.
- **All API calls** go through `apiClient` in `services/api.ts`. Never use `fetch` or create
  a separate Axios instance.
- **Imports**: prefer named imports. Group imports: React/external libraries first, then
  internal modules.
- **Proper nouns** (Terraform, OpenTofu, Keycloak, and other product names) stay hardcoded
  — do not route them through `t()`.

---

## Translation Workflow

The UI is internationalized with [react-i18next](https://react.i18next.com/). Translation
source files live in `frontend/src/locales/`, one directory per locale:

```text
frontend/src/locales/
  en/translation.json   ← Reference locale (English) — edit this directly in PRs
  de/translation.json   ← German    (machine-translated baseline)
  es/translation.json   ← Spanish   (machine-translated baseline)
  fr/translation.json   ← French    (machine-translated baseline)
  it/translation.json   ← Italian   (machine-translated baseline)
  ja/translation.json   ← Japanese  (machine-translated baseline)
  nb/translation.json   ← Norwegian Bokmål (machine-translated baseline)
  nl/translation.json   ← Dutch     (machine-translated baseline)
  pt/translation.json   ← Portuguese (machine-translated baseline)
  zh/translation.json   ← Chinese (Simplified, machine-translated baseline)
```

`en` is the source of truth; the other nine locales are machine-filled.

### Adding or updating English strings

1. Edit `frontend/src/locales/en/translation.json` and add your new key(s).
2. Add `useTranslation()` in the component and replace the hardcoded string with `t('your.key')`.
3. When your PR merges, the CI workflow ([`.github/workflows/translate.yml`](.github/workflows/translate.yml))
   automatically translates new strings via **DeepL** and opens a follow-up PR titled
   `i18n: update translations` on the `i18n/auto-translate` branch.

### Running translations locally

```bash
DEEPL_API_KEY=<key> node scripts/translate.mjs --all
```

The single repository secret the workflow needs is `DEEPL_API_KEY`. The workflow triggers
automatically on pushes to `main` that change `frontend/src/locales/en/translation.json`.

### Translation PRs get the same CI as any other PR

They did not, for a long time, and it is worth knowing why so it is not reintroduced.

`translate.yml` used to commit with a CI-skip directive in the message. GitHub honours those
on a branch's head commit for **both** the `push` and the `pull_request` event, so every PR
the workflow opened was created with zero check runs and zero commit statuses. Branch
protection showed all eight required contexts as *"Expected — waiting for status"*, which can
only be cleared by an admin override — so twelve translation PRs merged without a single gate
ever inspecting them. Nothing was red; there was simply nothing there.

The head commit of `i18n/auto-translate` never changes after creation, so the suppression
lasted the whole life of each PR. The only reason CI was ever seen on that branch is that
clicking **Update branch** writes a merge commit whose message carries no directive.

Three layers keep it fixed, because each one alone has a hole the other two cover:

| Layer | Where | Catches |
|---|---|---|
| `scripts/check-workflow-ci-skip.mjs` | step in the required **Lint** check | the directive reaching any workflow or composite-action file |
| `scripts/assert-pr-checks-present.mjs` | `.github/workflows/pr-ci-presence.yml`, on a **schedule** | any open PR that has no checks, whatever the cause |
| the same script, `--pr` mode | last step of `translate.yml` | the translation PR specifically, with no scheduler latency |

The scheduled auditor is the important one. A guard for *"no checks ran"* that is itself a
check cannot fire in the one situation it exists to detect — the suppression that hides the
CI hides the guard with it. GitHub's skip keywords apply to `push` and `pull_request` only,
so `schedule` is the trigger that a commit message cannot reach.

The static scanner runs **two passes**, and needs both. Pass 1 reads the raw file text. Pass 2
parses the YAML and tests the **resolved string values** — what GitHub itself reads. Pass 2 is
the load-bearing one, because YAML has many spellings for one string, and all four of these
resolve to exactly `[skip ci]` while defeating any source-text regex:

```yaml
commit-message: "... [skip\x20ci]"      # hex escape for the space
commit-message: "... [skip\u0020ci]"    # unicode escape for the space
commit-message: "... \x5Bskip ci]"      # hex escape for the opening bracket
commit-message: "... [skip \
  ci]"                                  # double-quoted line continuation
```

The last one is the instructive case: whitespace-normalising the whole file closes the `>-`
folded-scalar axis **only**, because a line continuation leaves a literal backslash between
the words that survives normalisation. Chasing spellings one at a time is unwinnable — testing
the resolved value closes all of them, including the fifth nobody has thought of yet.

Pass 1 is still kept, because it is not a subset of pass 2: comments do not survive parsing,
and a file that fails to parse still gets read. A directive has to evade **both** to land.

The scanner enumerates **every YAML file under `.github`**, recursively, plus any `action.yml`
elsewhere in the tree — not just `.github/workflows/*.yml`. `.github/dependabot.yml` has a
`commit-message:` key of its own, and a composite action can `git commit` in a `run:` block.
It then cross-checks what it read against an independent enumeration and refuses to report
clean if the two disagree: a walk that quietly narrows produces a green check over the files
it stopped reading, which is indistinguishable from a repository with nothing to find.

Run either locally:

```bash
node scripts/check-workflow-ci-skip.mjs
GITHUB_REPOSITORY=sethbacon/terraform-state-manager-frontend \
  node scripts/assert-pr-checks-present.mjs
```

Never re-add a skip directive to a commit message. If a workflow needs to avoid re-triggering
itself, express that as a `paths:` or `branches:` filter on the trigger, where it is visible
and reviewable.

---

## Pull Request Process

1. Branch from `main` (`feat/`, `fix/`, `docs/`, `refactor/`, etc.).
2. Write a clear PR description — what changed and why, how you tested it,
   screenshots for UI changes, and a link to the issue.
3. **PR title must follow Conventional Commits** (enforced by CI):
   `feat: add drift resolve action` / `fix: null ref on empty source` / `docs: update e2e setup`.
4. All required CI checks must pass: **Lint**, **Typecheck**, **Unit Tests**, **Build**,
   **Conventional PR Title**, and **Dependency Review**.
5. At least one reviewer approval is required before merging (code-owner review where
   `.github/CODEOWNERS` applies).
6. **Squash-merge** into `main`. The remote branch is deleted after merge.
7. The PR author is responsible for resolving merge conflicts.

---

## Reporting Security Vulnerabilities

**Do not open a public GitHub issue for security vulnerabilities.**

Use [GitHub's private security advisory feature](https://github.com/sethbacon/terraform-state-manager-frontend/security/advisories/new)
to report issues privately. See [SECURITY.md](SECURITY.md) for the full policy, scope, and
response timelines.

---

## Documentation

Documentation is a first-class deliverable:

- **New features**: update the relevant section of [README.md](README.md).
- **New pages**: document any new routes, scopes, or UI concepts.
- **API changes**: coordinate with the backend repository — API changes require updates in
  [terraform-state-manager-backend](https://github.com/sethbacon/terraform-state-manager-backend).

PRs that introduce user-visible features without corresponding documentation updates will be
asked to add documentation before merge.

## Tenancy model (estate-wide)

The suite is moving to an explicit tenancy model: **the host is the content tenant**
(modules, providers, binaries belong to a host), **the organisation is the editorial
scope** (who may edit, set policy, approve a version), and the state manager is
**single-host by design**.

**Read [`docs/tenancy-model.md` in terraform-suite-identity](https://github.com/sethbacon/terraform-suite-identity/blob/main/docs/tenancy-model.md) before changing
anything that touches `organization_id`, namespace ownership, the Terraform protocol
surface, or a scoped read.** It also records what must not be done — two of those are
one-way doors that read as ordinary tidy-up.

Most relevant here: **an unscoped read is not automatically a finding.** The registry's
consumption surface is unscoped by design under the current model. A guard should assert
that every unscoped read is *declared*, not that none exists.
