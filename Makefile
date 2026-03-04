dev-up:
	docker compose -f deployments/docker-compose.yml up -d --build

dev-down:
	docker compose -f deployments/docker-compose.yml down

dev-down-volumes:
	docker compose -f deployments/docker-compose.yml down --volumes

oidc-up:
	docker compose -f deployments/docker-compose.yml -f deployments/docker-compose.oidc.yml up -d --build

oidc-down:
	docker compose -f deployments/docker-compose.yml -f deployments/docker-compose.oidc.yml down

oidc-down-volumes:
	docker compose -f deployments/docker-compose.yml -f deployments/docker-compose.oidc.yml down --volumes

prod-up:
	docker compose -f deployments/docker-compose.yml -f deployments/docker-compose.prod.yml up -d

prod-down:
	docker compose -f deployments/docker-compose.yml -f deployments/docker-compose.prod.yml down
