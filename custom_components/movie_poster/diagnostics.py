"""Privacy-conscious diagnostics for Movie Poster."""

from __future__ import annotations

from typing import TYPE_CHECKING, Any

from homeassistant.components.diagnostics import async_redact_data

from .const import CONF_TOKEN, DOMAIN

if TYPE_CHECKING:
    from homeassistant.config_entries import ConfigEntry
    from homeassistant.core import HomeAssistant


async def async_get_config_entry_diagnostics(
    hass: HomeAssistant, config_entry: ConfigEntry
) -> dict[str, Any]:
    """Return configuration and runtime health without Plex credentials."""
    coordinator = hass.data.get(DOMAIN, {}).get(config_entry.entry_id)
    runtime: dict[str, Any] = {"loaded": coordinator is not None}
    if coordinator is not None:
        data = coordinator.data
        runtime.update(
            {
                "last_update_success": coordinator.last_update_success,
                "last_error_type": type(coordinator.last_exception).__name__
                if coordinator.last_exception is not None
                else None,
                "mode": data.mode.mode if data is not None else None,
                "reason": data.mode.reason if data is not None else None,
                "media_type": data.media.media_type
                if data is not None and data.media is not None
                else None,
                "library_item_count": len(coordinator._movies),  # noqa: SLF001
                "library_refresh_in_progress": coordinator._movie_refresh_in_progress,  # noqa: SLF001
                "library_refresh_offset": coordinator._movie_refresh_offset,  # noqa: SLF001
            }
        )
    return {
        "config_entry": async_redact_data(config_entry.as_dict(), {CONF_TOKEN}),
        "runtime": runtime,
    }
