# Soulbeet Home Assistant App

[Soulbeet](https://github.com/terry90/soulbeet) is a self-hosted music
downloader, library manager and discovery engine. You search for an album or
track, Soulbeet finds the best source on the Soulseek network (via
[slskd](https://github.com/slskd/slskd)), downloads it, tags and organises it
with [beets](https://beets.io/), and drops it into a library that
[Navidrome](https://www.navidrome.org/) streams. Optionally it analyses your
Last.fm / ListenBrainz history and builds discovery playlists automatically.

This app packages Soulbeet for Home Assistant to pair with the **slskd** app
from this repository and a **Navidrome** server you already run.

## Prerequisites

- The **slskd** app from this repository, installed, configured and connected
  to the Soulseek network.
- A reachable **Navidrome** server (e.g. the
  [alexbelgium Navidrome add-on](https://github.com/alexbelgium/hassio-addons)).
  Soulbeet uses it both for streaming and for logging in.

## Setup

1. Install this app, then open its **Configuration** tab and set:
   - **Navidrome URL** — see below.
   - **Download directory** — leave at `/media/slskd/downloads` unless you
     changed the slskd app's download folder.
2. Start the app and open the **Web UI** (the *Open Web UI* button, or
   `http://<home-assistant>:9765`).
3. Log in with your **Navidrome** username and password.
4. In **Settings → Config**, connect **slskd** (URL + API key — see below).
5. In **Settings → Library**, add your music folder, e.g. `/media/music`.
6. Search for something and hit download.

## Navidrome URL

Soulbeet must be able to reach Navidrome over the network. Two options:

- **Easiest:** `http://<home-assistant-ip>:<navidrome-port>` (the alexbelgium
  add-on maps port `4533` by default, so e.g. `http://192.168.1.10:4533`).
- **Internal hostname:** all add-ons share the `hassio` Docker network, so you
  can use `http://<navidrome-slug>:4533`. The slug is shown on the Navidrome
  add-on's info page (something like `<hash>_navidrome`). Because that add-on
  comes from a different repository than this one, its hash differs from this
  app's — so the host-IP route above is usually simpler.

## Connecting to slskd

In Soulbeet's **Settings → Config**, set the slskd URL and API key:

- The slskd app's internal address is printed in **this app's log** at startup
  as `Configure Soulbeet's slskd URL as: http://..._slskd:5030`. You can also
  use `http://<home-assistant-ip>:5030` if you mapped slskd's port to the host.
- Soulbeet needs an slskd **API key**. The slskd app runs with authentication
  disabled by default, so add an API key in its config
  (`/addon_configs/..._slskd/slskd.yml`, under `web.authentication.api_keys`)
  and paste the same key into Soulbeet.

## Storage

| Path | Purpose |
|------|---------|
| `/media/slskd/downloads` | Source: completed slskd downloads (set as the Download directory). |
| `/media/music` | Organised library. Point Soulbeet's library folder **and** Navidrome's music folder at the same physical location. |
| `/data` | Soulbeet's SQLite database, persistent `SECRET_KEY`, and beets plugin drop-in. Survives updates and rebuilds. |

The `/media` folder is shared with Home Assistant (visible in the Media
browser) and with the slskd app. For the library to appear in Navidrome, its
music folder must point at the same files as Soulbeet's library folder.

## Beets tiers

This app ships the **full** beets tier: MusicBrainz tagging plus AcoustID
fingerprint matching, cover art, lyrics, genres, ReplayGain and more — all
enabled out of the box. The trade-off is image size (~540 MB vs ~150 MB for the
light tier).

To shrink it, change the first line of the app's `Dockerfile` to
`FROM docccccc/soulbeet:0.6.0-medium` (AcoustID, no art/lyrics) or
`FROM docccccc/soulbeet:0.6.0-light` (MusicBrainz only) and rebuild. The tier is
baked at build time — the extra plugins' binaries and Python packages only exist
in the larger images, so it can't be changed from the Configuration tab.

## Discovery (optional)

To generate playlists from your listening history:

1. Add your **Last.fm API key** and/or **ListenBrainz token** in
   **Settings → Library**, enable discovery on a folder, pick your profiles and
   hit *Generate*.
2. In Navidrome, open **Settings → Players**, find the Soulbeet player and
   enable **Report Real Path** — otherwise rating sync and auto-delete cannot
   resolve file paths.

## Options

- **Navidrome URL** — required; see above.
- **Download directory** — where slskd saves completed downloads
  (default `/media/slskd/downloads`).
- **Album import mode** — import downloads as albums instead of singletons.
- **Timezone** — optional `TZ` name (e.g. `Europe/London`) for log timestamps.

To customise beets further, drop a `beets_config.yaml` into this app's config
folder (`/addon_configs/..._soulbeet/`) with the File editor app or Samba; it is
picked up automatically on the next start.
