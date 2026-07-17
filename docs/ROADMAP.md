# Roadmap

## Completed beta scope

- Complete Plex PIN authentication, discovery, validation, and reauthentication.
- Discover players, users, libraries, and collections in the options flow.
- Normalize every Plex media type and implement deterministic session priority.
- Implement the playback/stop-grace/Coming Soon state machine.
- Implement shuffle-bag rotation and persistent recent history.

- Register the full-screen panel and live WebSocket subscription.
- Add authenticated artwork proxy, preload, crossfade, and stale-load protection.
- Ship responsive portrait and landscape Classic Cinema templates.
- Add configurable marquee bulbs, metadata panels, and progress display.

- Add a live Display Studio with unified behavioral and presentation settings.
- Ship independent layouts and seven decorative frame presets.
- Add Classic, Art Deco, Neon, Minimal, and OLED themes.
- Persist large-library caches and no-repeat shuffle state across restarts.
- Add native sensors, buttons, services, diagnostics, and reauthentication.

## 1.0 punch-down

- Complete automated browser coverage for responsive layouts, reconnects, and Studio saves.
- Add Home Assistant repairs for Plex connectivity and invalid library/collection selections.
- Finish keyboard, reduced-motion, contrast, and screen-reader accessibility review.
- Add import/export and validation for reusable display profiles.
- Add first-class multiple-display profiles and targeted service controls.
- Add translations beyond English.
- Complete fresh-install and upgrade testing on all three supported Home Assistant releases.
- Publish the first tagged HACS release with final installation and upgrade documentation.

## 0.1 beta hardening — complete

- Persistent normalized Plex library cache and shuffle-cycle recovery.
- Independent sequential large-library hydration with progress telemetry.
- Native sensors, buttons, services, and an auto-hiding operational overlay.
- Browser wake/online resubscription and resilient artwork cache behavior.
- Restart, interrupted-refresh, and large-library regression coverage.
