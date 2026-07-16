# Movie Poster for Home Assistant

`movie-poster-ha` is a Plex-powered, full-screen home theater poster display for
Home Assistant. Active Plex playback is shown as **Now Playing**. When the
selected playback ends, the display automatically becomes **Coming Soon** and
rotates movies from a configured Plex library or collection.

## Project status

Architecture and initial integration scaffold. It is not ready for production
installation yet.

## Product principles

- One HACS installation for the Home Assistant backend and bundled frontend.
- Plex credentials remain in Home Assistant and are never exposed to a kiosk.
- Deterministic selection when multiple Plex sessions are active.
- Declarative, validated layout templates and themes.
- Event-driven display updates with polling only for reconciliation.
- Current Home Assistant stable release and the previous two monthly releases.

See [Architecture](docs/ARCHITECTURE.md) and the [roadmap](docs/ROADMAP.md).

## Development

Development requires Python 3.13, matching the supported Home Assistant runtime.

```bash
python3.13 -m venv .venv
. .venv/bin/activate
pip install -e '.[test]'
pytest
ruff check .
```

Copyright 2026 MrJester. Licensed under the MIT License.
