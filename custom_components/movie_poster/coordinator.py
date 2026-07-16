"""Runtime coordination for Plex playback and display mode."""

from __future__ import annotations

import time
from dataclasses import dataclass
from datetime import timedelta
from typing import TYPE_CHECKING

from homeassistant.config_entries import ConfigEntryAuthFailed
from homeassistant.helpers.storage import Store
from homeassistant.helpers.update_coordinator import DataUpdateCoordinator, UpdateFailed

from .const import DOMAIN
from .exceptions import PlexAuthenticationError
from .models import DisplayMode
from .resolver import select_session
from .rotation import ShuffleBag
from .state_machine import DisplayModeMachine, ModeSnapshot

_MOVIE_PAGE_SIZE = 100

if TYPE_CHECKING:
    from homeassistant.core import HomeAssistant

    from .models import MediaPresentation, PlaybackPolicy, SessionCandidate
    from .plex_client import MoviePosterPlexClient


@dataclass(frozen=True, slots=True)
class CoordinatorData:
    """Normalized runtime state consumed by entities and the frontend."""

    mode: ModeSnapshot
    selected_session: SessionCandidate | None
    media: MediaPresentation | None


class MoviePosterCoordinator(DataUpdateCoordinator[CoordinatorData]):
    """Reconcile Plex state while keeping presentation decisions deterministic."""

    def __init__(  # noqa: PLR0913 - explicit runtime policy dependencies
        self,
        hass: HomeAssistant,
        client: MoviePosterPlexClient,
        *,
        policy: PlaybackPolicy,
        grace_seconds: float,
        library_title: str | None = None,
        collection_title: str | None = None,
        rotation_seconds: float = 15,
        library_refresh_seconds: float = 900,
        theme: str = "classic",
        show_summary: bool = True,
        show_progress: bool = True,
        show_session: bool = True,
        enable_motion: bool = True,
        kiosk_mode: bool = True,
        orientation: str = "auto",
        layout: str = "cinematic",
        frame_theme: str = "marquee",
        accent_color: str = "#f6cf70",
        background_color: str = "#090706",
        heading_font: str = "cinematic",
        body_font: str = "system",
        now_playing_text: str = "Now Playing",
        coming_soon_text: str = "Coming Soon",
        eyebrow_text: str = "Theater Presentation",
        logo_url: str = "",
        logo_position: str = "right",
        entry_id: str = "",
    ) -> None:
        """Initialize the coordinator."""
        super().__init__(
            hass,
            logger=__import__("logging").getLogger(__name__),
            name="Movie Poster",
            update_interval=timedelta(seconds=5),
            always_update=False,
        )
        self.entry_id = entry_id
        self.theme = theme
        self.show_summary = show_summary
        self.show_progress = show_progress
        self.show_session = show_session
        self.enable_motion = enable_motion
        self.kiosk_mode = kiosk_mode
        self.orientation = orientation
        self.layout = layout
        self.frame_theme = frame_theme
        self.accent_color = accent_color
        self.background_color = background_color
        self.heading_font = heading_font
        self.body_font = body_font
        self.now_playing_text = now_playing_text
        self.coming_soon_text = coming_soon_text
        self.eyebrow_text = eyebrow_text
        self.logo_url = logo_url
        self.logo_position = logo_position
        self.presentation_revision = 0
        self._client = client
        self._policy = policy
        self._mode = DisplayModeMachine(grace_seconds)
        self._library_title = library_title
        self._collection_title = collection_title
        self._rotation_seconds = rotation_seconds
        self._library_refresh_seconds = library_refresh_seconds
        self._library_refresh_due = 0.0
        self._rotation_due = 0.0
        self._movies: dict[str, MediaPresentation] = {}
        self._movie_refresh_buffer: dict[str, MediaPresentation] = {}
        self._movie_refresh_offset = 0
        self._movie_refresh_in_progress = False
        self._bag = ShuffleBag[str]()
        self._coming_soon: MediaPresentation | None = None
        self._defer_library_refresh = True
        self._store = Store[dict](hass, 1, f"{DOMAIN}.{entry_id}.rotation")
        self._restored_rotation: tuple[list[str], str | None] | None = None

    async def async_initialize(self) -> None:
        """Restore the Coming Soon cycle before the first refresh."""
        stored = await self._store.async_load()
        if not isinstance(stored, dict):
            return
        remaining = stored.get("remaining")
        last = stored.get("last")
        if isinstance(remaining, list) and all(
            isinstance(item, str) for item in remaining
        ):
            self._restored_rotation = (
                remaining,
                last if isinstance(last, str) else None,
            )

    async def async_artwork(self, kind: str) -> tuple[bytes, str] | None:
        """Fetch artwork for the currently displayed media."""
        media = self.data.media if self.data is not None else None
        if media is None:
            return None
        path = media.poster_path if kind == "poster" else media.backdrop_path
        if path is None:
            return None
        return await self._client.async_artwork(path)

    async def async_next_poster(self, *, reset_cycle: bool = False) -> bool:
        """Advance Coming Soon immediately, optionally starting a new shuffle cycle."""
        if self.data is None or self.data.mode.mode is not DisplayMode.COMING_SOON:
            return False
        if reset_cycle:
            self._bag.reset(self._coming_soon.key if self._coming_soon else None)
        key = self._bag.next()
        media = self._movies.get(key) if key else None
        if media is None:
            return False
        self._coming_soon = media
        self._rotation_due = time.monotonic() + self._rotation_seconds
        self._store.async_delay_save(self._rotation_state, delay=30)
        self.async_set_updated_data(
            CoordinatorData(
                mode=self.data.mode,
                selected_session=self.data.selected_session,
                media=media,
            )
        )
        return True

    async def async_refresh_library(self) -> None:
        """Make the Plex library eligible for refresh on the next update."""
        self._library_refresh_due = 0.0
        await self.async_request_refresh()

    @property
    def loaded_movie_count(self) -> int:
        """Return the number of movies currently available to rotation."""
        return len(self._movies)

    @property
    def remaining_movie_count(self) -> int:
        """Return the number of movies left in the current shuffle cycle."""
        return len(self._bag.snapshot())

    @property
    def library_hydrating(self) -> bool:
        """Return whether Plex library pages are currently being loaded."""
        return self._movie_refresh_in_progress

    @property
    def source_name(self) -> str | None:
        """Return the configured Coming Soon collection or library name."""
        return self._collection_title or self._library_title

    async def _async_update_data(self) -> CoordinatorData:
        try:
            raw_sessions = await self._client.async_sessions()
        except PlexAuthenticationError as err:
            raise ConfigEntryAuthFailed from err
        except Exception as err:
            message = f"Unable to retrieve Plex sessions: {err}"
            raise UpdateFailed(message) from err

        normalized = raw_sessions
        media_by_session = {
            candidate.session_id: media for candidate, media in normalized
        }
        selected = select_session(
            (candidate for candidate, _media in normalized), self._policy
        )
        playback = selected.state if selected is not None else None
        now = time.monotonic()
        mode = self._mode.update(playback, monotonic_now=now)
        playing_media = (
            media_by_session.get(selected.session_id) if selected is not None else None
        )
        if mode.mode is DisplayMode.COMING_SOON:
            if self._defer_library_refresh:
                self._defer_library_refresh = False
            else:
                await self._async_refresh_movies(now)
            if self._coming_soon is None or now >= self._rotation_due:
                key = self._bag.next()
                self._coming_soon = self._movies.get(key) if key else None
                self._rotation_due = now + self._rotation_seconds
                self._store.async_delay_save(self._rotation_state, delay=30)
        media = (
            playing_media
            if mode.mode is DisplayMode.NOW_PLAYING
            else self._coming_soon
        )
        return CoordinatorData(mode=mode, selected_session=selected, media=media)

    async def _async_refresh_movies(self, now: float) -> None:
        if self._library_title is None or (
            not self._movie_refresh_in_progress and now < self._library_refresh_due
        ):
            return
        if not self._movie_refresh_in_progress:
            self._movie_refresh_in_progress = True
            self._movie_refresh_offset = 0
            self._movie_refresh_buffer = {}
        try:
            page = await self._client.async_movies_page(
                self._library_title,
                self._collection_title,
                offset=self._movie_refresh_offset,
                size=_MOVIE_PAGE_SIZE,
            )
        except PlexAuthenticationError as err:
            self._movie_refresh_in_progress = False
            raise ConfigEntryAuthFailed from err
        except Exception as err:
            self._movie_refresh_in_progress = False
            message = f"Unable to retrieve Plex movie library: {err}"
            raise UpdateFailed(message) from err
        movie_page = {movie.key: movie for movie in page.items}
        self._movie_refresh_buffer.update(movie_page)
        self._movies.update(movie_page)
        self._bag.replace(self._movies)
        if page.complete:
            self._movies = self._movie_refresh_buffer
            self._bag.replace(self._movies)
            if (
                restored_rotation := getattr(self, "_restored_rotation", None)
            ) is not None:
                remaining, last = restored_rotation
                if (coming_soon := getattr(self, "_coming_soon", None)) is not None:
                    remaining = [
                        key for key in remaining if key != coming_soon.key
                    ]
                    last = coming_soon.key
                self._bag.restore(remaining, last)
                self._restored_rotation = None
            self._movie_refresh_in_progress = False
            self._movie_refresh_offset = 0
            self._library_refresh_due = now + self._library_refresh_seconds
        else:
            self._movie_refresh_offset += len(page.items)

    def _rotation_state(self) -> dict[str, object]:
        """Return JSON-safe rotation state for delayed persistence."""
        return {"remaining": list(self._bag.snapshot()), "last": self._bag.last}
