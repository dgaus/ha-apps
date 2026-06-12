# slskd Home Assistant Add-ons

Run [slskd](https://github.com/slskd/slskd) — a modern web-based client for the
[Soulseek](https://www.slsknet.org/) file sharing network — as a Home Assistant add-on,
with ingress (UI in the sidebar) and downloads/shares in your `/media` folder.
Pair it with [Soularr](https://github.com/mrusse/soularr) to automatically download
your Lidarr wanted list through Soulseek.

## Installation

[![Add repository to my Home Assistant](https://my.home-assistant.io/badges/supervisor_add_addon_repository.svg)](https://my.home-assistant.io/redirect/supervisor_add_addon_repository/?repository_url=https%3A%2F%2Fgithub.com%2Fdgaus%2Fha-addon-slskd)

Or manually: **Settings → Add-ons → Add-on Store → ⋮ → Repositories** and add

```
https://github.com/dgaus/ha-addon-slskd
```

Then install **slskd** from the store, set your Soulseek credentials in the
Configuration tab, and start it. See the add-on's Documentation tab for details
(port forwarding, storage layout, authentication).

## Add-ons

| Add-on | Description |
|--------|-------------|
| [slskd](./slskd) | Client-server application for the Soulseek file sharing network |
| [Soularr](./soularr) | Connects Lidarr with Soulseek — downloads wanted albums via slskd |

## Credits

slskd itself is developed by the [slskd project](https://github.com/slskd/slskd)
(AGPL-3.0) and Soularr by [mrusse](https://github.com/mrusse/soularr) (GPL-3.0);
this repository only packages the official Docker images as Home Assistant
add-ons. The icons are the respective projects' logos.
