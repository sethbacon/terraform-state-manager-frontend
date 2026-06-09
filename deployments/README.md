# Deployments

## Local development stack (with OIDC)

`docker-compose.yml` brings up the full local stack — Postgres, **Keycloak**
(OIDC), the Go backend (built from the sibling `terraform-state-manager-backend`
checkout), and this frontend served by nginx.

Ports are chosen to coexist with a running `terraform-registry` stack:

| Service   | URL / port                 |
|-----------|----------------------------|
| Frontend  | http://localhost:3001      |
| Backend   | http://localhost:8081 (also via the frontend `/api` proxy) |
| Keycloak  | http://localhost:8180      |
| Postgres  | localhost:5433             |

### One-time setup

Add a hosts entry so the browser and the backend resolve the Keycloak issuer
(`http://keycloak:8180`) to the same place:

```
127.0.0.1 keycloak
```

### Run

```bash
make oidc-up        # from the repo root  (or: cd deployments && docker compose up --build)
```

Open http://localhost:3001 → **Sign in with OpenID Connect** → log in as a realm
test user (realm `terraform-state-manager`, password `TestPass123!`):

- `admin.user`, `alice.analyst`, `bob.operator`, `carol.viewer`

For local dev, `TSM_AUTH_OIDC_DEFAULT_ROLE=admin` grants every user the **admin**
role in the default organization, so any of them lands with full access. There is
also a **Dev Login (Admin)** button (`DEV_MODE=true`) that bypasses Keycloak.

Tear down with `make oidc-down` (add `ARGS=-v` to drop the Postgres volume).

> The backend runs OIDC discovery at startup and restarts until Keycloak is ready
> (~30s on first boot), so a few early backend restarts are expected.

> Note: a stray root-owned `keycloak/` directory may exist here from an earlier
> run; it is unused by this compose file and can be removed with
> `sudo rm -rf keycloak`.
