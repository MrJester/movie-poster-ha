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
Steampunk. Display Studio also saves heading and body fonts, accent and background
colors, and custom wording for Now Playing, Coming Soon, and the marquee label.
An optional theater logo can be loaded from an HTTPS URL or Home Assistant's
`/local/` directory and placed at the top left, center, or right.
Saved presentation changes are broadcast to open poster panels, which reconnect
automatically after the integration reloads.

Native Home Assistant sensors report the display mode, current title, loaded
movie count, and posters remaining in the shuffle cycle. Dashboard buttons and
the `movie_poster.next_poster`, `movie_poster.refresh_library`, and
`movie_poster.reset_shuffle` services provide automation-friendly controls.

## Product principles

- One HACS installation for the Home Assistant backend and bundled frontend.
- Plex credentials remain in Home Assistant and are never exposed to a kiosk.
- Deterministic selection when multiple Plex sessions are active.
- Declarative, validated layout templates and themes.
- Event-driven display updates with polling only for reconciliation.
- Current Home Assistant stable release and the previous two monthly releases.

See [Architecture](docs/ARCHITECTURE.md) and the [roadmap](docs/ROADMAP.md).

## Development

Development requires Python 3.14.2, matching the supported Home Assistant runtime.

```bash
python3.14 -m venv .venv
. .venv/bin/activate
pip install -e '.[test]'
pytest
ruff check .
```

Copyright 2026 MrJester. Licensed under the MIT License.
