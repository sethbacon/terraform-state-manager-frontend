# Multi-stage Dockerfile for the Terraform State Manager frontend.

# Stage 1: build the static SPA.
FROM node:24-alpine AS builder
WORKDIR /app
# .npmrc carries legacy-peer-deps=true (eslint-plugin-jsx-a11y hasn't declared
# ESLint 10 support yet); npm ci needs it to resolve the dependency tree.
COPY package*.json .npmrc ./
RUN npm ci
COPY . .
RUN npm run build

# Stage 2: serve via nginx (proxies /api and probes to the backend).
FROM nginx:1.27-alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/dist /usr/share/nginx/html
EXPOSE 80
