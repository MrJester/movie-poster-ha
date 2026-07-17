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
    presentation_revision = 2
    media = MediaPresentation(
        key="42",
        media_type="movie",
        title="Example",
        content_rating="PG-13",
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
        accent_color="#12cdef",
        background_color="#010203",
        heading_font="condensed",
        body_font="modern",
        now_playing_text="Feature Presentation",
        coming_soon_text="Up Next",
        eyebrow_text="The Jester Theater",
        logo_url="/local/jester-logo.png",
        logo_position="left",
        presentation_revision=presentation_revision,
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
    assert state["operations"]["can_control"] is True
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
        "accent_color": "#12cdef",
        "background_color": "#010203",
        "heading_font": "condensed",
        "body_font": "modern",
        "eyebrow_text": "The Jester Theater",
        "now_playing_text": "Feature Presentation",
        "coming_soon_text": "Up Next",
        "logo_url": "/local/jester-logo.png",
        "logo_position": "left",
    }
    assert state["presentation_revision"] == presentation_revision
    assert state["heading"] == "Feature Presentation"
    assert state["media"]["poster_url"].startswith(
        "/api/movie_poster/artwork/entry-1/poster/42?authSig="
    )
    assert state["session"]["player"] == "Theater"
    assert state["media"]["content_rating"] == "PG-13"
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
        accent_color="#f6cf70",
        background_color="#090706",
        heading_font="cinematic",
        body_font="system",
        now_playing_text="Now Playing",
        coming_soon_text="Coming Soon",
        eyebrow_text="Theater Presentation",
        logo_url="",
        logo_position="right",
        presentation_revision=0,
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
        "accent_color": "#29f2ff",
        "background_color": "#05000d",
        "heading_font": "cinematic",
        "body_font": "modern",
        "now_playing_text": "Now Showing",
        "coming_soon_text": "Coming Attractions",
        "eyebrow_text": "Jester Cinema",
        "logo_url": "/local/logo.svg",
        "logo_position": "center",
    }

    result = _updated_presentation_options(current, updates)

    assert result["library"] == "Movies"
    assert result["rotation_seconds"] == rotation_seconds
    assert result["theme"] == "neon"
    assert result["frame_theme"] == "cyber_noir"
