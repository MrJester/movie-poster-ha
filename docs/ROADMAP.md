# Roadmap

## 0.1 — Functional backend

- Complete Plex PIN authentication, discovery, validation, and reauthentication.
- Discover players, users, libraries, and collections in the options flow.
- Normalize every Plex media type and implement deterministic session priority.
- Implement the playback/stop-grace/Coming Soon state machine.
- Implement shuffle-bag rotation and persistent recent history.

## 0.2 — Theater frontend

- Register the full-screen panel and live WebSocket subscription.
- Add authenticated artwork proxy, preload, crossfade, and stale-load protection.
- Ship responsive portrait and landscape Classic Cinema templates.
- Add configurable marquee bulbs, metadata panels, and progress display.

## 0.3 — Customization

- Versioned layout-template and theme schemas.
- Import/export, validation, preview, and per-display profiles.
- Additional Art Deco, Minimal, Neon, Lobby, and OLED presets.

## 1.0 — HACS release

- Reauthentication, repairs, diagnostics, translations, accessibility, and docs.
- Hassfest, HACS, backend, frontend, and three-version compatibility CI.
- Upgrade and fresh-install testing on supported Home Assistant releases.

## 0.1 beta hardening — complete

- Persistent normalized Plex library cache and shuffle-cycle recovery.
- Independent sequential large-library hydration with progress telemetry.
- Native sensors, buttons, services, and an auto-hiding operational overlay.
- Browser wake/online resubscription and resilient artwork cache behavior.
- Restart, interrupted-refresh, and large-library regression coverage.
