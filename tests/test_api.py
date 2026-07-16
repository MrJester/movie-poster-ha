"""Tests for the versioned frontend state contract."""

from types import SimpleNamespace

from custom_components.movie_poster.api import (
    _serialize_state,
    _updated_presentation_options,
)
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
        theme="neon",
        show_summary=False,
        show_progress=True,
        show_session=False,
        enable_motion=False,
        kiosk_mode=True,
        orientation="portrait",
        layout="poster",
        frame_theme="cyber_noir",
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
    assert state["entry_id"] == "entry-1"
    assert state["health"] == {"connected": True, "message": None}
    assert state["presentation"] == {
        "theme": "neon",
        "show_summary": False,
        "show_progress": True,
        "show_session": False,
        "enable_motion": False,
        "kiosk_mode": True,
        "orientation": "portrait",
        "layout": "poster",
        "frame_theme": "cyber_noir",
    }
    assert state["heading"] == "Now Playing"
    assert state["media"]["poster_url"].startswith(
        "/api/movie_poster/artwork/entry-1/poster?authSig="
    )
    assert state["session"]["player"] == "Theater"
    assert "token" not in str(state).casefold()


def test_state_contract_reports_plex_outage_without_exposing_exception() -> None:
    """The renderer gets actionable health without internal connection details."""
    coordinator = SimpleNamespace(
        entry_id="entry-1",
        theme="classic",
        show_summary=True,
        show_progress=True,
        show_session=True,
        enable_motion=True,
        kiosk_mode=True,
        orientation="auto",
        layout="cinematic",
        frame_theme="marquee",
        last_update_success=False,
        last_exception=RuntimeError("secret internal detail"),
        data=SimpleNamespace(
            mode=ModeSnapshot(
                mode=DisplayMode.COMING_SOON,
                grace_deadline=None,
                reason=TransitionReason.STARTUP_IDLE,
            ),
            media=None,
            selected_session=None,
        ),
    )

    state = _serialize_state(
        SimpleNamespace(data={}),
        coordinator,
        refresh_token_id=None,
    )

    assert state["health"]["connected"] is False
    assert "Retrying automatically" in state["health"]["message"]
    assert "secret internal detail" not in str(state)


def test_studio_save_preserves_behavior_options() -> None:
    """Display Studio updates visuals without replacing Plex behavior."""
    rotation_seconds = 30
    current = {
        "library": "Movies",
        "rotation_seconds": rotation_seconds,
        "theme": "classic",
    }
    updates = {
        "theme": "neon",
        "orientation": "landscape",
        "layout": "split",
        "frame_theme": "cyber_noir",
        "show_summary": False,
        "show_progress": True,
        "show_session": False,
        "enable_motion": True,
        "kiosk_mode": True,
    }

    result = _updated_presentation_options(current, updates)

    assert result["library"] == "Movies"
    assert result["rotation_seconds"] == rotation_seconds
    assert result["theme"] == "neon"
    assert result["frame_theme"] == "cyber_noir"
