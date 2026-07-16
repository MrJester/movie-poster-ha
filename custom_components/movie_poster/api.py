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

from .const import DOMAIN

if TYPE_CHECKING:
    from homeassistant.core import HomeAssistant

    from .coordinator import CoordinatorData, MoviePosterCoordinator

PANEL_URL = "movie-poster"
STATIC_URL = "/movie_poster_static"
_ARTWORK_EXPIRATION = timedelta(hours=24)


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
        module_url=f"{STATIC_URL}/movie-poster-panel.js",
        require_admin=False,
    )
    hass.http.register_view(MoviePosterArtworkView())
    websocket_api.async_register_command(hass, websocket_subscribe)


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
                ),
            )
        )

    connection.subscriptions[msg["id"]] = coordinator.async_add_listener(send_state)
    connection.send_result(msg["id"])
    send_state()


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
            "duration_ms": media.duration_ms,
            "position_ms": media.position_ms,
            "poster_url": _signed_artwork(
                hass, coordinator.entry_id, "poster", refresh_token_id
            )
            if media.poster_path
            else None,
            "backdrop_url": _signed_artwork(
                hass, coordinator.entry_id, "backdrop", refresh_token_id
            )
            if media.backdrop_path
            else None,
        }
    session = data.selected_session
    return {
        "schema_version": 1,
        "health": {
            "connected": getattr(coordinator, "last_update_success", True),
            "message": None
            if getattr(coordinator, "last_update_success", True)
            else "Plex is temporarily unavailable. Retrying automatically.",
        },
        "presentation": {
            "theme": coordinator.theme,
            "show_summary": coordinator.show_summary,
            "show_progress": coordinator.show_progress,
            "show_session": coordinator.show_session,
            "enable_motion": coordinator.enable_motion,
            "kiosk_mode": coordinator.kiosk_mode,
            "orientation": coordinator.orientation,
        },
        "mode": data.mode.mode,
        "heading": "Now Playing"
        if data.mode.mode == "now_playing"
        else "Coming Soon",
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
    refresh_token_id: str | None,
) -> str:
    path = f"/api/movie_poster/artwork/{entry_id}/{kind}"
    return async_sign_path(
        hass,
        path,
        _ARTWORK_EXPIRATION,
        refresh_token_id=refresh_token_id,
    )


class MoviePosterArtworkView(HomeAssistantView):
    """Proxy Plex artwork without exposing Plex credentials to the browser."""

    url = "/api/movie_poster/artwork/{entry_id}/{kind}"
    name = "api:movie_poster:artwork"
    requires_auth = True

    async def get(
        self, request: web.Request, entry_id: str, kind: str
    ) -> web.Response:
        """Return current poster or backdrop artwork."""
        coordinator = _coordinator(request.app["hass"], entry_id)
        if coordinator is None or kind not in {"poster", "backdrop"}:
            raise web.HTTPNotFound
        artwork = await coordinator.async_artwork(kind)
        if artwork is None:
            raise web.HTTPNotFound
        content, content_type = artwork
        return web.Response(body=content, content_type=content_type)
