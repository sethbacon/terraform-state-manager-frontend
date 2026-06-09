.PHONY: oidc-up oidc-down oidc-logs dev build

# Bring up the full local stack (Postgres + Keycloak + backend + frontend).
# Requires /etc/hosts: 127.0.0.1 keycloak
oidc-up:
	cd deployments && docker compose up --build

# Tear the stack down (add ARGS=-v to also drop the Postgres volume).
oidc-down:
	cd deployments && docker compose down $(ARGS)

oidc-logs:
	cd deployments && docker compose logs -f

# Frontend-only dev server (expects the backend running separately on :8081/:8080).
dev:
	cd frontend && npm run dev

build:
	cd frontend && npm run build
