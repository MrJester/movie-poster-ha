"""Shared entities for Movie Poster."""

from __future__ import annotations

from typing import TYPE_CHECKING

from homeassistant.helpers.device_registry import DeviceInfo
from homeassistant.helpers.update_coordinator import CoordinatorEntity

from .const import DOMAIN

if TYPE_CHECKING:
    from . import MoviePosterConfigEntry
    from .coordinator import MoviePosterCoordinator


class MoviePosterEntity(CoordinatorEntity["MoviePosterCoordinator"]):
    """Base entity attached to one Movie Poster configuration."""

    _attr_has_entity_name = True

    def __init__(
        self,
        coordinator: MoviePosterCoordinator,
        entry: MoviePosterConfigEntry,
        entity_key: str,
    ) -> None:
        """Initialize a Movie Poster entity."""
        super().__init__(coordinator)
        self._attr_unique_id = f"{entry.entry_id}_{entity_key}"
        self._attr_device_info = DeviceInfo(
            identifiers={(DOMAIN, entry.entry_id)},
            name="Movie Poster",
            manufacturer="MrJester",
            model="Plex Theater Display",
        )
