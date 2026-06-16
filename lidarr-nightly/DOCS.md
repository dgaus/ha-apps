# Lidarr (nightly + plugins) Home Assistant App

This app runs [Lidarr](https://lidarr.audio/) on its **nightly** branch, which is the only
branch that supports plugins. Its purpose is to enable a native
[slskd plugin](https://wiki.servarr.com/lidarr/plugins), which turns slskd into a
Lidarr **indexer + download client** — a cleaner alternative to the Soularr app, which polls
Lidarr's wanted list from the outside.

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

## Installing the slskd plugin

There are a few community slskd plugins for Lidarr; the current options are listed on the
[Servarr wiki](https://wiki.servarr.com/lidarr/plugins). Pick one, then:

1. In Lidarr go to **System → Plugins** (`/system/plugins`).
2. Paste that plugin's GitHub repository URL and select **Install**.
3. After it installs, restart isn't required — the new options appear under Settings.

The installed plugin is stored in Lidarr's data directory (`/config/plugins`), which this app
keeps on a persistent volume, so it survives restarts and updates.

## Wiring up slskd

You need the slskd app from this repository running. Configure two things in Lidarr:

**Download client** — Settings → Download Clients (`/settings/downloadclients`) → **+** →
choose **Slskd** (under *Other*):
- **Host / URL**: the in-cluster hostname of the slskd app, `http://<prefix>-slskd:5030`,
  where `<prefix>` is the slug prefix the Supervisor assigns this repository (the same prefix
  appears in this app's own slug — e.g. if this app is `a1b2c3d4_lidarr-nightly`, slskd is at
  `http://a1b2c3d4-slskd:5030`). You can also use the slskd app's IP and mapped port.
- **API key**: slskd has no auth by default. If you set an API key in
  `/addon_configs/..._slskd/slskd.yml`, enter it here.
- **Test**, then **Save**.

**Indexer** — Settings → Indexers (`/settings/indexers`) → **+** → choose **Slskd**:
- Same URL and API key as above.
- Add your Soulseek username under **Ignored Users** (Value = your username, Key = `0`) so
  the plugin doesn't try to download from yourself.
- **Test**, then **Save**.

**Delay profile** — Settings → Profiles → Delay Profiles: edit your profile (wrench icon),
set the protocol to **Slskd**, and save.

## Storage

| Path | Purpose |
|------|---------|
| `/addon_configs/..._lidarr-nightly` (`/config` inside the app) | Lidarr database, `config.xml`, and installed plugins. Survives updates and rebuilds. |
| `/media` | Your music library and slskd's downloads (default `/media/slskd/downloads`), so Lidarr can import completed grabs. |

The app runs as **root** (`PUID`/`PGID` = 0) on purpose: the slskd app also runs as root and
writes downloads root-owned, so Lidarr can hardlink/move them without permission errors.

## Why no ingress (no sidebar icon)

Unlike slskd — which has a native `SLSKD_URL_BASE` setting — Lidarr only stores its
reverse-proxy base path in `config.xml`, with no environment override. Serving it reliably
under Home Assistant's ingress path would require fragile runtime surgery on that file. The
official Home Assistant community Lidarr add-on skips ingress for exactly this reason, and so
does this app. Access is via port 8686 with Lidarr's own login.

## Relationship to the Soularr app

This app **replaces** Soularr's job. Don't point both at the same Lidarr — pick one:

- **Soularr**: keeps Lidarr on the stable branch; a separate process reads the wanted list and
  drives slskd on an interval.
- **This app (slskd plugin)**: slskd is a native indexer/download client inside Lidarr;
  searches and grabs happen through Lidarr's normal flow, no external loop.
