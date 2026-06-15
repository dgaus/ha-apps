#!/bin/bash
# Redirect SoulSync's config + database into the app's persistent /data volume,
# pass through a few Home Assistant options as environment variables, then hand
# off to the upstream entrypoint (which applies PUID/PGID and launches gunicorn).
set -euo pipefail

OPTIONS=/data/options.json

opt() {
    jq -r "$1 // empty" "$OPTIONS"
}

# The image declares /app/{config,data,logs,...} as Docker VOLUMEs, so their
# contents do not survive an app rebuild/update. SoulSync stores its settings in
# its SQLite database and honours two path overrides (see config/settings.py),
# so point both at the persistent /data volume instead. The encryption key is
# written next to the database, so it persists too.
PERSIST=/data/soulsync
mkdir -p "$PERSIST/config" "$PERSIST/database"

# Seed config.json from the image's bundled default on first run (the app reads
# most settings from the database, but keeps a config.json alongside it).
if [ ! -f "$PERSIST/config/config.json" ] && [ -f /defaults/config.json ]; then
    cp /defaults/config.json "$PERSIST/config/config.json"
fi

export SOULSYNC_CONFIG_PATH="$PERSIST/config/config.json"
export DATABASE_PATH="$PERSIST/database/music_library.db"

# Default to running as root (PUID/PGID 0): Home Assistant owns /media as root,
# so SoulSync must be root to write the organised library there. The upstream
# entrypoint uses `usermod -o`, so reusing uid/gid 0 is accepted.
export PUID="$(opt '.puid')"
export PGID="$(opt '.pgid')"
export PUID="${PUID:-0}"
export PGID="${PGID:-0}"

TZ_OPT="$(opt '.tz')"
if [ -n "$TZ_OPT" ]; then
    export TZ="$TZ_OPT"
fi

# Convenience: derive and log the sibling slskd app's internal address so it can
# be pasted into SoulSync's Settings. Both apps ship from the same repository,
# so they share the slug prefix the Supervisor derives from the repo URL
# (e.g. <hash>_soulsync -> <hash>_slskd, with underscores becoming dashes in the
# container hostname). Best-effort only — never fatal.
if [ -n "${SUPERVISOR_TOKEN:-}" ]; then
    OWN_SLUG="$(curl -fsS -H "Authorization: Bearer ${SUPERVISOR_TOKEN}" \
        http://supervisor/addons/self/info | jq -r '.data.slug // empty')" || OWN_SLUG=""
    if [ -n "$OWN_SLUG" ]; then
        SLSKD_HOST="$(echo "${OWN_SLUG%_*}_slskd" | tr '_' '-')"
        echo "Configure SoulSync's slskd URL as: http://${SLSKD_HOST}:5030"
    fi
fi

# Re-exec the upstream entrypoint with its normal command (see the image's
# Dockerfile CMD). It applies PUID/PGID and drops privileges via gosu.
exec /entrypoint.sh gunicorn -c gunicorn.conf.py wsgi:application
