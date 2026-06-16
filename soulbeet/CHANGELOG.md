# Changelog

## 0.6.0

- Initial release, wrapping upstream [Soulbeet 0.6.0](https://github.com/terry90/soulbeet) (full tier: MusicBrainz, AcoustID, cover art, lyrics, genres, ReplayGain).
- Web UI on port 9765; log in with your Navidrome credentials.
- Pairs with the slskd app for downloads and your Navidrome server for streaming.
- Downloads under `/media/slskd/downloads` and the organised library under `/media` (shared with slskd and Navidrome).
- Python entrypoint (the upstream image is distroless) that passes the Navidrome URL and other options through, persists a `SECRET_KEY` in `/data`, and logs the sibling slskd app's internal address.
