# Swim Times Home Assistant App

Track how crowded your pool is and find the best times to swim. Rate each time slot from
1 (Empty) to 5 (Full); Swim Times builds a weekly heatmap and per-day stats so you can plan
around the crowds.

## Access

Open it from the **sidebar** — the app runs behind Home Assistant ingress, so there's no port to
forward or extra login.

## Usage

- Click a slot in the weekly grid and pick a rating from 1 (Empty) to 5 (Full). The heatmap updates
  immediately (green = quiet, red = busy).
- **Track right now** records the current slot without picking one manually.
- The stat cards show today's quiet time, busy time, and average occupancy.
- Striped cells mark times the pool is closed.

## Configuration

Set these in the **Configuration** tab:

| Option | Default | Description |
|--------|---------|-------------|
| `schedule` | Mon–Fri 08:00–22:00, Sat 09:00–20:00, Sun 09:00–17:00 | Per-day `open`/`close` times. Leave a day blank to mark it closed. |
| `slot_duration_minutes` | `30` | Length of each time slot. |
| `week_starts_on` | `monday` | `monday` shows Sunday last (Mon→Sun); `sunday` shows it first (Sun→Sat). |

Changes take effect when the app restarts. Existing ratings are re-bucketed into the new slots, so
changing the slot duration never loses past data.

## Data

Ratings are stored as a single JSON file at `/data/swim_db.json`, which persists across restarts and
updates. The server self-heals a missing or corrupt file (corrupt files are backed up first).

Use **Export data** to download all ratings as JSON (backups), and **Import data** to load them back
in — for example when moving from another instance. Import merges by record id, so re-importing the
same file won't create duplicates.
