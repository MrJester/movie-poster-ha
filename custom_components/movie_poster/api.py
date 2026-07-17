"""Frontend registration and authenticated APIs for Movie Poster."""

from __future__ import annotations

from datetime import timedelta
from pathlib import Path
from typing import TYPE_CHECKING, Any

import voluptuous as vol
from aiohttp import web
from homeassistant.components import panel_custom, websocket_api
from homeassistant.components.http import HomeAssistantView, StaticPathConfig
from homeassistant.components.http.auth import async_sign_path
from homeassistant.core import callback

from .const import (
    CONF_ACCENT_COLOR,
    CONF_BACKGROUND_COLOR,
    CONF_BODY_FONT,
    CONF_COLLECTION,
    CONF_COMING_SOON_TEXT,
    CONF_ENABLE_MOTION,
    CONF_EYEBROW_TEXT,
    CONF_FRAME_THEME,
    CONF_GRACE_SECONDS,
    CONF_HEADING_FONT,
    CONF_KIOSK_MODE,
    CONF_LAYOUT,
    CONF_LIBRARY,
    CONF_LIBRARY_REFRESH_SECONDS,
    CONF_LOGO_POSITION,
    CONF_LOGO_URL,
    CONF_NOW_PLAYING_TEXT,
    CONF_ORIENTATION,
    CONF_PLAYER_ID,
    CONF_ROTATION_SECONDS,
    CONF_SHOW_PROGRESS,
    CONF_SHOW_SESSION,
    CONF_SHOW_SUMMARY,
    CONF_THEME,
    CONF_USER_ID,
    DEFAULT_GRACE_SECONDS,
    DEFAULT_LIBRARY_REFRESH_SECONDS,
    DEFAULT_ROTATION_SECONDS,
    DOMAIN,
    FONTS,
    FRAME_THEMES,
    LAYOUTS,
    LOGO_POSITIONS,
    ORIENTATIONS,
    THEMES,
)

if TYPE_CHECKING:
    from homeassistant.core import HomeAssistant

    from .coordinator import CoordinatorData, MoviePosterCoordinator

PANEL_URL = "movie-poster"
STATIC_URL = "/movie_poster_static"
_ARTWORK_EXPIRATION = timedelta(hours=24)
_FRONTEND_VERSION = "0.1.0-beta.20"


async def async_setup_frontend(hass: HomeAssistant) -> None:
    """Register static assets, panel, HTTP view, and WebSocket commands."""
    frontend_dir = Path(__file__).parent / "frontend"
    await hass.http.async_register_static_paths(
        [StaticPathConfig(STATIC_URL, str(frontend_dir), cache_headers=False)]
    )
    await panel_custom.async_register_panel(
        hass,
        frontend_url_path=PANEL_URL,
        webcomponent_name="movie-poster-panel",
        sidebar_title="Movie Poster",
        sidebar_icon="mdi:movie-open-star",
        module_url=f"{STATIC_URL}/movie-poster-panel.js?v={_FRONTEND_VERSION}",
        require_admin=False,
    )
    hass.http.register_view(MoviePosterArtworkView())
    websocket_api.async_register_command(hass, websocket_subscribe)
    websocket_api.async_register_command(hass, websocket_update_presentation)
    websocket_api.async_register_command(hass, websocket_get_settings)
    websocket_api.async_register_command(hass, websocket_update_settings)
    websocket_api.async_register_command(hass, websocket_display_control)


@websocket_api.websocket_command(
    {
        vol.Required("type"): "movie_poster/subscribe",
        vol.Optional("entry_id"): str,
    }
)
@callback
def websocket_subscribe(
    hass: HomeAssistant,
    connection: websocket_api.ActiveConnection,
    msg: dict[str, Any],
) -> None:
    """Subscribe a panel to normalized display-state changes."""
    coordinator = _coordinator(hass, msg.get("entry_id"))
    if coordinator is None:
        connection.send_error(
            msg["id"], websocket_api.ERR_NOT_FOUND, "Movie Poster is not configured"
        )
        return

    @callback
    def send_state() -> None:
        connection.send_message(
            websocket_api.event_message(
                msg["id"],
                _serialize_state(
                    hass,
                    coordinator,
                    refresh_token_id=connection.refresh_token_id,
                    can_control=connection.user.is_admin,
                ),
            )
        )

    connection.subscriptions[msg["id"]] = coordinator.async_add_listener(send_state)
    connection.send_result(msg["id"])
    send_state()


