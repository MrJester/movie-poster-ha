"""Stable domain models shared by the Movie Poster backend."""

from __future__ import annotations

from dataclasses import dataclass
from enum import StrEnum


class DisplayMode(StrEnum):
    """Top-level modes exposed to the renderer."""

    COMING_SOON = "coming_soon"
    NOW_PLAYING = "now_playing"
    STARTING = "starting"


class PlaybackState(StrEnum):
    """Normalized Plex playback states."""

    BUFFERING = "buffering"
    PAUSED = "paused"
    PLAYING = "playing"
    STOPPED = "stopped"


@dataclass(frozen=True, slots=True)
class SessionCandidate:
    """A normalized Plex session considered by playback policy."""

    session_id: str
    player_id: str
    player_name: str
    user_id: str
    user_name: str
    state: PlaybackState
    media_type: str


@dataclass(frozen=True, slots=True)
class PlaybackPolicy:
    """Deterministic playback selection policy."""

    player_ids: tuple[str, ...] = ()
    user_ids: tuple[str, ...] = ()
    allow_any: bool = True


@dataclass(frozen=True, slots=True)
class MediaPresentation:
    """Versioned, frontend-safe media representation."""

    key: str
    media_type: str
    title: str
    subtitle: str | None = None
    summary: str | None = None
    year: int | None = None
    duration_ms: int | None = None
    position_ms: int | None = None
    poster_path: str | None = None
    backdrop_path: str | None = None


@dataclass(frozen=True, slots=True)
class DisplayState:
    """Canonical state emitted to every connected display."""

    schema_version: int
    revision: int
    mode: DisplayMode
    heading: str
    media: MediaPresentation | None
