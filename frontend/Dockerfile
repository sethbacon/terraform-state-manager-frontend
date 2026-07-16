# Multi-stage Dockerfile for the Terraform State Manager frontend.

# Stage 1: build the static SPA.
FROM node:24-alpine AS builder
WORKDIR /app
# .npmrc carries legacy-peer-deps=true (eslint-plugin-jsx-a11y hasn't declared
# ESLint 10 support yet); npm ci needs it to resolve the dependency tree.
COPY package*.json .npmrc ./
# NODE_AUTH_TOKEN (a GitHub Packages read token) is injected as a BuildKit secret so npm
# can install the private @sethbacon/* dependency without baking the token into a layer.
RUN --mount=type=secret,id=node_auth_token \
    NODE_AUTH_TOKEN="$(cat /run/secrets/node_auth_token)" npm ci
# Auto-fix what we can, then gate on PRODUCTION-dependency vulnerabilities only.
# Dev-only tooling (vite/vitest/eslint) is not present in the final nginx image
# and is excluded so it cannot fail the build.
RUN --mount=type=secret,id=node_auth_token \
    export NODE_AUTH_TOKEN="$(cat /run/secrets/node_auth_token)" && \
    npm audit fix || true && \
    npm audit --audit-level=high --omit=dev
COPY . .
RUN npm run build

# Stage 2: serve via nginx (proxies /api and probes to the backend).
# Pinned by digest for reproducibility and supply-chain hardening (nginx:1.27-alpine).
FROM nginx:1.27-alpine@sha256:65645c7bb6a0661892a8b03b89d0743208a18dd2f3f17a54ef4b76fb8e2f2a10
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/dist /usr/share/nginx/html

# Apply the latest Alpine security patches on top of the digest-pinned base
# image. The digest pin freezes the base package set, so without this a rebuild
# keeps shipping whatever OS CVEs the base layer was built with (e.g. the
# c-ares/curl/libexpat HIGHs that nginx:alpine carries and that Trivy fails on).
# OS security patching, distinct from the lockfile-pinned npm build dependencies.
#
# Also pre-create nginx cache/temp dirs owned by the built-in nginx user (uid 101) and
# move the pid to /tmp so the container can run as non-root WITHOUT the CHOWN
# capability (the AKS Helm chart drops it and sets runAsUser: 101). Mirrors the
# registry frontend image. Local docker-compose still runs as root on port 80.
RUN apk upgrade --no-cache && \
    mkdir -p /var/cache/nginx/client_temp \
    /var/cache/nginx/proxy_temp \
    /var/cache/nginx/fastcgi_temp \
    /var/cache/nginx/uwsgi_temp \
    /var/cache/nginx/scgi_temp && \
    chown -R 101:101 /var/cache/nginx /var/log/nginx && \
    sed -i -E 's#pid\s+/(var/)?run/nginx\.pid;#pid /tmp/nginx.pid;#' /etc/nginx/nginx.conf

EXPOSE 80
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://127.0.0.1:80/ || exit 1