@websocket_api.require_admin
@websocket_api.websocket_command(
    {
        vol.Required("type"): "movie_poster/update_presentation",
        vol.Optional("entry_id"): str,
        vol.Required(CONF_THEME): vol.In(THEMES),
        vol.Required(CONF_ORIENTATION): vol.In(ORIENTATIONS),
        vol.Required(CONF_LAYOUT): vol.In(LAYOUTS),
        vol.Required(CONF_FRAME_THEME): vol.In(FRAME_THEMES),
        vol.Required(CONF_SHOW_SUMMARY): bool,
        vol.Required(CONF_SHOW_PROGRESS): bool,
        vol.Required(CONF_SHOW_SESSION): bool,
        vol.Required(CONF_ENABLE_MOTION): bool,
        vol.Required(CONF_KIOSK_MODE): bool,
        vol.Required(CONF_ACCENT_COLOR): vol.Match(r"^#[0-9a-fA-F]{6}$"),
        vol.Required(CONF_BACKGROUND_COLOR): vol.Match(r"^#[0-9a-fA-F]{6}$"),
        vol.Required(CONF_HEADING_FONT): vol.In(FONTS),
        vol.Required(CONF_BODY_FONT): vol.In(FONTS),
        vol.Required(CONF_NOW_PLAYING_TEXT): vol.All(
            str, vol.Length(min=1, max=60)
        ),
        vol.Required(CONF_COMING_SOON_TEXT): vol.All(
            str, vol.Length(min=1, max=60)
        ),
        vol.Required(CONF_EYEBROW_TEXT): vol.All(str, vol.Length(min=1, max=80)),
        vol.Required(CONF_LOGO_URL): vol.All(str, vol.Length(max=500)),
        vol.Required(CONF_LOGO_POSITION): vol.In(LOGO_POSITIONS),
    }
)
@websocket_api.async_response
async def websocket_update_presentation(
    hass: HomeAssistant,
    connection: websocket_api.ActiveConnection,
    msg: dict[str, Any],
) -> None:
    """Persist Display Studio presentation settings."""
    coordinator = _coordinator(hass, msg.get("entry_id"))
    entry = (
        hass.config_entries.async_get_entry(coordinator.entry_id)
        if coordinator is not None
        else None
    )
    if entry is None:
        connection.send_error(
            msg["id"], websocket_api.ERR_NOT_FOUND, "Movie Poster is not configured"
        )
        return
    options = _updated_presentation_options(entry.options, msg)
    for key in _PRESENTATION_KEYS:
        setattr(coordinator, key, options[key])
    coordinator.presentation_revision += 1
    coordinator.async_update_listeners()
    hass.config_entries.async_update_entry(entry, options=options)
    connection.send_result(msg["id"], {"entry_id": entry.entry_id})


