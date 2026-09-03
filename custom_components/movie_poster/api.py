"""Frontend registration and authenticated APIs for Movie Poster."""

from __future__ import annotations

import base64
import binascii
import hashlib
import mimetypes
from copy import deepcopy
from datetime import timedelta
from pathlib import Path
from typing import TYPE_CHECKING, Any
from urllib.parse import quote

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
    CONF_DISPLAY_PROFILES,
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
    CONF_SHOW_RATING,
    CONF_SHOW_RUNTIME,
    CONF_SHOW_SESSION,
    CONF_SHOW_SUBTITLE,
    CONF_SHOW_SUMMARY,
    CONF_SHOW_TITLE,
    CONF_SHOW_YEAR,
    CONF_THEME,
    CONF_USER_ID,
    DEFAULT_GRACE_SECONDS,
    DEFAULT_LIBRARY_REFRESH_SECONDS,
    DEFAULT_PROFILE_ID,
    DEFAULT_ROTATION_SECONDS,
    DOMAIN,
    FONTS,
    FRAME_THEMES,
    LAYOUTS,
    LOGO_POSITIONS,
    ORIENTATIONS,
    THEMES,
)
from .presentation_library import PresentationLibrary
from .presentation_package import (
    MAX_FILE_BYTES,
    MAX_PACKAGE_BYTES,
    build_package,
    read_package,
)
from .presentation_resources import (
    blank_design,
    builtin_catalog,
    design_from_legacy_presentation,
    frame_geometry_for_presentation,
    semantic_style_for_presentation,
)
from .profiles import (
    PROFILE_KEYS,
    PROFILE_VERSION,
    make_profile_id,
    presentation_from_options,
    stored_profiles,
    validate_profile_document,
)

if TYPE_CHECKING:
    from homeassistant.config_entries import ConfigEntry
    from homeassistant.core import HomeAssistant

    from .coordinator import CoordinatorData, MoviePosterCoordinator

PANEL_URL = "movie-poster"
STATIC_URL = "/movie_poster_static"
_ARTWORK_EXPIRATION = timedelta(hours=24)
_FRONTEND_DIR = Path(__file__).parent / "frontend"
_FRONTEND_PATH = _FRONTEND_DIR / "movie-poster-panel.js"
_FRONTEND_VERSION = "0.1.0-beta.58-presentation.26"
_FRONTEND_ELEMENT = "movie-poster-panel-v25"


def _frontend_module_url() -> str:
    """Return a content-addressed panel URL that cannot reuse stale JavaScript."""
    digest = hashlib.sha256(
        _FRONTEND_PATH.read_bytes(), usedforsecurity=False
    ).hexdigest()[:12]
    return f"{STATIC_URL}/movie-poster-panel.js?v={_FRONTEND_VERSION}-{digest}"


async def async_setup_frontend(hass: HomeAssistant) -> None:
    """Register static assets, panel, HTTP view, and WebSocket commands."""
    await hass.http.async_register_static_paths(
        [StaticPathConfig(STATIC_URL, str(_FRONTEND_DIR), cache_headers=False)]
    )
    await panel_custom.async_register_panel(
        hass,
        frontend_url_path=PANEL_URL,
        webcomponent_name=_FRONTEND_ELEMENT,
        sidebar_title="Movie Poster",
        sidebar_icon="mdi:movie-open-star",
        module_url=_frontend_module_url(),
        require_admin=False,
    )
    hass.http.register_view(MoviePosterArtworkView())
    hass.http.register_view(MoviePosterPresentationAssetView())
    websocket_api.async_register_command(hass, websocket_subscribe)
    websocket_api.async_register_command(hass, websocket_update_presentation)
    websocket_api.async_register_command(hass, websocket_get_settings)
    websocket_api.async_register_command(hass, websocket_update_settings)
    websocket_api.async_register_command(hass, websocket_display_control)
    websocket_api.async_register_command(hass, websocket_manage_profile)
    websocket_api.async_register_command(hass, websocket_presentation_library)


