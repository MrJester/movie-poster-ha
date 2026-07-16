"""Buttons controlling Movie Poster operation."""

from __future__ import annotations

from dataclasses import dataclass
from typing import TYPE_CHECKING, Final

from homeassistant.components.button import ButtonEntity, ButtonEntityDescription
from homeassistant.const import EntityCategory

from .const import DOMAIN
from .entity import MoviePosterEntity

if TYPE_CHECKING:
    from collections.abc import Awaitable, Callable

    from homeassistant.core import HomeAssistant
    from homeassistant.helpers.entity_platform import AddConfigEntryEntitiesCallback

    from . import MoviePosterConfigEntry
    from .coordinator import MoviePosterCoordinator


@dataclass(frozen=True, kw_only=True)
class MoviePosterButtonDescription(ButtonEntityDescription):
    """Describe a Movie Poster button action."""

    press_fn: Callable[[MoviePosterCoordinator], Awaitable[object]]


BUTTONS: Final = (
    MoviePosterButtonDescription(
        key="next_poster",
        translation_key="next_poster",
        icon="mdi:skip-next",
        press_fn=lambda coordinator: coordinator.async_next_poster(),
    ),
    MoviePosterButtonDescription(
        key="refresh_library",
        translation_key="refresh_library",
        icon="mdi:refresh",
        entity_category=EntityCategory.CONFIG,
        press_fn=lambda coordinator: coordinator.async_refresh_library(),
    ),
    MoviePosterButtonDescription(
        key="reset_shuffle",
        translation_key="reset_shuffle",
        icon="mdi:shuffle-disabled",
        entity_category=EntityCategory.CONFIG,
        press_fn=lambda coordinator: coordinator.async_next_poster(reset_cycle=True),
    ),
)


async def async_setup_entry(
    hass: HomeAssistant,
    entry: MoviePosterConfigEntry,
    async_add_entities: AddConfigEntryEntitiesCallback,
) -> None:
    """Set up Movie Poster buttons."""
    coordinator = hass.data[DOMAIN][entry.entry_id]
    async_add_entities(
        MoviePosterButton(coordinator, entry, description)
        for description in BUTTONS
    )


class MoviePosterButton(MoviePosterEntity, ButtonEntity):
    """One coordinator-backed Movie Poster button."""

    entity_description: MoviePosterButtonDescription

    def __init__(
        self,
        coordinator: MoviePosterCoordinator,
        entry: MoviePosterConfigEntry,
        description: MoviePosterButtonDescription,
    ) -> None:
        """Initialize the button."""
        super().__init__(coordinator, entry, description.key)
        self.entity_description = description

    async def async_press(self) -> None:
        """Run the configured coordinator action."""
        await self.entity_description.press_fn(self.coordinator)
