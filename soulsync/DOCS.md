# SoulSync Home Assistant App

[SoulSync](https://github.com/Nezreka/SoulSync) is a self-hosted music discovery
and automation platform. It mirrors Spotify/Tidal/YouTube playlists, finds
missing tracks, downloads them from the Soulseek network (via
[slskd](https://github.com/slskd/slskd)) and other sources, and organises them
into a library that Plex, Jellyfin or Navidrome can serve.

This app packages SoulSync for Home Assistant to pair with the **slskd** app
from this repository.

> ⚠️ **No authentication.** SoulSync's web UI has no login of its own. Only map
> its ports on a trusted network. Do not expose them to the internet.

## Setup

1. Start the app and open the **Web UI** (the *Open Web UI* button, or
   `http://<home-assistant>:8008`).
2. Go to **Settings** and configure:
   - **Soulseek / slskd** — the slskd URL and an API key (see below).
   - **Media server** — Plex, Jellyfin, Navidrome, or standalone mode.
   - **Paths** — set the download path to `/media/slskd/downloads` (where the
     slskd app saves completed downloads) and the organised-library/output path
     to `/media/music`.
   - **Spotify** (optional but recommended for discovery) — see OAuth below.

Everything is configured in SoulSync's own UI; this app stores that
configuration and its database persistently (see Storage).

## Connecting to slskd

In SoulSync's Settings, set the slskd URL to either:

- the slskd app's internal address — printed in **this app's log** at startup as
  `Configure SoulSync's slskd URL as: http://..._slskd:5030`, or
- `http://<home-assistant-ip>:5030` if you have mapped slskd's port 5030 to the
  host.

SoulSync expects a slskd **API key**. The slskd app runs with authentication
disabled by default, so set an API key in its config file
(`/addon_configs/..._slskd/slskd.yml`, under `web.authentication.api_keys`) and
paste the same key into SoulSync.

## Spotify / Tidal login (OAuth)

Logging in to Spotify or Tidal uses an OAuth redirect back to SoulSync on ports
**8888** (Spotify) and **8889** (Tidal). To use it:

1. Map ports 8888 and/or 8889 in the app's **Network** section.
2. In your Spotify/Tidal developer app, add the redirect URI SoulSync shows
   (pointing at `http://<home-assistant-ip>:8888/...`).

If you only use Soulseek you can ignore these ports.

## Storage

| Path | Purpose |
|------|---------|
| `/media/slskd/downloads` | Source: completed slskd downloads (set as SoulSync's download path) |
| `/media/music` | Organised library output (set as SoulSync's library/output path) |
| `/data/soulsync` | SoulSync's config, SQLite database and logs. Survives updates and rebuilds. |

The `/media` folder is shared with Home Assistant (visible in the Media browser)
and with the slskd app.

## Options

- **User ID / Group ID (PUID/PGID)** — default `0` (root) so SoulSync can write
  to the root-owned `/media` folder. Leave at the defaults unless you have a
  specific reason to change them.
- **Timezone** — optional `TZ` name (e.g. `Europe/London`) for log timestamps
  and scheduling.
