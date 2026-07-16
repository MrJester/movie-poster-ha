"""Movie Poster integration."""

from __future__ import annotations

from typing import TYPE_CHECKING

from .const import (
    CONF_COLLECTION,
    CONF_GRACE_SECONDS,
    CONF_LIBRARY,
    CONF_LIBRARY_REFRESH_SECONDS,
    CONF_PLAYER_ID,
    CONF_ROTATION_SECONDS,
    CONF_SERVER_URL,
    CONF_THEME,
    CONF_TOKEN,
    CONF_USER_ID,
    CONF_VERIFY_SSL,
    DEFAULT_GRACE_SECONDS,
    DEFAULT_LIBRARY_REFRESH_SECONDS,
    DEFAULT_ROTATION_SECONDS,
    DEFAULT_THEME,
    DOMAIN,
    PLATFORMS,
)

if TYPE_CHECKING:
    from homeassistant.config_entries import ConfigEntry
    from homeassistant.core import HomeAssistant

type MoviePosterConfigEntry = ConfigEntry[dict]


async def async_setup(hass: HomeAssistant, _config: dict) -> bool:
    """Set up integration-level frontend and APIs."""
    from .api import async_setup_frontend  # noqa: PLC0415

    await async_setup_frontend(hass)
    return True


async def async_setup_entry(
    hass: HomeAssistant, entry: MoviePosterConfigEntry
) -> bool:
    """Set up Movie Poster from a config entry."""
    from .coordinator import MoviePosterCoordinator  # noqa: PLC0415
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
        entry_id=entry.entry_id,
    )
    await coordinator.async_config_entry_first_refresh()
    hass.data.setdefault(DOMAIN, {})[entry.entry_id] = coordinator
    await hass.config_entries.async_forward_entry_setups(entry, PLATFORMS)
    entry.async_on_unload(entry.add_update_listener(_async_reload_entry))
    return True


async def async_unload_entry(
    hass: HomeAssistant, entry: MoviePosterConfigEntry
) -> bool:
    """Unload Movie Poster."""
    unloaded = await hass.config_entries.async_unload_platforms(entry, PLATFORMS)
    if unloaded:
        hass.data[DOMAIN].pop(entry.entry_id)
    return unloaded


async def _async_reload_entry(
    hass: HomeAssistant, entry: MoviePosterConfigEntry
) -> None:
    """Reload after options change."""
    await hass.config_entries.async_reload(entry.entry_id)
