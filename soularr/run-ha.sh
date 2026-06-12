#!/bin/bash
# Translate Home Assistant app options (/data/options.json) into Soularr's
# config.ini, then hand off to the upstream interval-loop script.
set -euo pipefail

OPTIONS=/data/options.json
VAR_DIR=/config
mkdir -p "$VAR_DIR"

# Seed config.ini with the upstream example on first start; afterwards only
# the HA-managed keys below are rewritten, so user edits to other sections
# (Search Settings, Release Settings, ...) survive restarts.
if [ ! -f "$VAR_DIR/config.ini" ]; then
    cp /config.ini.example "$VAR_DIR/config.ini"
fi

# soularr.py reads its config from /data/config.ini (its --config-dir default);
# the web UI's strict argument parser rejects --config-dir, so link instead of
# passing the flag.
ln -sf "$VAR_DIR/config.ini" /data/config.ini

python3 - "$OPTIONS" "$VAR_DIR/config.ini" <<'EOF'
import configparser
import json
import sys
import urllib.request

options_path, config_path = sys.argv[1], sys.argv[2]
with open(options_path) as f:
    opts = json.load(f)


def fail(msg):
    print(f"ERROR: {msg}", file=sys.stderr)
    sys.exit(1)


lidarr_url = (opts.get("lidarr_url") or "").rstrip("/")
lidarr_api_key = opts.get("lidarr_api_key") or ""
if not lidarr_url or not lidarr_api_key:
    fail(
        "lidarr_url and lidarr_api_key must be set in the app configuration. "
        "Find the API key in Lidarr under Settings > General, and the hostname "
        "on the Lidarr app's info page (e.g. http://<hostname>:8686)."
    )

slskd_url = opts.get("slskd_url") or "auto"
if slskd_url == "auto":
    # Both apps ship from the same repository, so they share the slug prefix
    # the Supervisor derives from the repo URL: this app's own slug (e.g.
    # 39bd2704_soularr) maps to slskd's (39bd2704_slskd). Reading our own info
    # only needs the default Supervisor role; listing all add-ons would not.
    import os

    token = os.environ.get("SUPERVISOR_TOKEN")
    if not token:
        fail(
            "slskd_url is 'auto' but the Supervisor API is unavailable. "
            "Set slskd_url explicitly, e.g. http://<slskd-hostname>:5030."
        )
    req = urllib.request.Request(
        "http://supervisor/addons/self/info",
        headers={"Authorization": f"Bearer {token}"},
    )
    try:
        with urllib.request.urlopen(req, timeout=10) as resp:
            own_slug = json.load(resp)["data"]["slug"]
    except Exception as e:
        fail(f"could not query the Supervisor API to locate slskd: {e}")
    slskd_slug = own_slug.rsplit("_", 1)[0] + "_slskd"
    slskd_url = f"http://{slskd_slug.replace('_', '-')}:5030"
    print(f"Derived slskd app URL: {slskd_url}")
    try:
        urllib.request.urlopen(f"{slskd_url}/api/v0/application", timeout=10)
    except Exception as e:
        print(
            f"WARNING: slskd is not (yet) reachable at {slskd_url} ({e}). "
            "Continuing; Soularr will retry every cycle. If this persists, "
            "check that the slskd app from this repository is installed and "
            "running, or set slskd_url explicitly.",
            file=sys.stderr,
        )

download_dir = opts.get("download_dir") or "/media/slskd/downloads"
lidarr_download_dir = opts.get("lidarr_download_dir") or download_dir

config = configparser.ConfigParser(interpolation=None)
config.read(config_path)
for section in ("Lidarr", "Slskd"):
    if not config.has_section(section):
        config.add_section(section)

config["Lidarr"]["host_url"] = lidarr_url
config["Lidarr"]["api_key"] = lidarr_api_key
config["Lidarr"]["download_dir"] = lidarr_download_dir
config["Slskd"]["host_url"] = slskd_url
config["Slskd"]["api_key"] = opts.get("slskd_api_key") or "unused-with-no-auth"
config["Slskd"]["url_base"] = "/"
config["Slskd"]["download_dir"] = download_dir

with open(config_path, "w") as f:
    config.write(f)
print(f"Updated {config_path}: Lidarr at {lidarr_url}, slskd at {slskd_url}")
EOF

opt() {
    python3 -c "import json; v = json.load(open('$OPTIONS')).get('$1'); print('' if v is None else v)"
}

export SCRIPT_INTERVAL="$(opt interval)"
if [ "$(opt web_ui)" = "True" ]; then
    export WEBUI_ENABLED=true
else
    export WEBUI_ENABLED=false
fi

exec /app/run.sh --var-dir /config
