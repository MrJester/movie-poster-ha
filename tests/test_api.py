"""Tests for the versioned frontend state contract."""

from types import SimpleNamespace

from custom_components.movie_poster.api import _serialize_state
from custom_components.movie_poster.models import (
    DisplayMode,
    MediaPresentation,
    PlaybackState,
    SessionCandidate,
)
from custom_components.movie_poster.state_machine import ModeSnapshot, TransitionReason


def test_state_contract_contains_signed_artwork_and_session() -> None:
    """Frontend state is normalized, versioned, and keeps Plex tokens server-side."""
    media = MediaPresentation(
        key="42",
        media_type="movie",
        title="Example",
        poster_path="/library/metadata/42/thumb",
    )
    session = SessionCandidate(
        session_id="session-1",
        player_id="player-1",
        player_name="Theater",
        user_id="ryan",
        user_name="Ryan",
        state=PlaybackState.PLAYING,
        media_type="movie",
    )
    coordinator = SimpleNamespace(
        entry_id="entry-1",
        data=SimpleNamespace(
            mode=ModeSnapshot(
                mode=DisplayMode.NOW_PLAYING,
                grace_deadline=None,
                reason=TransitionReason.PLAYBACK_STARTED,
            ),
            media=media,
            selected_session=session,
        ),
    )
    hass = SimpleNamespace(data={})

    state = _serialize_state(
        hass, coordinator, refresh_token_id="refresh-1"  # noqa: S106
    )

    assert state["schema_version"] == 1
    assert state["heading"] == "Now Playing"
    assert state["media"]["poster_url"].startswith(
        "/api/movie_poster/artwork/entry-1/poster?authSig="
    )
    assert state["session"]["player"] == "Theater"
    assert "token" not in str(state).casefold()
