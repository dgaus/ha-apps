# Changelog

## 0.1.0

- Configurable pool schedule, slot duration, and week-start day via the add-on **Configuration**
  tab. These settings are now actually applied (previously documented but ignored).
- Sunday is now shown in the weekly grid. `week_starts_on` controls whether the week runs Mon–Sun
  or Sun–Sat.
- Export and import all ratings as JSON, for backups or moving data between add-on instances.
- Existing ratings are re-bucketed when the slot duration changes, so changing it no longer hides
  past data.
- Fixed the weekly grid layout breaking when all seven days are shown.

## 0.0.1

- Initial release.
