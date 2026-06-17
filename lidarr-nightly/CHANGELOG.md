# Changelog

## 1.0.1

- Documentation only: reworded the description and docs to be plugin-agnostic. The add-on
  ships nightly Lidarr with plugin support; which plugins to install is left entirely to you
  (System → Plugins). No functional change.

## 1.0.0

- Initial release, wrapping the [linuxserver](https://docs.linuxserver.io/images/docker-lidarr/)
  Lidarr **nightly** image, which carries the plugin support merged into Lidarr's nightly
  branch. Install plugins from within Lidarr (System → Plugins).
- Web UI on port 8686 (no ingress — see the docs for why). Runs as root (`PUID`/`PGID` 0)
  so it can import files written by other apps under `/media` without permission friction.
- Lidarr state (database, installed plugins) persists in the add-on configuration folder.
