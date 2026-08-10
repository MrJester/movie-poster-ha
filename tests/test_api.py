"""Tests for the versioned frontend state contract."""

import hashlib
from types import SimpleNamespace

from custom_components.movie_poster.api import (
    _FRONTEND_ELEMENT,
    _FRONTEND_PATH,
    _FRONTEND_VERSION,
    STATIC_URL,
    _async_sync_library_assignment,
    _frontend_module_url,
    _serialize_state,
    _signed_design_assets,
    _updated_presentation_options,
)
from custom_components.movie_poster.const import CONF_DISPLAY_PROFILES
from custom_components.movie_poster.models import (
    DisplayMode,
    MediaPresentation,
    PlaybackState,
    SessionCandidate,
)
from custom_components.movie_poster.state_machine import ModeSnapshot, TransitionReason


def test_frontend_registration_uses_the_asset_content_as_its_cache_key() -> None:
    """Every JavaScript edit produces a new module URL automatically."""
    source = _FRONTEND_PATH.read_bytes()
    digest = hashlib.sha256(source, usedforsecurity=False).hexdigest()[:12]

    assert _frontend_module_url() == (
        f"{STATIC_URL}/movie-poster-panel.js?v={_FRONTEND_VERSION}-{digest}"
    )
    assert f'customElements.define("{_FRONTEND_ELEMENT}"' in source.decode()


def test_design_assets_receive_scoped_signed_urls() -> None:
    """Only assets referenced by the active design receive browser URLs."""
    urls = _signed_design_assets(
        SimpleNamespace(data={}),
        "entry-one",
        "cinema",
        {
            "components": [
                {"asset_ref": "assets/user/curtain.png"},
                {"asset_ref": ""},
                {"asset_ref": "assets/user/curtain.png"},
            ],
        },
        connection_refresh_token_id="refresh-1",  # noqa: S106
    )

    assert set(urls) == {"assets/user/curtain.png"}
    assert urls["assets/user/curtain.png"].startswith(
        "/api/movie_poster/presentation_asset/"
        "entry-one/cinema/assets/user/curtain.png?authSig="
    )


async def test_published_library_profiles_sync_to_live_choices() -> None:
    """Publishing and deleting a library Profile updates live assignments."""
    profile = {"version": 2, "name": "Cinema"}
    initial_revision = 4

    class FakeLibrary:
        async def async_active_profile(self, identifier: str) -> dict:
            assert identifier == "cinema"
            return profile

    updates = []
    hass = SimpleNamespace(
        config_entries=SimpleNamespace(
            async_update_entry=lambda _entry, **changes: updates.append(changes),
        ),
    )
    entry = SimpleNamespace(
        options={
            "library": "Movies",
            CONF_DISPLAY_PROFILES: {"existing": {"name": "Existing"}},
        },
    )
    listener_calls = []
    coordinator = SimpleNamespace(
        presentation_revision=initial_revision,
        async_update_listeners=lambda: listener_calls.append(True),
    )

    await _async_sync_library_assignment(
        hass,
        entry,
        coordinator,
        FakeLibrary(),
        "publish",
        {"profile_id": "cinema"},
    )

    published_options = updates[-1]["options"]
    assert published_options["library"] == "Movies"
    assert published_options[CONF_DISPLAY_PROFILES]["existing"]["name"] == "Existing"
    assert published_options[CONF_DISPLAY_PROFILES]["cinema"] == profile
    assert coordinator.presentation_revision == initial_revision + 1
    assert listener_calls == [True]

    entry.options = published_options
    await _async_sync_library_assignment(
        hass,
        entry,
        coordinator,
        FakeLibrary(),
        "delete",
        {"profile_id": "cinema"},
    )
    assert "cinema" not in updates[-1]["options"][CONF_DISPLAY_PROFILES]
    assert coordinator.presentation_revision == initial_revision + 2


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
    assert state["profile_id"] == "default"
    assert state["health"] == {"connected": True, "message": None}
    assert state["operations"]["can_control"] is True
    assert state["presentation"] == {
        "theme": "neon",
        "show_title": True,
        "show_subtitle": True,
        "show_year": True,
        "show_rating": True,
        "show_runtime": True,
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
    assert state["design_frame"] == {
        "id": "builtin.frame.cyber_noir",
        "version": 1,
        "layers": state["design_frame"]["layers"],
        "safe_opening": {
            "portrait": {"x": 19, "y": 16, "width": 62, "height": 70},
            "landscape": {"x": 15, "y": 19, "width": 70, "height": 64},
        },
        "layout_tuning": {
            "poster_share": 43,
            "gap": 1.6,
            "details_padding": 0.7,
        },
        "motion": {
            "preset": "cyber_scan",
            "speed": 0.8,
            "intensity": 0.85,
            "light_count": 8,
        },
    }
    bezel = next(
        layer
        for layer in state["design_frame"]["layers"]
        if layer["slot"] == "bezel"
    )
    assert bezel == {
        "id": "frame_bezel",
        "name": "Bezel",
        "slot": "bezel",
        "asset": {
            "portrait": (
                "/movie_poster_static/assets/cyber-noir-frame-portrait.png"
            ),
            "landscape": (
                "/movie_poster_static/assets/cyber-noir-frame-landscape.png"
            ),
        },
        "token": "border",
        "z_index": 80,
        "locked": True,
        "opacity": 1,
        "blend_mode": "normal",
    }
    assert state["heading"] == "Feature Presentation"
    assert state["media"]["poster_url"].startswith(
        "/api/movie_poster/artwork/entry-1/poster/42?authSig="
    )
    assert state["session"]["player"] == "Theater"
    assert state["media"]["content_rating"] == "PG-13"
    serialized_state = str(state).casefold()
    assert "x-plex-token" not in serialized_state
    assert "refresh-1" not in serialized_state


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
        "show_title": False,
        "show_subtitle": True,
        "show_year": True,
        "show_rating": False,
        "show_runtime": True,
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
    assert result["show_title"] is False
    assert result["show_rating"] is False