@websocket_api.require_admin
@websocket_api.websocket_command(
    {
        vol.Required("type"): "movie_poster/get_settings",
        vol.Optional("entry_id"): str,
    }
)
@websocket_api.async_response
async def websocket_get_settings(
    hass: HomeAssistant,
    connection: websocket_api.ActiveConnection,
    msg: dict[str, Any],
) -> None:
    """Return current settings and Plex-backed Studio choices."""
    coordinator = _coordinator(hass, msg.get("entry_id"))
    entry = (
        hass.config_entries.async_get_entry(coordinator.entry_id)
        if coordinator is not None
        else None
    )
    if coordinator is None or entry is None:
        connection.send_error(
            msg["id"], websocket_api.ERR_NOT_FOUND, "Movie Poster is not configured"
        )
        return
    try:
        libraries = await coordinator._client.async_movie_libraries()  # noqa: SLF001
        sessions = [candidate for candidate, _media in await coordinator._client.async_sessions()]  # noqa: E501, SLF001
    except Exception:  # noqa: BLE001 - Plex discovery is optional in Studio
        libraries = []
        sessions = []

    sources = [
        {"value": f"{library.title}::", "label": f"{library.title} — All movies"}
        for library in libraries
    ]
    for library in libraries:
        sources.extend(
            {"value": f"{library.title}::{name}", "label": f"{library.title} — {name}"}
            for name in library.collections
        )
    current_source = (
        f"{entry.options.get(CONF_LIBRARY, '')}::"
        f"{entry.options.get(CONF_COLLECTION, '') or ''}"
    )
    source_values = {choice["value"] for choice in sources}
    if current_source not in source_values:
        current_source = sources[0]["value"] if sources else current_source
    players = {session.player_id: session.player_name for session in sessions}
    users = {session.user_id: session.user_name for session in sessions}
    selected_player = entry.options.get(CONF_PLAYER_ID, "")
    selected_user = entry.options.get(CONF_USER_ID, "")
    if selected_player and selected_player not in players:
        players[selected_player] = f"Previously selected ({selected_player})"
    if selected_user and selected_user not in users:
        users[selected_user] = f"Previously selected ({selected_user})"
    connection.send_result(
        msg["id"],
        {
            "settings": {
                **entry.options,
                "source": current_source,
                CONF_PLAYER_ID: selected_player,
                CONF_USER_ID: selected_user,
                CONF_GRACE_SECONDS: entry.options.get(
                    CONF_GRACE_SECONDS, DEFAULT_GRACE_SECONDS
                ),
                CONF_ROTATION_SECONDS: entry.options.get(
                    CONF_ROTATION_SECONDS, DEFAULT_ROTATION_SECONDS
                ),
                CONF_LIBRARY_REFRESH_SECONDS: entry.options.get(
                    CONF_LIBRARY_REFRESH_SECONDS, DEFAULT_LIBRARY_REFRESH_SECONDS
                ),
            },
            "choices": {
                "sources": sources,
                "players": [
                    {"value": "", "label": "Any active Plex player"},
                    *[
                        {"value": value, "label": label}
                        for value, label in sorted(
                            players.items(), key=lambda item: item[1].casefold()
                        )
                    ],
                ],
                "users": [
                    {"value": "", "label": "Any active Plex user"},
                    *[
                        {"value": value, "label": label}
                        for value, label in sorted(
                            users.items(), key=lambda item: item[1].casefold()
                        )
                    ],
                ],
            },
        },
    )


_BEHAVIOR_SCHEMA = {
    vol.Required("source"): str,
    vol.Optional(CONF_PLAYER_ID, default=""): str,
    vol.Optional(CONF_USER_ID, default=""): str,
    vol.Required(CONF_GRACE_SECONDS): vol.All(
        vol.Coerce(int), vol.Range(min=0, max=600)
    ),
    vol.Required(CONF_ROTATION_SECONDS): vol.All(
        vol.Coerce(int), vol.Range(min=2, max=3600)
    ),
    vol.Required(CONF_LIBRARY_REFRESH_SECONDS): vol.All(
        vol.Coerce(int), vol.Range(min=60, max=86400)
    ),
}