@websocket_api.websocket_command(
    {
        vol.Required("type"): "movie_poster/subscribe",
        vol.Optional("entry_id"): str,
        vol.Optional("profile_id", default=DEFAULT_PROFILE_ID): str,
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

    entry = hass.config_entries.async_get_entry(coordinator.entry_id)
    profiles = stored_profiles(entry.options if entry else {})
    selected_profile_id = msg["profile_id"]
    if selected_profile_id not in profiles:
        connection.send_error(
            msg["id"],
            websocket_api.ERR_NOT_FOUND,
            f"Unknown Movie Poster profile: {selected_profile_id}",
        )
        return

    @callback
    def send_state() -> None:
        current_entry = hass.config_entries.async_get_entry(coordinator.entry_id)
        current_profiles = stored_profiles(
            current_entry.options if current_entry else {}
        )
        active_profile = current_profiles.get(
            selected_profile_id, current_profiles[DEFAULT_PROFILE_ID]
        )
        connection.send_message(
            websocket_api.event_message(
                msg["id"],
                _serialize_state(
                    hass,
                    coordinator,
                    refresh_token_id=connection.refresh_token_id,
                    can_control=connection.user.is_admin,
                    profile_id=selected_profile_id,
                    presentation=active_profile["presentation"],
                    design=active_profile["design"],
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
        vol.Required(CONF_SHOW_TITLE): bool,
        vol.Required(CONF_SHOW_SUBTITLE): bool,
        vol.Required(CONF_SHOW_YEAR): bool,
        vol.Required(CONF_SHOW_RATING): bool,
        vol.Required(CONF_SHOW_RUNTIME): bool,
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
        vol.Optional("profile_id", default=DEFAULT_PROFILE_ID): str,
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
    except Exception:  # noqa: BLE001 - Plex discovery is optional in Studio
        libraries = []
    try:
        playback_choices = await coordinator._client.async_playback_choices()  # noqa: SLF001
    except Exception:  # noqa: BLE001 - preserve settings if discovery is partial
        playback_choices = None

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
    from .issues import async_set_source_issue  # noqa: PLC0415

    configured_source = current_source
    async_set_source_issue(
        hass,
        entry.entry_id,
        active=bool(sources) and configured_source not in source_values,
        source=configured_source.replace("::", " — ").removesuffix(" — "),
    )
    if current_source not in source_values:
        current_source = sources[0]["value"] if sources else current_source
    players = dict(playback_choices.players) if playback_choices else {}
    users = dict(playback_choices.users) if playback_choices else {}
    owner_user_id = playback_choices.owner_user_id if playback_choices else ""
    player_ids_by_user = (
        dict(playback_choices.player_ids_by_user) if playback_choices else {}
    )
    selected_player = entry.options.get(CONF_PLAYER_ID, "")
    selected_user = entry.options.get(CONF_USER_ID, "")
    if selected_player and selected_player not in players:
        players[selected_player] = f"Previously selected ({selected_player})"
    if selected_user and selected_user not in users:
        users[selected_user] = f"Previously selected ({selected_user})"
    profiles = stored_profiles(entry.options)
    selected_profile_id = msg["profile_id"]
    if selected_profile_id not in profiles:
        selected_profile_id = DEFAULT_PROFILE_ID
    connection.send_result(
        msg["id"],
        {
            "profiles": profiles,
            "presentation_catalog": builtin_catalog(),
            "design": profiles[selected_profile_id]["design"],
            "settings": {
                **entry.options,
                **profiles[selected_profile_id]["presentation"],
                "profile_id": selected_profile_id,
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
                "profiles": [
                    {"value": identifier, "label": profile["name"]}
                    for identifier, profile in profiles.items()
                ],
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
                "owner_user_id": owner_user_id,
                "player_ids_by_user": player_ids_by_user,
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
        vol.Optional("profile_id", default=DEFAULT_PROFILE_ID): str,
        **_BEHAVIOR_SCHEMA,
        vol.Required(CONF_THEME): vol.In(THEMES),
        vol.Required(CONF_ORIENTATION): vol.In(ORIENTATIONS),
        vol.Required(CONF_LAYOUT): vol.In(LAYOUTS),
        vol.Required(CONF_FRAME_THEME): vol.In(FRAME_THEMES),
        vol.Required(CONF_SHOW_TITLE): bool,
        vol.Required(CONF_SHOW_SUBTITLE): bool,
        vol.Required(CONF_SHOW_YEAR): bool,
        vol.Required(CONF_SHOW_RATING): bool,
        vol.Required(CONF_SHOW_RUNTIME): bool,
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
    profile_id = msg["profile_id"]
    presentation = {key: msg[key] for key in _PRESENTATION_KEYS}
    options = {
        **entry.options,
        CONF_LIBRARY: library,
        CONF_COLLECTION: collection or None,
        CONF_PLAYER_ID: msg[CONF_PLAYER_ID],
        CONF_USER_ID: msg[CONF_USER_ID],
        CONF_GRACE_SECONDS: msg[CONF_GRACE_SECONDS],
        CONF_ROTATION_SECONDS: msg[CONF_ROTATION_SECONDS],
        CONF_LIBRARY_REFRESH_SECONDS: msg[CONF_LIBRARY_REFRESH_SECONDS],
    }
    if profile_id == DEFAULT_PROFILE_ID:
        options.update(presentation)
        for key in _PRESENTATION_KEYS:
            setattr(coordinator, key, presentation[key])
    else:
        profiles = stored_profiles(entry.options)
        if profile_id not in profiles:
            connection.send_error(
                msg["id"],
                websocket_api.ERR_NOT_FOUND,
                f"Unknown Movie Poster profile: {profile_id}",
            )
            return
        custom_profiles = dict(entry.options.get(CONF_DISPLAY_PROFILES, {}))
        custom_profiles[profile_id] = {
            "name": profiles[profile_id]["name"],
            "version": PROFILE_VERSION,
            "description": profiles[profile_id].get("description", ""),
            "author": profiles[profile_id].get("author", ""),
            "presentation": presentation,
            "design": design_from_legacy_presentation(presentation),
        }
        options[CONF_DISPLAY_PROFILES] = custom_profiles
    coordinator.presentation_revision += 1
    coordinator.async_update_listeners()
    hass.config_entries.async_update_entry(entry, options=options)
    from .issues import async_set_source_issue, async_validate_logo  # noqa: PLC0415

    async_set_source_issue(hass, entry.entry_id, active=False, source=msg["source"])
    await async_validate_logo(hass, entry.entry_id, presentation[CONF_LOGO_URL])
    connection.send_result(
        msg["id"], {"entry_id": entry.entry_id, "profile_id": profile_id}
    )


def _updated_presentation_options(
    current: dict[str, Any], updates: dict[str, Any]
) -> dict[str, Any]:
    """Merge Studio fields without replacing behavioral options."""
    presentation = presentation_from_options({**current, **updates})
    return {
        **current,
        **presentation,
    }


@websocket_api.require_admin
@websocket_api.websocket_command(
    {
        vol.Required("type"): "movie_poster/manage_profile",
        vol.Optional("entry_id"): str,
        vol.Required("action"): vol.In({"create", "import", "delete"}),
        vol.Optional("profile_id"): str,
        vol.Optional("name"): vol.All(str, vol.Length(min=1, max=60)),
        vol.Optional("document"): dict,
    }
)
@websocket_api.async_response
async def websocket_manage_profile(
    hass: HomeAssistant,
    connection: websocket_api.ActiveConnection,
    msg: dict[str, Any],
) -> None:
    """Create, import, or delete a validated display profile."""
    coordinator = _coordinator(hass, msg.get("entry_id"))
    entry = (
        hass.config_entries.async_get_entry(coordinator.entry_id)
        if coordinator
        else None
    )
    if entry is None or coordinator is None:
        connection.send_error(
            msg["id"], websocket_api.ERR_NOT_FOUND, "Movie Poster is not configured"
        )
        return
    action = msg["action"]
    custom_profiles = dict(entry.options.get(CONF_DISPLAY_PROFILES, {}))
    if action == "delete":
        identifier = str(msg.get("profile_id", ""))
        if identifier == DEFAULT_PROFILE_ID or identifier not in custom_profiles:
            connection.send_error(
                msg["id"], websocket_api.ERR_NOT_FOUND, "Profile cannot be deleted"
            )
            return
        custom_profiles.pop(identifier)
    else:
        if action == "create" and not str(msg.get("name", "")).strip():
            connection.send_error(
                msg["id"],
                websocket_api.ERR_INVALID_FORMAT,
                "Profile name is required",
            )
            return
        try:
            if action == "import":
                document = validate_profile_document(msg.get("document", {}))
            else:
                name = str(msg.get("name", "")).strip()
                presentation = presentation_from_options(entry.options)
                document = {
                    "version": PROFILE_VERSION,
                    "name": name,
                    "description": "",
                    "author": "",
                    "presentation": presentation,
                    "design": design_from_legacy_presentation(presentation),
                }
        except vol.Invalid as err:
            connection.send_error(msg["id"], websocket_api.ERR_INVALID_FORMAT, str(err))
            return
        base = make_profile_id(document["name"])
        identifier = base
        suffix = 2
        while identifier in custom_profiles or identifier == DEFAULT_PROFILE_ID:
            identifier = f"{base}-{suffix}"
            suffix += 1
        custom_profiles[identifier] = document
    options = {**entry.options, CONF_DISPLAY_PROFILES: custom_profiles}
    hass.config_entries.async_update_entry(entry, options=options)
    coordinator.presentation_revision += 1
    coordinator.async_update_listeners()
    connection.send_result(
        msg["id"], {"profile_id": identifier, "profiles": stored_profiles(options)}
    )


@websocket_api.require_admin
@websocket_api.websocket_command(
    {
        vol.Required("type"): "movie_poster/presentation_library",
        vol.Optional("entry_id"): str,
        vol.Required("action"): vol.In(
            {
                "list",
                "create",
                "update",
                "publish",
                "edit",
                "rollback",
                "delete",
                "export",
                "import",
                "put_asset",
                "delete_asset",
            }
        ),
        vol.Optional("profile_id"): str,
        vol.Optional("name"): vol.All(str, vol.Length(min=1, max=60)),
        vol.Optional("document"): dict,
        vol.Optional("blank", default=False): bool,
        vol.Optional("revision"): vol.All(int, vol.Range(min=1)),
        vol.Optional("asset_path"): vol.All(str, vol.Length(min=1, max=240)),
        vol.Optional("asset"): vol.All(
            str,
            vol.Length(max=(MAX_FILE_BYTES * 4 // 3) + 4),
        ),
        vol.Optional("package"): vol.All(
            str,
            vol.Length(max=(MAX_PACKAGE_BYTES * 4 // 3) + 4),
        ),
    }
)
@websocket_api.async_response
async def websocket_presentation_library(
    hass: HomeAssistant,
    connection: websocket_api.ActiveConnection,
    msg: dict[str, Any],
) -> None:
    """Manage local presentation drafts and published revisions."""
    coordinator = _coordinator(hass, msg.get("entry_id"))
    entry = (
        hass.config_entries.async_get_entry(coordinator.entry_id)
        if coordinator is not None
        else None
    )
    if entry is None:
        connection.send_error(
            msg["id"],
            websocket_api.ERR_NOT_FOUND,
            "Movie Poster is not configured",
        )
        return

    library = await _presentation_library(hass, entry.entry_id, entry.options)
    action = msg["action"]
    try:
        result = await _async_library_action(library, entry.options, msg)
        if action in {"publish", "rollback", "delete"}:
            await _async_sync_library_assignment(
                hass,
                entry,
                coordinator,
                library,
                action,
                msg,
            )
    except vol.Invalid as err:
        connection.send_error(
            msg["id"],
            websocket_api.ERR_INVALID_FORMAT,
            str(err),
        )
        return

    result["library"] = await library.async_list()
    if action == "list":
        result["catalog"] = builtin_catalog()
    connection.send_result(msg["id"], result)


async def _async_sync_library_assignment(  # noqa: PLR0913, PLR0917
    hass: HomeAssistant,
    entry: ConfigEntry,
    coordinator: MoviePosterCoordinator,
    library: PresentationLibrary,
    action: str,
    msg: dict[str, Any],
) -> None:
    """Synchronize published library Profiles with live display choices."""
    identifier = _required_profile_id(msg)
    custom_profiles = deepcopy(
        entry.options.get(CONF_DISPLAY_PROFILES, {}),
    )
    if action == "delete":
        custom_profiles.pop(identifier, None)
    else:
        custom_profiles[identifier] = await library.async_active_profile(identifier)
    hass.config_entries.async_update_entry(
        entry,
        options={
            **entry.options,
            CONF_DISPLAY_PROFILES: custom_profiles,
        },
    )
    coordinator.presentation_revision += 1
    coordinator.async_update_listeners()


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
    CONF_SHOW_TITLE,
    CONF_SHOW_SUBTITLE,
    CONF_SHOW_YEAR,
    CONF_SHOW_RATING,
    CONF_SHOW_RUNTIME,
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


async def _presentation_library(
    hass: HomeAssistant,
    entry_id: str,
    options: dict[str, Any],
) -> PresentationLibrary:
    """Return a loaded per-entry Presentation Library."""
    key = f"{DOMAIN}_presentation_libraries"
    libraries = hass.data.setdefault(key, {})
    library = libraries.get(entry_id)
    if library is None:
        library = PresentationLibrary(hass, entry_id)
        libraries[entry_id] = library
    await library.async_import_legacy(options)
    return library


async def _async_library_action(  # noqa: C901
    library: PresentationLibrary,
    options: dict[str, Any],
    msg: dict[str, Any],
) -> dict[str, Any]:
    """Apply one validated Presentation Library action."""
    action = msg["action"]
    result: dict[str, Any] = {}
    if action == "create":
        presentation = presentation_from_options(options)
        document = {
            "version": PROFILE_VERSION,
            "name": _required_name(msg),
            "description": "",
            "author": "",
            "presentation": presentation,
            "design": blank_design()
            if msg["blank"]
            else design_from_legacy_presentation(presentation),
        }
        result["profile_id"] = await library.async_create_draft(document)
    elif action == "update":
        await library.async_update_draft(
            _required_profile_id(msg),
            msg.get("document", {}),
        )
    elif action == "publish":
        result["revision"] = await library.async_publish(_required_profile_id(msg))
    elif action == "edit":
        result["document"] = await library.async_edit_published(
            _required_profile_id(msg)
        )
    elif action == "rollback":
        await library.async_rollback(
            _required_profile_id(msg),
            _required_revision(msg),
        )
    elif action == "delete":
        await library.async_delete(_required_profile_id(msg))
    elif action == "export":
        identifier = _required_profile_id(msg)
        profile = await library.async_active_profile(identifier)
        assets = await library.async_assets(identifier)
        result["package"] = base64.b64encode(
            build_package(identifier, profile, assets)
        ).decode("ascii")
    elif action == "import":
        package = _decode_package(msg)
        imported = read_package(package)
        result["profile_id"] = await library.async_create_draft(
            imported["profile"],
            identifier=imported["manifest"]["package_id"],
            assets=imported["assets"],
        )
    elif action == "put_asset":
        result["asset_path"] = await library.async_put_asset(
            _required_profile_id(msg),
            str(msg.get("asset_path", "")),
            _decode_base64_field(msg, "asset", "Asset"),
        )
    elif action == "delete_asset":
        await library.async_delete_asset(
            _required_profile_id(msg),
            str(msg.get("asset_path", "")),
        )
    return result


def _required_profile_id(msg: dict[str, Any]) -> str:
    """Return a required Profile identifier for library mutations."""
    identifier = str(msg.get("profile_id", "")).strip()
    if not identifier:
        message = "Profile ID is required"
        raise vol.Invalid(message)
    return identifier


def _required_name(msg: dict[str, Any]) -> str:
    """Return a required display name."""
    name = str(msg.get("name", "")).strip()
    if not name:
        message = "Profile name is required"
        raise vol.Invalid(message)
    return name


def _required_revision(msg: dict[str, Any]) -> int:
    """Return a required revision number."""
    revision = msg.get("revision")
    if revision is None:
        message = "Revision is required"
        raise vol.Invalid(message)
    return int(revision)


def _decode_package(msg: dict[str, Any]) -> bytes:
    """Decode one required base64 package payload."""
    value = msg.get("package")
    if not isinstance(value, str) or not value:
        message = "Package payload is required"
        raise vol.Invalid(message)
    try:
        return base64.b64decode(value, validate=True)
    except (binascii.Error, ValueError) as err:
        message = "Package payload is not valid base64"
        raise vol.Invalid(message) from err


def _decode_base64_field(
    msg: dict[str, Any],
    field: str,
    label: str,
) -> bytes:
    """Decode one required base64 WebSocket field."""
    value = msg.get(field)
    if not isinstance(value, str) or not value:
        message = f"{label} payload is required"
        raise vol.Invalid(message)
    try:
        return base64.b64decode(value, validate=True)
    except (binascii.Error, ValueError) as err:
        message = f"{label} payload is not valid base64"
        raise vol.Invalid(message) from err


def _serialize_state(  # noqa: PLR0913
    hass: HomeAssistant,
    coordinator: MoviePosterCoordinator,
    *,
    refresh_token_id: str | None,
    can_control: bool = True,
    profile_id: str = DEFAULT_PROFILE_ID,
    presentation: dict[str, Any] | None = None,
    design: dict[str, Any] | None = None,
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
    active_presentation = presentation or presentation_from_options(
        {
            key: getattr(coordinator, key)
            for key in PROFILE_KEYS
            if hasattr(coordinator, key)
        }
    )
    return {
        "schema_version": 1,
        "entry_id": coordinator.entry_id,
        "profile_id": profile_id,
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
            **active_presentation,
        },
        "design": design or design_from_legacy_presentation(active_presentation),
        "design_assets": _signed_design_assets(
            hass,
            coordinator.entry_id,
            profile_id,
            design,
            connection_refresh_token_id=refresh_token_id,
        ),
        "design_frame": frame_geometry_for_presentation(active_presentation),
        "design_style": semantic_style_for_presentation(active_presentation),
        "mode": data.mode.mode,
        "heading": active_presentation[CONF_NOW_PLAYING_TEXT]
        if data.mode.mode == "now_playing"
        else active_presentation[CONF_COMING_SOON_TEXT],
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


def _signed_design_assets(
    hass: HomeAssistant,
    entry_id: str,
    profile_id: str,
    design: dict[str, Any] | None,
    *,
    connection_refresh_token_id: str | None,
) -> dict[str, str]:
    """Return signed URLs for assets referenced by the active design."""
    references = {
        str(component.get("asset_ref", "")).strip()
        for component in (design or {}).get("components", [])
        if str(component.get("asset_ref", "")).strip()
    }
    return {
        reference: async_sign_path(
            hass,
            (
                "/api/movie_poster/presentation_asset/"
                f"{quote(entry_id, safe='')}/{quote(profile_id, safe='')}/"
                f"{quote(reference, safe='/')}"
            ),
            _ARTWORK_EXPIRATION,
            refresh_token_id=connection_refresh_token_id,
        )
        for reference in sorted(references)
    }


class MoviePosterPresentationAssetView(HomeAssistantView):
    """Serve a validated local Presentation Library asset."""

    url = (
        "/api/movie_poster/presentation_asset/"
        "{entry_id}/{profile_id}/{asset_path:.*}"
    )
    name = "api:movie_poster:presentation_asset"
    requires_auth = True

    async def get(
        self,
        request: web.Request,
        entry_id: str,
        profile_id: str,
        asset_path: str,
    ) -> web.Response:
        """Return one packaged asset without exposing library storage."""
        hass = request.app["hass"]
        entry = hass.config_entries.async_get_entry(entry_id)
        if entry is None or not asset_path:
            raise web.HTTPNotFound
        library = await _presentation_library(hass, entry_id, entry.options)
        try:
            content = (await library.async_assets(profile_id))[asset_path]
        except (KeyError, vol.Invalid):
            raise web.HTTPNotFound from None
        content_type = mimetypes.guess_type(asset_path)[0]
        return web.Response(
            body=content,
            content_type=content_type or "application/octet-stream",
            headers={"Cache-Control": "private, max-age=86400"},
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
