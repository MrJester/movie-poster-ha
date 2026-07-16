"""Sensors exposing Movie Poster runtime state."""

from __future__ import annotations

from dataclasses import dataclass
from typing import TYPE_CHECKING, Final

from homeassistant.components.sensor import SensorEntity, SensorEntityDescription
from homeassistant.const import EntityCategory

from .const import DOMAIN
from .entity import MoviePosterEntity

if TYPE_CHECKING:
    from collections.abc import Callable

    from homeassistant.core import HomeAssistant
    from homeassistant.helpers.entity_platform import AddConfigEntryEntitiesCallback

    from . import MoviePosterConfigEntry
    from .coordinator import MoviePosterCoordinator


@dataclass(frozen=True, kw_only=True)
class MoviePosterSensorDescription(SensorEntityDescription):
    """Describe a Movie Poster sensor value."""

    value_fn: Callable[[MoviePosterCoordinator], str | int | None]


SENSORS: Final = (
    MoviePosterSensorDescription(
        key="display_mode",
        translation_key="display_mode",
        icon="mdi:theater",
        value_fn=lambda coordinator: coordinator.data.mode.mode,
    ),
    MoviePosterSensorDescription(
        key="current_title",
        translation_key="current_title",
        icon="mdi:movie-open",
        value_fn=lambda coordinator: (
            coordinator.data.media.title if coordinator.data.media else None
        ),
    ),
    MoviePosterSensorDescription(
        key="loaded_movies",
        translation_key="loaded_movies",
        icon="mdi:movie-filter",
        native_unit_of_measurement="movies",
        entity_category=EntityCategory.DIAGNOSTIC,
        value_fn=lambda coordinator: coordinator.loaded_movie_count,
    ),
    MoviePosterSensorDescription(
        key="remaining_movies",
        translation_key="remaining_movies",
        icon="mdi:shuffle-variant",
        native_unit_of_measurement="movies",
        entity_category=EntityCategory.DIAGNOSTIC,
        value_fn=lambda coordinator: coordinator.remaining_movie_count,
    ),
)


async def async_setup_entry(
    hass: HomeAssistant,
    entry: MoviePosterConfigEntry,
    async_add_entities: AddConfigEntryEntitiesCallback,
) -> None:
    """Set up Movie Poster sensors."""
    coordinator = hass.data[DOMAIN][entry.entry_id]
    async_add_entities(
        MoviePosterSensor(coordinator, entry, description)
        for description in SENSORS
    )


class MoviePosterSensor(MoviePosterEntity, SensorEntity):
    """One coordinator-backed Movie Poster sensor."""

    entity_description: MoviePosterSensorDescription

    def __init__(
        self,
        coordinator: MoviePosterCoordinator,
        entry: MoviePosterConfigEntry,
        description: MoviePosterSensorDescription,
    ) -> None:
        """Initialize the sensor."""
        super().__init__(coordinator, entry, description.key)
        self.entity_description = description

    @property
    def native_value(self) -> str | int | None:
        """Return the current coordinator value."""
        return self.entity_description.value_fn(self.coordinator)
