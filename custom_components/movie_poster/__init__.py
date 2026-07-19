"""Movie Poster integration."""

from __future__ import annotations

from typing import TYPE_CHECKING

import voluptuous as vol
from homeassistant.helpers import config_validation as cv

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
    CONF_SERVER_URL,
    CONF_SHOW_PROGRESS,
    CONF_SHOW_SESSION,
    CONF_SHOW_SUMMARY,
    CONF_THEME,
    CONF_TOKEN,
    CONF_USER_ID,
    CONF_VERIFY_SSL,
    DEFAULT_ACCENT_COLOR,
    DEFAULT_BACKGROUND_COLOR,
    DEFAULT_BODY_FONT,
    DEFAULT_COMING_SOON_TEXT,
    DEFAULT_ENABLE_MOTION,
    DEFAULT_EYEBROW_TEXT,
    DEFAULT_FRAME_THEME,
    DEFAULT_GRACE_SECONDS,
    DEFAULT_HEADING_FONT,
    DEFAULT_KIOSK_MODE,
    DEFAULT_LAYOUT,
    DEFAULT_LIBRARY_REFRESH_SECONDS,
    DEFAULT_LOGO_POSITION,
    DEFAULT_LOGO_URL,
    DEFAULT_NOW_PLAYING_TEXT,
    DEFAULT_ORIENTATION,
    DEFAULT_ROTATION_SECONDS,
    DEFAULT_SHOW_PROGRESS,
    DEFAULT_SHOW_SESSION,
    DEFAULT_SHOW_SUMMARY,
    DEFAULT_THEME,
    DOMAIN,
    PLATFORMS,
)

if TYPE_CHECKING:
    from homeassistant.config_entries import ConfigEntry
    from homeassistant.core import HomeAssistant, ServiceCall

    from .coordinator import MoviePosterCoordinator

type MoviePosterConfigEntry = ConfigEntry[dict]

CONFIG_SCHEMA = cv.config_entry_only_config_schema(DOMAIN)


async def async_setup(hass: HomeAssistant, _config: dict) -> bool:
    """Set up integration-level frontend and APIs."""
    from .api import async_setup_frontend  # noqa: PLC0415

    await async_setup_frontend(hass)
    _async_register_services(hass)
    return True


def _async_register_services(hass: HomeAssistant) -> None:
    """Register automation-friendly Movie Poster services."""

    async def async_handle_service(call: ServiceCall) -> None:
        coordinators = hass.data.get(DOMAIN, {})
        entry_id = call.data.get("entry_id")
        coordinator = (
            coordinators.get(entry_id)
            if entry_id is not None
            else next(iter(coordinators.values()), None)
        )
        if coordinator is None:
            return
        if call.service == "activate_profile":
            from .profiles import stored_profiles  # noqa: PLC0415

            entry = hass.config_entries.async_get_entry(coordinator.entry_id)
            profiles = stored_profiles(entry.options if entry else {})
            profile = profiles.get(call.data["profile_id"])
            if entry is None or profile is None:
                return
            options = {**entry.options, **profile["presentation"]}
            for key, value in profile["presentation"].items():
                setattr(coordinator, key, value)
            coordinator.presentation_revision += 1
            coordinator.async_update_listeners()
            hass.config_entries.async_update_entry(entry, options=options)
        elif call.service == "refresh_library":
            await coordinator.async_refresh_library()
        else:
            await coordinator.async_next_poster(
                reset_cycle=call.service == "reset_shuffle"
            )

    schema = vol.Schema({vol.Optional("entry_id"): str})
    for service in ("next_poster", "refresh_library", "reset_shuffle"):
        hass.services.async_register(
            DOMAIN, service, async_handle_service, schema=schema
        )
    hass.services.async_register(
        DOMAIN,
        "activate_profile",
        async_handle_service,
        schema=vol.Schema(
            {vol.Optional("entry_id"): str, vol.Required("profile_id"): str}
        ),
    )


