# Changelog

## 1.0.0

- Initial release, wrapping the [linuxserver](https://docs.linuxserver.io/images/docker-lidarr/)
  Lidarr **nightly** image, which carries the plugin support merged into Lidarr's nightly
  branch.
- Enables a native [slskd plugin](https://wiki.servarr.com/lidarr/plugins): slskd becomes a
  Lidarr indexer + download client, replacing the Soularr polling loop.
- Web UI on port 8686 (no ingress — see the docs for why). Runs as root (`PUID`/`PGID` 0)
  so it can import slskd's downloads under `/media`.
- Lidarr state (database, installed plugins) persists in the add-on configuration folder.
