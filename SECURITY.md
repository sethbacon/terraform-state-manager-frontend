<!-- markdownlint-disable MD013 -->
# Security Policy

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 1.x     | :white_check_mark: |
| < 1.0   | :x:                |

The current release line is **1.x** (see `frontend/package.json`). The frontend is
released and deployed alongside the backend; see
[terraform-state-manager-backend](https://github.com/sethbacon/terraform-state-manager-backend)
for the matching backend versions.

## Reporting a Vulnerability

If you discover a security vulnerability in this project, please report it responsibly.

**Do NOT open a public GitHub issue for security vulnerabilities.**

Instead, please use one of the following channels:

1. **GitHub Security Advisories** (preferred): Use the [Report a Vulnerability](https://github.com/sethbacon/terraform-state-manager-frontend/security/advisories/new) feature on this repository.
2. **Email**: Contact the maintainer directly at the email address listed on their GitHub profile.

### What to include

- A description of the vulnerability
- Steps to reproduce the issue
- The potential impact
- Any suggested fixes (optional)

### What to expect

- **Acknowledgment**: Within 48 hours of your report.
- **Status update**: Within 7 days with an assessment and remediation timeline.
- **Resolution**: Security patches are prioritized and typically released within 30 days of confirmation.

### Scope

The following are considered in-scope:

- Cross-site scripting (XSS) in the frontend
- Authentication or authorization bypasses
- Sensitive data exposure (tokens, credentials)
- Dependency vulnerabilities with a known exploit path

The following are out of scope:

- The backend API (see [terraform-state-manager-backend](https://github.com/sethbacon/terraform-state-manager-backend) for its security policy)
- Vulnerabilities that require physical access to the server
- Social engineering attacks
- The local development Docker Compose stack in `deployments/`, which ships **intentionally
  insecure** defaults (`DEV_MODE=true`, `DEFAULT_ROLE=admin`, public dev secrets) and must
  never be deployed to a shared or production environment

We follow [coordinated disclosure](https://en.wikipedia.org/wiki/Coordinated_vulnerability_disclosure).
We will credit reporters in the release notes unless anonymity is requested.

## Security Practices

- Authentication uses an **HttpOnly session cookie** set by the backend. The session JWT is
  never stored in `localStorage` or readable by JavaScript — only non-secret view state
  (`tsm_user`, `tsm_scopes`) is cached client-side and cleared on logout or `401`.
- Mutating requests are protected by a **double-submit CSRF token**: the backend sets a
  readable `tsm_csrf` cookie alongside the auth cookie, and the Axios interceptor in
  `frontend/src/services/api.ts` echoes it in an `X-CSRF-Token` header on
  `POST`/`PUT`/`PATCH`/`DELETE`.
- The frontend follows OWASP Top 10 mitigations applicable to SPAs (output encoding, no use
  of `dangerouslySetInnerHTML`, a strict Content-Security-Policy with a per-request nonce
  served by nginx).
- Releases are signed with [cosign](https://github.com/sigstore/cosign) (keyless, Sigstore)
  and carry SLSA build provenance attestations (see [RELEASING.md](RELEASING.md)).
- `npm audit --audit-level=high --omit=dev` runs in the production Docker build.

## Repository Hardening

The following GitHub repository controls are recommended for `main` to protect the release
pipeline and supply chain.

### Branch Protection (`main`)

- Required status checks (strict — branch must be up-to-date): `Lint`, `Typecheck`,
  `Unit Tests`, `Build`, `Conventional PR Title`, `Dependency Review`
- Required pull request reviews: 1 approving review, dismiss stale reviews, require
  code-owner review where `.github/CODEOWNERS` applies
- Required conversation resolution: yes
- Force pushes: blocked; branch deletion: blocked

### Merge Strategy

- **Squash merge only** — rebase merges and merge commits are disabled
- Delete branch on merge: enabled

### Tag Protection

Release tags matching `v*.*.*` should be protected from deletion via a repository ruleset.
To apply via the GitHub CLI:

```bash
gh api repos/{owner}/{repo}/rulesets --method POST \
  --field name="Protect release tags" \
  --field target=tag \
  --field enforcement=active \
  --field 'conditions[ref_name][include][]=refs/tags/v*.*.*' \
  --field 'rules[][type]=deletion'
```

Or in the UI: **Settings → Rules → Rulesets → New ruleset** targeting tags matching
`v*.*.*` with a "Restrict deletions" rule.

### Supply-Chain Security

- All GitHub Actions are pinned to full commit SHAs (see `.github/workflows/`).
- Secret scanning + push protection: enable in repository settings.
- The release Docker image is built from a digest-pinned `nginx:1.27-alpine` base and runs
  `npm audit --audit-level=high --omit=dev` during the build.
- **SLSA provenance attestation** on Docker images via `actions/attest-build-provenance`
  (see `.github/workflows/release.yml`).
- **Cosign keyless signing** on Docker images via Sigstore — verify with `cosign verify`
  (see [RELEASING.md](RELEASING.md)).

### Shared private package: `@4cloudguru/cloud-suite-ui`

This app depends on the private, out-of-tree package
[`@4cloudguru/cloud-suite-ui`](https://github.com/sethbacon/terraform-suite-ui)
(GitHub Packages npm registry), which carries **load-bearing security code**
shared across the Terraform Suite apps: the authentication/session provider
(`SuiteAuthProvider` — session lifecycle, expiry warnings, scope checks),
the GDPR consent provider, the theme provider, and the app shell/navigation.
Local files under `src/contexts/` and several `src/components/` are thin
wrappers around it (see the "Shared Suite Package" section of
`ARCHITECTURE.md` for the full mapping).

Because a compromised or regressed publish of this package would affect
authentication in every consuming app, it is subject to the following
controls:

- **Exact version pin** — `package.json` pins the package to an exact
  version (no semver range), and `package-lock.json` enforces the tarball's
  `sha512` integrity. A malicious re-publish of the same version cannot be
  installed without an integrity failure, and a new version cannot arrive
  via a routine floating-range install.
- **Audited** — the package received a blind security audit methodology on
  2026-07-10 (26 findings: 2 high, 16 medium, remainder low/info), all
  remediated in
  [v0.5.3](https://github.com/sethbacon/terraform-suite-ui/releases/tag/v0.5.3)
  (2026-07-11). That was the **audit-fix release, not necessarily the currently
  pinned version** — the authoritative pin is whatever `frontend/package.json`
  declares (it has since moved forward past v0.5.3). Every manual bump must review
  the upstream
  [CHANGELOG](https://github.com/sethbacon/terraform-suite-ui/blob/main/CHANGELOG.md)
  for auth/consent-relevant changes (see the review note below). The package repo
  now carries its own `SECURITY.md` and a security-model section in its README.
- **Upstream supply-chain gates** — the package's own CI runs typecheck,
  tests, build, and CodeQL; its publish workflow verifies the tarball
  contains only `dist/` + docs before publishing and attaches a build
  provenance attestation (`actions/attest-build-provenance`) to each
  release.
- **Manual, reviewed updates** — `.github/dependabot.yml` runs Dependabot for the
  public dependency tree (npm, Docker base images, and GitHub Actions). The
  private `@sethbacon/*` package is deliberately **excluded** from automated bumps
  (`ignore`d): resolving it requires a GitHub Packages read token
  (`DEPENDABOT_PACKAGES_READ`), and its version is pinned in lockstep with the
  suite out of band. Bumps to it are manual PRs that must update the exact pin and
  lockfile together and review the upstream
  [CHANGELOG](https://github.com/sethbacon/terraform-suite-ui/blob/main/CHANGELOG.md)
  for auth/consent-relevant changes.
