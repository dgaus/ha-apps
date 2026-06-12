#!/bin/bash
# Translate Home Assistant add-on options (/data/options.json) into SLSKD_*
# environment variables, then hand off to the upstream slskd entrypoint.
set -euo pipefail

OPTIONS=/data/options.json

opt() {
    jq -r "$1 // empty" "$OPTIONS"
}

# Persist all slskd state (config, databases, search history) in the
# add-on's /data volume; the upstream default /app is lost on rebuild.
export SLSKD_APP_DIR=/data/slskd
mkdir -p "$SLSKD_APP_DIR"

export SLSKD_HTTP_PORT=5030

export SLSKD_SLSK_USERNAME="$(opt '.soulseek_username')"
export SLSKD_SLSK_PASSWORD="$(opt '.soulseek_password')"
export SLSKD_SLSK_LISTEN_PORT="$(opt '.listen_port')"

if [ -z "$SLSKD_SLSK_USERNAME" ] || [ -z "$SLSKD_SLSK_PASSWORD" ]; then
    echo "WARNING: soulseek_username/soulseek_password are not set;" \
         "slskd will start but cannot connect to the Soulseek network." >&2
fi

# Shared directories: join the list with semicolons.
export SLSKD_SHARED_DIR="$(jq -r '[.shared_dirs[]?] | join(";")' "$OPTIONS")"

DOWNLOAD_DIR="$(opt '.download_dir')"
mkdir -p "$DOWNLOAD_DIR"
export SLSKD_DOWNLOADS_DIR="$DOWNLOAD_DIR"

INCOMPLETE_DIR="$(opt '.incomplete_dir')"
if [ -n "$INCOMPLETE_DIR" ]; then
    mkdir -p "$INCOMPLETE_DIR"
    export SLSKD_INCOMPLETE_DIR="$INCOMPLETE_DIR"
fi

if [ "$(opt '.debug_logging')" = "true" ]; then
    export SLSKD_DEBUG=true
fi

# Allow editing slskd.yml from the web UI (System > Options). Options set by
# this add-on via environment variables still take precedence over the YAML.
if [ "$(opt '.remote_configuration')" = "true" ]; then
    export SLSKD_REMOTE_CONFIGURATION=true
fi

# Ingress: slskd is served under Home Assistant's dynamic ingress path, which
# it must know about to generate correct URLs. Ask the Supervisor for it.
if [ -n "${SUPERVISOR_TOKEN:-}" ]; then
    INGRESS_ENTRY="$(curl -fsS -H "Authorization: Bearer ${SUPERVISOR_TOKEN}" \
        http://supervisor/addons/self/info | jq -r '.data.ingress_entry // empty')" || INGRESS_ENTRY=""
    if [ -n "$INGRESS_ENTRY" ]; then
        export SLSKD_URL_BASE="$INGRESS_ENTRY"
        echo "Serving under ingress path: $INGRESS_ENTRY"
    else
        echo "WARNING: could not determine ingress entry; the web UI may not load via ingress." >&2
    fi
else
    echo "SUPERVISOR_TOKEN not set; skipping ingress configuration." >&2
fi

# Web UI auth: Home Assistant's ingress already authenticates users, so slskd
# auth stays off unless credentials are configured (do configure them if you
# map port 5030 to the host).
WEB_USERNAME="$(opt '.web_username')"
WEB_PASSWORD="$(opt '.web_password')"
if [ -n "$WEB_USERNAME" ] && [ -n "$WEB_PASSWORD" ]; then
    export SLSKD_USERNAME="$WEB_USERNAME"
    export SLSKD_PASSWORD="$WEB_PASSWORD"
else
    export SLSKD_NO_AUTH=true
fi

exec /entrypoint.sh ./slskd