@websocket_api.require_admin
@websocket_api.websocket_command(
    {
        vol.Required("type"): "movie_poster/update_settings",
        vol.Optional("entry_id"): str,
        **_BEHAVIOR_SCHEMA,
        vol.Required(CONF_THEME): vol.In(THEMES),
        vol.Required(CONF_ORIENTATION): vol.In(ORIENTATIONS),
        vol.Required(CONF_LAYOUT): vol.In(LAYOUTS),
        vol.Required(CONF_FRAME_THEME): vol.In(FRAME_THEMES),
        vol.Required(CONF_SHOW_SUMMARY): bool,
        vol.Required(CONF_SHOW_PROGRESS): bool,
        vol.Required(CONF_SHOW_SESSION): bool,
        vol.Required(CONF_ENABLE_MOTION): bool,
        vol.Required(CONF_KIOSK_MODE): bool,
        vol.Required(CONF_ACCENT_COLOR): vol.Match(r"^#[0-9a-fA-F]{6}$"),
        vol.Required(CONF_BACKGROUND_COLOR): vol.Match(r"^#[0-9a-fA-F]{6}$"),
        vol.Required(CONF_HEADING_FONT): vol.In(FONTS),
        vol.Required(CONF_BODY_FONT): vol.In(FONTS),
        vol.Required(CONF_NOW_PLAYING_TEXT): vol.All(str, vol.Length(min=1, max=60)),
        vol.Required(CONF_COMING_SOON_TEXT): vol.All(str, vol.Length(min=1, max=60)),
        vol.Required(CONF_EYEBROW_TEXT): vol.All(str, vol.Length(min=1, max=80)),
        vol.Required(CONF_LOGO_URL): vol.All(str, vol.Length(max=500)),
        vol.Required(CONF_LOGO_POSITION): vol.In(LOGO_POSITIONS),
    }
)
@websocket_api.async_response
async def websocket_update_settings(
    hass: HomeAssistant,
    connection: websocket_api.ActiveConnection,
    msg: dict[str, Any],
) -> None:
    """Persist the complete Display Studio configuration."""
    coordinator = _coordinator(hass, msg.get("entry_id"))
    entry = (
        hass.config_entries.async_get_entry(coordinator.entry_id)
        if coordinator
        else None
    )
    if entry is None:
        connection.send_error(
            msg["id"], websocket_api.ERR_NOT_FOUND, "Movie Poster is not configured"
        )
        return
    try:
        library, collection = msg["source"].split("::", 1)
    except ValueError:
        connection.send_error(
            msg["id"], websocket_api.ERR_INVALID_FORMAT, "Invalid Coming Soon source"
        )
        return
    if not library:
        connection.send_error(
            msg["id"],
            websocket_api.ERR_INVALID_FORMAT,
            "Select a Coming Soon source",
        )
        return
    options = {
        **entry.options,
        **{key: msg[key] for key in _PRESENTATION_KEYS},
        CONF_LIBRARY: library,
        CONF_COLLECTION: collection or None,
        CONF_PLAYER_ID: msg[CONF_PLAYER_ID],
        CONF_USER_ID: msg[CONF_USER_ID],
        CONF_GRACE_SECONDS: msg[CONF_GRACE_SECONDS],
        CONF_ROTATION_SECONDS: msg[CONF_ROTATION_SECONDS],
        CONF_LIBRARY_REFRESH_SECONDS: msg[CONF_LIBRARY_REFRESH_SECONDS],
    }
    for key in _PRESENTATION_KEYS:
        setattr(coordinator, key, options[key])
    coordinator.presentation_revision += 1
    coordinator.async_update_listeners()
    hass.config_entries.async_update_entry(entry, options=options)
    connection.send_result(msg["id"], {"entry_id": entry.entry_id})


def _updated_presentation_options(
    current: dict[str, Any], updates: dict[str, Any]
) -> dict[str, Any]:
    """Merge Studio fields without replacing behavioral options."""
    return {
        **current,
        **{key: updates[key] for key in _PRESENTATION_KEYS},
    }


@websocket_api.require_admin
@websocket_api.websocket_command(
    {
        vol.Required("type"): "movie_poster/control",
        vol.Optional("entry_id"): str,
        vol.Required("action"): vol.In({"next", "refresh", "reset"}),
    }
)
@websocket_api.async_response
async def websocket_display_control(
    hass: HomeAssistant,
    connection: websocket_api.ActiveConnection,
    msg: dict[str, Any],
) -> None:
    """Run an authenticated operational display action."""
    coordinator = _coordinator(hass, msg.get("entry_id"))
    if coordinator is None:
        connection.send_error(
            msg["id"], websocket_api.ERR_NOT_FOUND, "Movie Poster is not configured"
        )
        return
    action = msg["action"]
    changed = True
    if action == "refresh":
        await coordinator.async_refresh_library()
    else:
        changed = await coordinator.async_next_poster(reset_cycle=action == "reset")
    connection.send_result(msg["id"], {"action": action, "changed": changed})


_PRESENTATION_KEYS = {
    CONF_THEME,
    CONF_ORIENTATION,
    CONF_LAYOUT,
    CONF_FRAME_THEME,
    CONF_SHOW_SUMMARY,
    CONF_SHOW_PROGRESS,
    CONF_SHOW_SESSION,
    CONF_ENABLE_MOTION,
    CONF_KIOSK_MODE,
    CONF_ACCENT_COLOR,
    CONF_BACKGROUND_COLOR,
    CONF_HEADING_FONT,
    CONF_BODY_FONT,
    CONF_NOW_PLAYING_TEXT,
    CONF_COMING_SOON_TEXT,
    CONF_EYEBROW_TEXT,
    CONF_LOGO_URL,
    CONF_LOGO_POSITION,
}


def _coordinator(
    hass: HomeAssistant, entry_id: str | None
) -> MoviePosterCoordinator | None:
    coordinators = hass.data.get(DOMAIN, {})
    if entry_id is not None:
        return coordinators.get(entry_id)
    return next(iter(coordinators.values()), None)


