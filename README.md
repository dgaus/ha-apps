# Home Assistant Apps: slskd, Soularr, SoulSync & Soulbeet

Run [slskd](https://github.com/slskd/slskd) — a modern web-based client for the
[Soulseek](https://www.slsknet.org/) file sharing network — as a Home Assistant app
(formerly known as add-ons), with ingress (UI in the sidebar) and downloads/shares
in your `/media` folder. Pair it with [Soularr](https://github.com/mrusse/soularr)
to automatically download your Lidarr wanted list through Soulseek.

## Installation

[![Add repository to my Home Assistant](https://my.home-assistant.io/badges/supervisor_add_addon_repository.svg)](https://my.home-assistant.io/redirect/supervisor_add_addon_repository/?repository_url=https%3A%2F%2Fgithub.com%2Fdgaus%2Fha-apps)

Or manually: **Settings → Apps → App Store → ⋮ → Repositories** (on older Home
Assistant versions: **Settings → Add-ons → Add-on Store**) and add

```
https://github.com/dgaus/ha-apps
```

Then install **slskd** from the store, set your Soulseek credentials in the
Configuration tab, and start it. See each app's Documentation tab for details
(port forwarding, storage layout, authentication).

## Apps

| App | Description |
|-----|-------------|
| [slskd](./slskd) | Client-server application for the Soulseek file sharing network |
| [Soularr](./soularr) | Connects Lidarr with Soulseek — downloads wanted albums via slskd |
| [SoulSync](./soulsync) | Spotify/Plex/Jellyfin music discovery — downloads via slskd and other sources |
| [Soulbeet](./soulbeet) | Soulseek → beets → Navidrome downloader, library manager and discovery engine |
| [Swim Times](./swim-times) | Track pool occupancy and find the best times to swim |

## Credits

slskd itself is developed by the [slskd project](https://github.com/slskd/slskd)
(AGPL-3.0), Soularr by [mrusse](https://github.com/mrusse/soularr) (GPL-3.0),
SoulSync by [Nezreka](https://github.com/Nezreka/SoulSync), and Soulbeet by
[terry90](https://github.com/terry90/soulbeet); this repository only packages the
official Docker images as Home Assistant apps. The icons are the respective
projects' logos.