async def async_setup_entry(hass: HomeAssistant, entry: MoviePosterConfigEntry) -> bool:
    """Set up Movie Poster from a config entry."""
    from .coordinator import MoviePosterCoordinator  # noqa: PLC0415
    from .issues import async_validate_logo  # noqa: PLC0415
    from .models import PlaybackPolicy  # noqa: PLC0415
    from .plex_client import MoviePosterPlexClient  # noqa: PLC0415

    client = MoviePosterPlexClient(
        hass,
        entry.data[CONF_SERVER_URL],
        entry.data[CONF_TOKEN],
        verify_ssl=entry.data[CONF_VERIFY_SSL],
    )
    coordinator = MoviePosterCoordinator(
        hass,
        client,
        policy=PlaybackPolicy(
            player_ids=(entry.options[CONF_PLAYER_ID],)
            if entry.options.get(CONF_PLAYER_ID)
            else (),
            user_ids=(entry.options[CONF_USER_ID],)
            if entry.options.get(CONF_USER_ID)
            else (),
            allow_any=not (
                entry.options.get(CONF_PLAYER_ID) or entry.options.get(CONF_USER_ID)
            ),
        ),
        grace_seconds=entry.options.get(CONF_GRACE_SECONDS, DEFAULT_GRACE_SECONDS),
        library_title=entry.options.get(CONF_LIBRARY),
        collection_title=entry.options.get(CONF_COLLECTION),
        rotation_seconds=entry.options.get(
            CONF_ROTATION_SECONDS, DEFAULT_ROTATION_SECONDS
        ),
        library_refresh_seconds=entry.options.get(
            CONF_LIBRARY_REFRESH_SECONDS, DEFAULT_LIBRARY_REFRESH_SECONDS
        ),
        theme=entry.options.get(CONF_THEME, DEFAULT_THEME),
        show_summary=entry.options.get(CONF_SHOW_SUMMARY, DEFAULT_SHOW_SUMMARY),
        show_progress=entry.options.get(CONF_SHOW_PROGRESS, DEFAULT_SHOW_PROGRESS),
        show_session=entry.options.get(CONF_SHOW_SESSION, DEFAULT_SHOW_SESSION),
        enable_motion=entry.options.get(CONF_ENABLE_MOTION, DEFAULT_ENABLE_MOTION),
        kiosk_mode=entry.options.get(CONF_KIOSK_MODE, DEFAULT_KIOSK_MODE),
        orientation=entry.options.get(CONF_ORIENTATION, DEFAULT_ORIENTATION),
        layout=entry.options.get(CONF_LAYOUT, DEFAULT_LAYOUT),
        frame_theme=entry.options.get(CONF_FRAME_THEME, DEFAULT_FRAME_THEME),
        accent_color=entry.options.get(CONF_ACCENT_COLOR, DEFAULT_ACCENT_COLOR),
        background_color=entry.options.get(
            CONF_BACKGROUND_COLOR, DEFAULT_BACKGROUND_COLOR
        ),
        heading_font=entry.options.get(CONF_HEADING_FONT, DEFAULT_HEADING_FONT),
        body_font=entry.options.get(CONF_BODY_FONT, DEFAULT_BODY_FONT),
        now_playing_text=entry.options.get(
            CONF_NOW_PLAYING_TEXT, DEFAULT_NOW_PLAYING_TEXT
        ),
        coming_soon_text=entry.options.get(
            CONF_COMING_SOON_TEXT, DEFAULT_COMING_SOON_TEXT
        ),
        eyebrow_text=entry.options.get(CONF_EYEBROW_TEXT, DEFAULT_EYEBROW_TEXT),
        logo_url=entry.options.get(CONF_LOGO_URL, DEFAULT_LOGO_URL),
        logo_position=entry.options.get(CONF_LOGO_POSITION, DEFAULT_LOGO_POSITION),
        entry_id=entry.entry_id,
    )
    await coordinator.async_initialize()
    await coordinator.async_config_entry_first_refresh()
    hass.data.setdefault(DOMAIN, {})[entry.entry_id] = coordinator
    await async_validate_logo(
        hass, entry.entry_id, entry.options.get(CONF_LOGO_URL, DEFAULT_LOGO_URL)
    )
    hass.async_create_task(
        _async_validate_source(hass, entry, coordinator),
        f"{DOMAIN}_{entry.entry_id}_validate_source",
    )
    await hass.config_entries.async_forward_entry_setups(entry, PLATFORMS)
    entry.async_on_unload(entry.add_update_listener(_async_reload_entry))
    return True


async def async_unload_entry(
    hass: HomeAssistant, entry: MoviePosterConfigEntry
) -> bool:
    """Unload Movie Poster."""
    unloaded = await hass.config_entries.async_unload_platforms(entry, PLATFORMS)
    if unloaded:
        coordinator = hass.data[DOMAIN].pop(entry.entry_id)
        await coordinator.async_shutdown()
    return unloaded


async def _async_reload_entry(
    hass: HomeAssistant, entry: MoviePosterConfigEntry
) -> None:
    """Reload after options change."""
    await hass.config_entries.async_reload(entry.entry_id)


async def _async_validate_source(
    hass: HomeAssistant,
    entry: MoviePosterConfigEntry,
    coordinator: MoviePosterCoordinator,
) -> None:
    """Validate the configured library and collection without delaying setup."""
    from .issues import async_set_source_issue  # noqa: PLC0415

    library_title = entry.options.get(CONF_LIBRARY)
    collection_title = entry.options.get(CONF_COLLECTION)
    if not library_title:
        return
    try:
        libraries = await coordinator._client.async_movie_libraries()  # noqa: SLF001
    except Exception:  # noqa: BLE001 - connectivity has its own repair lifecycle
        return
    library = next((item for item in libraries if item.title == library_title), None)
    missing = library is None or (
        bool(collection_title) and collection_title not in library.collections
    )
    source = (
        f"{library_title} — {collection_title}" if collection_title else library_title
    )
    async_set_source_issue(hass, entry.entry_id, active=missing, source=source)