def _serialize_state(
    hass: HomeAssistant,
    coordinator: MoviePosterCoordinator,
    *,
    refresh_token_id: str | None,
    can_control: bool = True,
) -> dict[str, Any]:
    data: CoordinatorData = coordinator.data
    media = data.media
    media_payload: dict[str, Any] | None = None
    if media is not None:
        media_payload = {
            "key": media.key,
            "type": media.media_type,
            "title": media.title,
            "subtitle": media.subtitle,
            "summary": media.summary,
            "year": media.year,
            "content_rating": media.content_rating,
            "duration_ms": media.duration_ms,
            "position_ms": media.position_ms,
            "poster_url": _signed_artwork(
                hass, coordinator.entry_id, "poster", media.key, refresh_token_id
            )
            if media.poster_path
            else None,
            "backdrop_url": _signed_artwork(
                hass, coordinator.entry_id, "backdrop", media.key, refresh_token_id
            )
            if media.backdrop_path
            else None,
        }
    session = data.selected_session
    return {
        "schema_version": 1,
        "entry_id": coordinator.entry_id,
        "presentation_revision": coordinator.presentation_revision,
        "health": {
            "connected": getattr(coordinator, "last_update_success", True),
            "message": None
            if getattr(coordinator, "last_update_success", True)
            else "Plex is temporarily unavailable. Retrying automatically.",
        },
        "operations": {
            "can_control": can_control,
            "library": getattr(coordinator, "_library_title", None),
            "collection": getattr(coordinator, "_collection_title", None),
            "loaded_movies": getattr(coordinator, "loaded_movie_count", 0),
            "remaining_movies": getattr(coordinator, "remaining_movie_count", 0),
            "hydrating": getattr(coordinator, "library_hydrating", False),
            "hydration_percent": getattr(
                coordinator, "library_hydration_percent", None
            ),
            "last_refresh": getattr(coordinator, "library_last_refresh", None),
        },
        "presentation": {
            "theme": coordinator.theme,
            "show_summary": coordinator.show_summary,
            "show_progress": coordinator.show_progress,
            "show_session": coordinator.show_session,
            "enable_motion": coordinator.enable_motion,
            "kiosk_mode": coordinator.kiosk_mode,
            "orientation": coordinator.orientation,
            "layout": coordinator.layout,
            "frame_theme": coordinator.frame_theme,
            "accent_color": coordinator.accent_color,
            "background_color": coordinator.background_color,
            "heading_font": coordinator.heading_font,
            "body_font": coordinator.body_font,
            "eyebrow_text": coordinator.eyebrow_text,
            "now_playing_text": coordinator.now_playing_text,
            "coming_soon_text": coordinator.coming_soon_text,
            "logo_url": coordinator.logo_url,
            "logo_position": coordinator.logo_position,
        },
        "mode": data.mode.mode,
        "heading": coordinator.now_playing_text
        if data.mode.mode == "now_playing"
        else coordinator.coming_soon_text,
        "reason": data.mode.reason,
        "media": media_payload,
        "session": {
            "player": session.player_name,
            "user": session.user_name,
            "state": session.state,
        }
        if session is not None
        else None,
    }


def _signed_artwork(
    hass: HomeAssistant,
    entry_id: str,
    kind: str,
    media_key: str,
    refresh_token_id: str | None,
) -> str:
    path = f"/api/movie_poster/artwork/{entry_id}/{kind}/{media_key}"
    return async_sign_path(
        hass,
        path,
        _ARTWORK_EXPIRATION,
        refresh_token_id=refresh_token_id,
    )


class MoviePosterArtworkView(HomeAssistantView):
    """Proxy Plex artwork without exposing Plex credentials to the browser."""

    url = "/api/movie_poster/artwork/{entry_id}/{kind}/{media_key}"
    name = "api:movie_poster:artwork"
    requires_auth = True

    async def get(
        self, request: web.Request, entry_id: str, kind: str, media_key: str
    ) -> web.Response:
        """Return current poster or backdrop artwork."""
        coordinator = _coordinator(request.app["hass"], entry_id)
        current_media = coordinator.data.media if coordinator is not None else None
        if (
            coordinator is None
            or kind not in {"poster", "backdrop"}
            or current_media is None
            or current_media.key != media_key
        ):
            raise web.HTTPNotFound
        artwork = await coordinator.async_artwork(kind)
        if artwork is None:
            raise web.HTTPNotFound
        content, content_type = artwork
        return web.Response(
            body=content,
            content_type=content_type,
            headers={"Cache-Control": "no-store"},
        )
