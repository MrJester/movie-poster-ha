"""Translate loosely typed Plex objects into stable Movie Poster models."""

from __future__ import annotations

from typing import Protocol

from .models import MediaPresentation, PlaybackState, SessionCandidate

_PLAYBACK_STATES = {
    "buffering": PlaybackState.BUFFERING,
    "paused": PlaybackState.PAUSED,
    "playing": PlaybackState.PLAYING,
    "stopped": PlaybackState.STOPPED,
}


class PlexSessionLike(Protocol):
    """Minimum attributes required from a Python-PlexAPI session."""

    player: object
    sessionKey: object  # noqa: N815 - PlexAPI's public attribute name
    usernames: list[str]


def normalize_session(
    session: PlexSessionLike,
) -> tuple[SessionCandidate, MediaPresentation]:
    """Normalize one Python-PlexAPI session without account lookups."""
    player = session.player
    username = _first(getattr(session, "usernames", []), "Unknown")
    player_id = _text(player, "machineIdentifier", "unknown-player")
    state = _PLAYBACK_STATES.get(
        str(getattr(player, "state", "stopped")).lower(), PlaybackState.STOPPED
    )
    media_type = _text(session, "type", session.__class__.__name__.lower())
    poster_path, backdrop_path = _session_artwork(session, media_type)
    session_key = str(session.sessionKey)
    rating_key = _text(session, "ratingKey", session_key)
    candidate = SessionCandidate(
        session_id=session_key,
        player_id=player_id,
        player_name=_text(player, "title", player_id),
        user_id=username.casefold(),
        user_name=username,
        state=state,
        media_type=media_type,
    )
    presentation = MediaPresentation(
        key=rating_key,
        media_type=media_type,
        title=_session_title(session, media_type),
        subtitle=_subtitle(session, media_type),
        summary=getattr(session, "summary", None),
        year=getattr(session, "year", None),
        content_rating=getattr(session, "contentRating", None),
        duration_ms=getattr(session, "duration", None),
        position_ms=getattr(session, "viewOffset", None),
        poster_path=poster_path,
        backdrop_path=backdrop_path,
    )
    return candidate, presentation


def normalize_movie(movie: object) -> MediaPresentation:
    """Normalize a Plex movie for Coming Soon rotation."""
    return MediaPresentation(
        key=_text(movie, "ratingKey", _text(movie, "key", "unknown")),
        media_type="movie",
        title=_text(movie, "title", "Unknown title"),
        subtitle=getattr(movie, "tagline", None),
        summary=getattr(movie, "summary", None),
        year=getattr(movie, "year", None),
        content_rating=getattr(movie, "contentRating", None),
        duration_ms=getattr(movie, "duration", None),
        poster_path=getattr(movie, "thumb", None),
        backdrop_path=getattr(movie, "art", None),
    )


def _subtitle(session: object, media_type: str) -> str | None:
    if media_type == "episode":
        season = getattr(session, "parentIndex", None)
        episode = getattr(session, "index", None)
        number = (
            f"S{season:02d}E{episode:02d}"
            if isinstance(season, int) and isinstance(episode, int)
            else None
        )
        episode_title = getattr(session, "title", None)
        return " · ".join(value for value in (number, episode_title) if value) or None
    if media_type == "track":
        return getattr(session, "grandparentTitle", None)
    return getattr(session, "tagline", None)


def _session_title(session: object, media_type: str) -> str:
    """Use the series as an episode's primary display title."""
    if media_type == "episode":
        return _text(
            session,
            "grandparentTitle",
            _text(session, "title", "Unknown title"),
        )
    return _text(session, "title", "Unknown title")


def _session_artwork(session: object, media_type: str) -> tuple[str | None, str | None]:
    """Choose poster-shaped artwork appropriate for the playing media."""
    if media_type == "episode":
        return (
            _first_attribute(session, "grandparentThumb", "parentThumb", "thumb"),
            _first_attribute(session, "grandparentArt", "art"),
        )
    return _first_attribute(session, "thumb"), _first_attribute(session, "art")


def _first_attribute(value: object, *attributes: str) -> str | None:
    """Return the first populated attribute as text."""
    for attribute in attributes:
        result = getattr(value, attribute, None)
        if result:
            return str(result)
    return None


def _text(value: object, attribute: str, default: str) -> str:
    result = getattr(value, attribute, None)
    return str(result) if result is not None else default


def _first(values: list[str], default: str) -> str:
    return values[0] if values else default
