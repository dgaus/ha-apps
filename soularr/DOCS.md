# Soularr Home Assistant Add-on

[Soularr](https://github.com/mrusse/soularr) connects [Lidarr](https://lidarr.audio/)
with Soulseek: on an interval it reads your wanted albums from Lidarr, searches the
Soulseek network through the slskd add-on, downloads matches, and triggers Lidarr
imports — a hands-off music pipeline.

## Prerequisites

- The **slskd add-on** from this repository, installed, configured, and connected
  to the Soulseek network.
- **Lidarr** running and reachable, e.g. as a Home Assistant add-on on the same
  machine. Lidarr must be able to see slskd's download folder (for add-ons, that
  means it maps `/media` read-write).

## Setup

1. In Lidarr, copy the API key from **Settings → General → Security**.
2. Find your Lidarr hostname on its add-on info page (something like
   `db21ed7f-lidarr`), and set **Lidarr URL** to `http://<hostname>:8686`.
   If Lidarr runs outside Home Assistant, use its IP/port instead.
3. Leave **slskd URL** on `auto` — the add-on locates the slskd add-on through
   the Supervisor.
4. Keep **Download directory** in sync with the slskd add-on's download
   directory (default `/media/slskd/downloads`).
5. Start the add-on and watch the Log tab. Each cycle it logs what it searched
   for and grabbed; set a few albums to *wanted/monitored* in Lidarr to see it work.

## Advanced configuration

Soularr has many more settings than the add-on exposes: search behaviour, release
format preferences, file type priorities, blacklists, and more. Edit them in
`/addon_configs/..._soularr/config.ini` with the File editor add-on (with
*Enforce Basepath* disabled) or via Samba — see the
[upstream config reference](https://github.com/mrusse/soularr/blob/main/config.ini).

The connection settings managed by this add-on are rewritten from the add-on
options on every start — change those in the Configuration tab, not in the file:
`[Lidarr] host_url / api_key / download_dir` and
`[Slskd] host_url / api_key / url_base / download_dir`.

Logs and the failed-import denylist (`failed_imports.json`) live in the same
folder.

## Web UI

Soularr ships a small web UI (config editor + log viewer). It has **no
authentication**, so it is disabled by default and its port unmapped. To use it,
enable the **Web UI** option *and* map port 8265 in the Network section — only do
this on a network you trust, since anyone who can reach the port can read and
edit Soularr's configuration, including API keys.

## Troubleshooting

- **"no installed slskd add-on found"** — install/start the slskd add-on from
  this repository first, or set **slskd URL** manually.
- **Downloads complete but never import** — check that Lidarr can see the
  download folder at the same path (`/media/...`), and look in Lidarr under
  Activity → Queue for import errors. Permission problems show up here: slskd
  writes files as root; if Lidarr runs as a different user and is configured to
  move/delete imports, it may fail — prefer copy-based imports or align
  users/permissions.
- **Nothing is searched** — Soularr only acts on albums that are *monitored* and
  *missing* (or cutoff-unmet) in Lidarr.
