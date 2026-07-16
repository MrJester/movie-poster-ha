# Architecture

## System boundary

Movie Poster is a Home Assistant custom integration with a bundled web-component
panel. Home Assistant owns credentials, configuration, orchestration, caching,
and display state. Browsers are authenticated renderers, never Plex clients.

## Core pipeline

1. The Plex adapter fetches sessions, libraries, collections, metadata, and art.
2. Normalizers translate Plex objects into immutable domain models.
3. The playback resolver applies ordered player/user policy deterministically.
4. The state machine handles Now Playing, stop grace, and Coming Soon.
5. The selection engine rotates an eligible library pool without repeats.
6. Home Assistant storage persists the last complete normalized library and
   remaining shuffle cycle for immediate restart recovery.
7. A tracked background task hydrates Plex pages sequentially without delaying
   five-second playback reconciliation.
8. A versioned WebSocket contract publishes state to all displays.
9. An authenticated HTTP view proxies Plex artwork with media-specific URLs.

## Failure behavior

- A failed or interrupted refresh keeps the last complete library active.
- Plex authentication failures flow through Home Assistant reauthentication.
- Background hydration is cancelled when the config entry unloads.
- Wall displays resubscribe after browser visibility and network-online events.
- Artwork URLs are media-specific and marked `no-store` to prevent stale posters.

## Extension model

Layout templates are declarative documents composed from approved components.
Themes are validated design-token documents. Neither may execute arbitrary
JavaScript. Both carry explicit schema versions and can be imported/exported.

## Authentication and discovery

- Zeroconf discovers local Plex Media Servers.
- Plex PIN authentication is the default guided path.
- After approval, the user selects an accessible Plex server.
- A manual server URL and token remain available for advanced/offline installs.
- Tokens are stored only in the Home Assistant config entry.

## Compatibility policy

Each release supports the current stable Home Assistant monthly release and the
two preceding monthly releases. CI tests all three versions. The initial floor
is Home Assistant 2026.5.0 for a 2026.7 development baseline.

## Decisions

See `docs/adr/` for durable architectural decisions and their consequences.
