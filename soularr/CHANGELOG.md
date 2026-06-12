# Changelog

## 1.2.2.1

- Fix slskd auto-discovery failing with `HTTP Error 403: Forbidden`: derive the
  slskd hostname from this app's own slug instead of listing all add-ons, which
  needs Supervisor permissions apps don't get by default. Also warn instead of
  exiting when slskd isn't reachable yet (e.g. during boot ordering).

## 1.2.2

- Initial release, wrapping upstream [Soularr v1.2.2](https://github.com/mrusse/soularr/releases/tag/v1.2.2).
- Auto-discovers the slskd add-on via the Supervisor API.
- Connection settings managed via add-on options; everything else editable in
  `/addon_configs/..._soularr/config.ini`.
- Web UI off by default (it has no authentication).
