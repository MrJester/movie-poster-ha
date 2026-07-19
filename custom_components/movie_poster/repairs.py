"""Actionable Home Assistant Repairs flows for Movie Poster."""

from __future__ import annotations

from typing import TYPE_CHECKING, Any

import voluptuous as vol
from homeassistant.components.repairs import RepairsFlow

from .const import CONF_COLLECTION, CONF_LIBRARY, CONF_LOGO_URL, DOMAIN
from .issues import async_validate_logo

if TYPE_CHECKING:
    from homeassistant.config_entries import ConfigEntry
    from homeassistant.core import HomeAssistant
    from homeassistant.data_entry_flow import FlowResult


class MoviePosterRepairFlow(RepairsFlow):
    """Repair one Movie Poster configuration problem."""

    def __init__(self, entry: ConfigEntry, kind: str) -> None:
        """Initialize the flow from issue registry data."""
        self._entry = entry
        self._kind = kind

    async def async_step_init(
        self, user_input: dict[str, Any] | None = None
    ) -> FlowResult:
        """Route to the issue-specific repair step."""
        return await getattr(self, f"async_step_{self._kind}")(user_input)

    async def async_step_plex_unreachable(
        self, user_input: dict[str, Any] | None = None
    ) -> FlowResult:
        """Retry Plex and close the issue once it responds."""
        errors: dict[str, str] = {}
        if user_input is not None:
            coordinator = self.hass.data.get(DOMAIN, {}).get(self._entry.entry_id)
            if coordinator is not None:
                await coordinator.async_request_refresh()
            if coordinator is not None and coordinator.last_update_success:
                return self.async_create_entry(data={})
            errors["base"] = "cannot_connect"
        return self.async_show_form(
            step_id="plex_unreachable", data_schema=vol.Schema({}), errors=errors
        )

    async def async_step_missing_source(
        self, user_input: dict[str, Any] | None = None
    ) -> FlowResult:
        """Replace a deleted or renamed library/collection."""
        coordinator = self.hass.data.get(DOMAIN, {}).get(self._entry.entry_id)
        if coordinator is None:
            return self.async_abort(reason="not_loaded")
        try:
            libraries = await coordinator._client.async_movie_libraries()  # noqa: SLF001
        except Exception:  # noqa: BLE001 - Plex boundary shown as form error
            return self.async_show_form(
                step_id="missing_source",
                data_schema=vol.Schema({}),
                errors={"base": "cannot_connect"},
            )
        sources = {
            f"{library.title}::": f"{library.title} — All movies"
            for library in libraries
        }
        for library in libraries:
            sources.update(
                {
                    f"{library.title}::{name}": f"{library.title} — {name}"
                    for name in library.collections
                }
            )
        if user_input is not None:
            library, collection = user_input["source"].split("::", 1)
            options = {
                **self._entry.options,
                CONF_LIBRARY: library,
                CONF_COLLECTION: collection or None,
            }
            self.hass.config_entries.async_update_entry(self._entry, options=options)
            await self.hass.config_entries.async_reload(self._entry.entry_id)
            return self.async_create_entry(data={})
        return self.async_show_form(
            step_id="missing_source",
            data_schema=vol.Schema({vol.Required("source"): vol.In(sources)}),
        )

    async def async_step_invalid_logo(
        self, user_input: dict[str, Any] | None = None
    ) -> FlowResult:
        """Replace or clear a missing /local/ logo path."""
        errors: dict[str, str] = {}
        if user_input is not None:
            logo_url = str(user_input[CONF_LOGO_URL]).strip()
            supported = not logo_url or logo_url.startswith(("/local/", "https://"))
            if not supported or not await async_validate_logo(
                self.hass, self._entry.entry_id, logo_url
            ):
                errors[CONF_LOGO_URL] = "invalid_logo"
            else:
                options = {**self._entry.options, CONF_LOGO_URL: logo_url}
                self.hass.config_entries.async_update_entry(
                    self._entry, options=options
                )
                await self.hass.config_entries.async_reload(self._entry.entry_id)
                return self.async_create_entry(data={})
        schema = vol.Schema(
            {
                vol.Optional(
                    CONF_LOGO_URL,
                    default=self._entry.options.get(CONF_LOGO_URL, ""),
                ): str
            }
        )
        return self.async_show_form(
            step_id="invalid_logo", data_schema=schema, errors=errors
        )


async def async_create_fix_flow(
    hass: HomeAssistant, issue_id_value: str, data: dict[str, Any] | None
) -> RepairsFlow:
    """Create a fix flow for a Movie Poster issue."""
    if not data or not (entry := hass.config_entries.async_get_entry(data["entry_id"])):
        msg = f"Unknown Movie Poster repair issue: {issue_id_value}"
        raise ValueError(msg)
    return MoviePosterRepairFlow(entry, str(data["kind"]))
