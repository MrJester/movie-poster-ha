# Movie Poster for Home Assistant

`movie-poster-ha` is a Plex-powered, full-screen home theater poster display for
Home Assistant. Active Plex playback is shown as **Now Playing**. When the
selected playback ends, the display automatically becomes **Coming Soon** and
rotates movies from a configured Plex library or collection.

## Project status

Pre-alpha integration with Plex setup, automatic Now Playing/Coming Soon state,
and a first full-screen theater panel. Install only for testing.

After configuring the integration, open the display at:

```text
https://<your-home-assistant-host>/movie-poster
```

Open **Configure** on the integration to choose a display layout, decorative
frame, color theme, and orientation. The linked Display Studio previews the
same renderer used by the full-screen panel. Layouts and frames are independent,
so a poster-focused or split-details layout can be combined with any frame:
Marquee, Cyber Noir, Comic Hero, Theater Classic, Indie Nature, Golden Age, or
Steampunk.

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
