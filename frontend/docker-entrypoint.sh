#!/bin/sh
# Render nginx's config with the backend upstream this deployment actually has.
#
# WHY THIS EXISTS (#380). The image used to bake `proxy_pass http://backend:8080`
# into /etc/nginx/conf.d/default.conf, so it only ran where a host literally
# named `backend` answered on 8080 -- Docker Compose, and nothing else. On Azure
# Container Apps the container crash-looped with
#   nginx: [emerg] host not found in upstream "backend"
# and there was no override, because the image provided none.
#
# The Dockerfile has already rendered this template once at BUILD time using the
# Compose default, so a working default.conf exists even if this script never
# runs. All this does is re-render when the operator names a different upstream.
set -eu

TEMPLATE=/etc/nginx/nginx.conf.template
TARGET=/etc/nginx/conf.d/default.conf

if [ -n "${BACKEND_URL:-}" ]; then
    # The variable allowlist is load-bearing. A bare `envsubst` substitutes EVERY
    # $name it finds, which would blank nginx's own runtime variables --
    # $csp_nonce, $request_id, $host, $remote_addr, $scheme, $uri,
    # $proxy_add_x_forwarded_for. nginx would still start, and the failure would
    # be silent: the CSP header ships `'nonce-'` with nothing after it, every
    # emotion-injected style is blocked, and the app renders unstyled.
    #
    # Rendered to a temp file FIRST, then copied over the target, so that a
    # target we cannot write is discovered without having already truncated it.
    rendered=$(mktemp)
    envsubst '${BACKEND_URL}' < "$TEMPLATE" > "$rendered"

    # TRY THE WRITE; DO NOT PREDICT IT.
    #
    # The Helm chart and the kustomize base mount a ConfigMap over this exact path
    # with subPath, which makes it read-only, and an unconditional write takes the
    # container down on every start -- in a deployment that is already correctly
    # configured, because the operator supplied the whole config.
    #
    # Testing with `[ -w "$TARGET" ]` does NOT detect that. This image runs as
    # root by default, and -w consults permission BITS, which root satisfies even
    # on a read-only filesystem; the guard passes and the redirect then fails
    # anyway. Attempting the copy is the only check that agrees with reality.
    if cat "$rendered" > "$TARGET" 2>/dev/null; then
        echo "docker-entrypoint: rendered $TARGET with BACKEND_URL=$BACKEND_URL" >&2
    else
        echo "docker-entrypoint: $TARGET is not writable (mounted config); using it as supplied and IGNORING BACKEND_URL=$BACKEND_URL" >&2
    fi
    rm -f "$rendered"
fi

# Fail fast on a config this script just wrote, rather than letting nginx die
# with a stack trace three lines into startup.
nginx -t

exec nginx -g 'daemon off;'
