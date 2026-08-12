# Multi-stage Dockerfile for the Terraform State Manager frontend.

# Stage 1: build the static SPA.
FROM node:26-alpine AS builder
WORKDIR /app
# .npmrc carries legacy-peer-deps=true (eslint-plugin-jsx-a11y hasn't declared
# ESLint 10 support yet); npm ci needs it to resolve the dependency tree.
COPY package*.json .npmrc ./
# The suite UI dependency is public on npmjs, so npm ci needs no registry auth.
RUN npm ci
# Gate on PRODUCTION-dependency vulnerabilities only, against the exact committed
# lockfile. No in-build `npm audit fix`: it would mutate node_modules without
# updating the shipped lockfile, so the bundled dependency code could diverge from
# its sha512-hashed integrity record — handle fixes as a reviewed PR instead
# (#213). Dev-only tooling (vite/vitest/eslint) is not in the final nginx image
# and is excluded so it cannot fail the build.
#
# Triaged rather than raw: bare `npm audit` exits non-zero for ANY high advisory,
# including ones no PR can act on — notably one whose only published "fix" is a
# semver-major DOWNGRADE. That fails the image build regardless of what changed,
# which blocks releases on something nobody can fix. audit-gate.mjs blocks only
# on advisories that reach production AND have a non-breaking fix; documented
# accepted risks live in scripts/npm-audit-exceptions.json with a review date.
# Same gate and same register as terraform-registry-frontend.
COPY scripts/audit-gate.mjs scripts/npm-audit-exceptions.json ./scripts/
RUN npm audit --json --omit=dev > /tmp/audit.json || true; \
    node scripts/audit-gate.mjs /tmp/audit.json --exceptions scripts/npm-audit-exceptions.json
COPY . .
RUN npm run build

# Stage 2: serve via nginx (proxies /api and probes to the backend).
# Pinned by digest for reproducibility and supply-chain hardening (nginx:1.27-alpine).
FROM nginx:1.31-alpine@sha256:4a73073bd557c65b759505da037898b61f1be6cbcc3c2c3aeac22d2a470c1752
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
