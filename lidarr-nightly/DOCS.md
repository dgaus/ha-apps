# Lidarr (nightly + plugins) Home Assistant App

This app runs [Lidarr](https://lidarr.audio/) on its **nightly** branch, which is the only
branch that supports plugins. Use it when you want a Lidarr plugin that isn't available on the
stable branch.

> ⚠️ **One-way upgrade.** The nightly branch migrates its database forward and you cannot
> move a nightly database back to the stable (`master`) branch without restoring a backup
> taken *before* the switch. This app is a **fresh** Lidarr instance, so it won't touch any
> existing Lidarr you run — keep that one as your fallback.

## Access

There is **no sidebar entry** for this app (see *Why no ingress* below). Open Lidarr directly:

```
http://<your-home-assistant-host>:8686
```

On first launch the nightly branch requires you to configure authentication. Choose
**Forms (Login Page)** and create a username/password — this is your only login wall, so don't
skip it.

## Installing plugins

1. In Lidarr go to **System → Plugins** (`/system/plugins`).
2. Paste the plugin's GitHub repository URL and select **Install**.
3. A restart isn't required — the plugin's options appear under Settings.

Available plugins are listed on the [Servarr wiki](https://wiki.servarr.com/lidarr/plugins).
Installed plugins are stored in Lidarr's data directory (`/config/plugins`), which this app
keeps on a persistent volume, so they survive restarts and updates.

## Storage

| Path | Purpose |
|------|---------|
| `/addon_configs/..._lidarr-nightly` (`/config` inside the app) | Lidarr database, `config.xml`, and installed plugins. Survives updates and rebuilds. |
| `/media` | Your music library and any download directories, so Lidarr can import completed grabs. |

The app runs as **root** (`PUID`/`PGID` = 0) on purpose: this lets Lidarr read and import
files written by other apps under `/media` (e.g. a download client) without permission
friction. Change `PUID`/`PGID` in the app configuration if you need a specific user.

## Why no ingress (no sidebar icon)

Lidarr only stores its reverse-proxy base path in `config.xml`, with no environment override.
Serving it reliably under Home Assistant's ingress path would require fragile runtime surgery
on that file. The official Home Assistant community Lidarr add-on skips ingress for exactly
this reason, and so does this app. Access is via port 8686 with Lidarr's own login.
