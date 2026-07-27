<!-- markdownlint-disable MD013 -->
# Privacy Policy

> Last updated: 2026-06-17

## 1. Introduction

This Privacy Policy explains how the Terraform State Manager ("we", "us", "the
Service") collects, uses, and protects your personal data. We are committed to
complying with the General Data Protection Regulation (GDPR), the California
Consumer Privacy Act (CCPA), and other applicable data protection laws.

## 2. Data Controller

The data controller is the organization that deploys this instance of the
Terraform State Manager. Contact your administrator for specific data controller
information.

## 3. Data We Collect

### 3.1 Account Data

When you authenticate via SSO/OIDC, SAML, Azure AD, or LDAP:

- Display name
- Email address
- Organization membership and role
- Authentication identifiers (e.g. OIDC subject)

### 3.2 Usage Data

When you interact with the Service:

- API request logs (IP address, timestamp) handled by the backend
- Audit trail events (action, actor, resource, timestamp) for administrative and
  state-changing operations

### 3.3 No Telemetry, No Analytics

**This application contains no telemetry, analytics, error-reporting, or
performance-monitoring pipeline.** The frontend does not send usage data, page
views, web-vitals, or error reports to any third party or analytics endpoint. The
error-handling shim (`services/errorReporting.ts`) only logs to the browser
console — it does not transmit anything off the device.

A **consent banner** (`ConsentBanner`, inherited from the shared
`@sethbacon/terraform-suite-ui` package) is mounted app-wide and offers
Essential / Error Reporting / Performance Monitoring / Analytics toggles, storing
the choice under the `tsm-consent` `localStorage` key (see section 7). These
categories are shared-package UI: **no data pipeline is currently wired to any of
them in this application**, so the choice does not presently gate any data
collection — there is simply nothing to collect. The banner is disclosed here for
transparency and to account for its storage key.

## 4. Legal Basis for Processing

| Purpose            | Legal Basis (GDPR Art 6)                     |
| ------------------ | -------------------------------------------- |
| Account management | Performance of contract (Art 6(1)(b))        |
| Audit logging      | Legitimate interest — security (Art 6(1)(f)) |

## 5. Data Retention

Account data and audit logs are stored and retained by the **backend**; the
frontend stores no personal data server-side. Retention periods are configured
by your instance administrator — contact them for specifics. Audit logs may be
held longer under a legal hold.

## 6. Your Rights

Under GDPR, you have the right to:

- **Access** your personal data (Art 15) — administrators can export a user's
  data via `GET /api/v1/admin/users/:id/export` (JSON download)
- **Rectify** inaccurate data (Art 16)
- **Erase** your data (Art 17) — administrators can anonymize a user and revoke
  access via `POST /api/v1/admin/users/:id/erase`, or you can contact your
  administrator
- **Restrict** processing (Art 18)
- **Data portability** (Art 20) — the export endpoint provides JSON format
- **Object** to processing (Art 21)

## 7. Cookies and Local Storage

### Cookies

The Service uses **session cookies only** — no third-party or tracking cookies.

| Cookie                  | Purpose                                   | Read by JS | Duration |
| ----------------------- | ----------------------------------------- | ---------- | -------- |
| Session cookie (HttpOnly) | Authentication (the session JWT)        | No         | Session  |
| `tsm_csrf`              | CSRF double-submit token (echoed on mutations) | Yes   | Session  |

The session JWT is held in an **HttpOnly** cookie that JavaScript cannot read, so
it cannot be exfiltrated by client-side script. The `tsm_csrf` cookie is
deliberately readable so the app can echo it back in an `X-CSRF-Token` header to
defeat cross-site request forgery; it carries no personal data.

### Local Storage

The frontend stores only **non-personal UI preferences** in the browser's
`localStorage` — never the session token or any credential:

| Key                    | Purpose                              | Duration   |
| ---------------------- | ------------------------------------ | ---------- |
| `tsm-theme`            | UI theme (light/dark)                | Persistent |
| `tsm-help-panel-open`  | Help panel open/closed state         | Persistent |
| `tsm-nav-groups-open`  | Which sidebar groups are expanded    | Persistent |
| `tsm-consent`          | Consent-banner category preferences (no data pipeline is wired to these; see section 3.3) | Persistent |
| `i18nextLng`           | Selected interface language          | Persistent |

The cached auth keys `tsm_user` and `tsm_scopes` are reserved by the app's
storage utility but are **only cleared** on logout/401 — the current session is
resolved from the cookie on each load, not restored from `localStorage`.

## 8. Data Transfers

Data residency depends on where this instance is deployed. For multi-region or
data-residency considerations, see the backend's deployment documentation in
**[terraform-state-manager-backend](https://github.com/sethbacon/terraform-state-manager-backend)**.

## 9. Security

We implement technical and organizational measures including:

- Encryption in transit (TLS, terminated by your ingress/deployment)
- Cookie-only sessions with the JWT in an HttpOnly cookie (no token in
  `localStorage`)
- CSRF protection via the double-submit `tsm_csrf` token / `X-CSRF-Token` header
- A strict Content-Security-Policy with per-request style nonces, plus
  `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy`,
  and a restrictive `Permissions-Policy` (see `frontend/nginx.conf`)
- Role-based access control (scopes), with `admin` as a wildcard
- Audit logging of administrative and state-changing actions

> **Note on HSTS:** this app's `frontend/nginx.conf` does **not** set a
> `Strict-Transport-Security` header, because TLS is terminated upstream by your
> ingress / load balancer (see the deployment disclaimer). The deploying
> organization should add `Strict-Transport-Security` at that TLS-terminating
> layer.

See [SECURITY.md](SECURITY.md) for details.

## 10. Changes to This Policy

We may update this policy from time to time. The "Last updated" date at the top
reflects the most recent revision.

## 11. Contact

For privacy-related inquiries, contact your instance administrator or open a
GitHub issue with the `privacy` label.
