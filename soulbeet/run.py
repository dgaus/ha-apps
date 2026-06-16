#!/usr/bin/python3
"""Home Assistant entrypoint for Soulbeet.

The upstream image is distroless, so there is no shell to write a run.sh in --
but it does ship /usr/bin/python3 (beets runs on it). This wrapper reads the
Home Assistant options, exports the handful of environment variables Soulbeet
expects, makes sure its SECRET_KEY persists across rebuilds, then hands off to
the upstream server binary.
"""
import json
import os
import secrets
import sys
import urllib.request

OPTIONS = "/data/options.json"
SECRET_KEY_FILE = "/data/secret_key"
SERVER = "/app/server/server"


def log(msg):
    print(f"[soulbeet] {msg}", flush=True)


def load_options():
    try:
        with open(OPTIONS) as f:
            return json.load(f)
    except FileNotFoundError:
        return {}


def persist_secret_key():
    """Generate a SECRET_KEY once and reuse it. Soulbeet encrypts stored
    credentials (slskd API key, scrobble tokens) with it, so a changing key
    would make them undecryptable after every restart."""
    try:
        with open(SECRET_KEY_FILE) as f:
            key = f.read().strip()
        if key:
            return key
    except FileNotFoundError:
        pass
    key = secrets.token_hex(32)
    with open(SECRET_KEY_FILE, "w") as f:
        f.write(key)
    log("Generated a new persistent SECRET_KEY in /data/secret_key")
    return key


def log_slskd_hint():
    """Best-effort: print the sibling slskd app's internal address so it can be
    pasted into Soulbeet's Settings -> Config. Both apps ship from the same
    repository, so they share the slug prefix the Supervisor derives from the
    repo URL (e.g. <hash>_soulbeet -> <hash>_slskd, underscores -> dashes in the
    container hostname). Never fatal."""
    token = os.environ.get("SUPERVISOR_TOKEN")
    if not token:
        return
    try:
        req = urllib.request.Request(
            "http://supervisor/addons/self/info",
            headers={"Authorization": f"Bearer {token}"},
        )
        with urllib.request.urlopen(req, timeout=5) as resp:
            slug = json.load(resp).get("data", {}).get("slug", "")
        if slug:
            prefix = slug.rsplit("_", 1)[0]
            host = f"{prefix}_slskd".replace("_", "-")
            log(f"Configure Soulbeet's slskd URL as: http://{host}:5030")
    except Exception as exc:  # noqa: BLE001 - convenience only
        log(f"Could not determine sibling slskd address ({exc})")


def main():
    opts = load_options()

    navidrome_url = (opts.get("navidrome_url") or "").strip()
    if not navidrome_url:
        log(
            "navidrome_url is not set. Open the app's Configuration tab and set "
            "it to your Navidrome server (e.g. http://<home-assistant-ip>:4533), "
            "then restart."
        )
        sys.exit(1)
    os.environ["NAVIDROME_URL"] = navidrome_url

    download_dir = (opts.get("download_dir") or "/media/slskd/downloads").strip()
    os.environ["DOWNLOAD_PATH"] = download_dir

    os.environ["SECRET_KEY"] = persist_secret_key()

    # HA mounts its own /data over the image's pre-created copy, so re-create the
    # beets plugin drop-in dir (harmless if it already exists).
    os.makedirs("/data/beets-plugins", exist_ok=True)

    if opts.get("album_mode"):
        os.environ["BEETS_ALBUM_MODE"] = "true"

    tz = (opts.get("tz") or "").strip()
    if tz:
        os.environ["TZ"] = tz

    # Honour a custom beets config dropped into the add-on config folder.
    beets_config = "/config/beets_config.yaml"
    if os.path.isfile(beets_config):
        os.environ["BEETS_CONFIG"] = beets_config
        log(f"Using custom beets config at {beets_config}")

    log(f"Navidrome: {navidrome_url}")
    log(f"Downloads: {download_dir}")
    log_slskd_hint()

    # DATABASE_URL, PORT, IP and HOME are already set by the image. exec() so the
    # server becomes PID 1 and receives signals directly.
    os.execv(SERVER, [SERVER])


if __name__ == "__main__":
    main()
