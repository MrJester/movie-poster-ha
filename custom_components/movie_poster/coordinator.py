"""Runtime coordination for Plex playback and display mode."""

from __future__ import annotations

import asyncio
import logging
import time
from contextlib import suppress
from dataclasses import asdict, dataclass
from datetime import UTC, datetime, timedelta
from typing import TYPE_CHECKING

from homeassistant.config_entries import ConfigEntryAuthFailed
from homeassistant.helpers.storage import Store
from homeassistant.helpers.update_coordinator import DataUpdateCoordinator, UpdateFailed

from .const import DOMAIN
from .exceptions import PlexAuthenticationError
from .models import DisplayMode, MediaPresentation
from .resolver import select_session
from .rotation import ShuffleBag
from .state_machine import DisplayModeMachine, ModeSnapshot

_MOVIE_PAGE_SIZE = 100
_LOGGER = logging.getLogger(__name__)

if TYPE_CHECKING:
    from homeassistant.core import HomeAssistant

    from .models import PlaybackPolicy, SessionCandidate
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
            logger=_LOGGER,
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
        self._movie_refresh_total: int | None = None
        self._library_last_refresh: str | None = None
        self._library_refresh_task: asyncio.Task[None] | None = None
        self._bag = ShuffleBag[str]()
        self._coming_soon: MediaPresentation | None = None
        self._defer_library_refresh = True
        self._store = Store[dict](hass, 1, f"{DOMAIN}.{entry_id}.rotation")
        self._library_store = Store[dict](hass, 1, f"{DOMAIN}.{entry_id}.library")
        self._restored_rotation: tuple[list[str], str | None] | None = None

    async def async_initialize(self) -> None:
        """Restore the Coming Soon cycle before the first refresh."""
        stored, library = await asyncio.gather(
            self._store.async_load(), self._library_store.async_load()
        )
        remaining = stored.get("remaining") if isinstance(stored, dict) else None
        last = stored.get("last") if isinstance(stored, dict) else None
        if isinstance(remaining, list) and all(
            isinstance(item, str) for item in remaining
        ):
            self._restored_rotation = (
                remaining,
                last if isinstance(last, str) else None,
            )
        self._restore_library(library)

    async def async_shutdown(self) -> None:
        """Cancel background hydration before unloading the config entry."""
        task = getattr(self, "_library_refresh_task", None)
        if task is None or task.done():
            return
        task.cancel()
        with suppress(asyncio.CancelledError):
            await task

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
        """Start a Plex library refresh without blocking the caller."""
        self._library_refresh_due = 0.0
        self._start_library_refresh()

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
    def library_hydration_percent(self) -> int | None:
        """Return known hydration progress, or None when Plex omits a total."""
        if not self._movie_refresh_in_progress:
            return 100 if self._movies else None
        if not self._movie_refresh_total:
            return None
        return min(
            99,
            round(
                len(self._movie_refresh_buffer) * 100 / self._movie_refresh_total
            ),
        )

    @property
    def library_last_refresh(self) -> str | None:
        """Return the last successful full refresh timestamp."""
        return self._library_last_refresh

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
                self._start_library_refresh(now)
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

    def _start_library_refresh(self, now: float | None = None) -> None:
        """Start one tracked sequential hydration task when refresh is due."""
        if self._library_title is None:
            return
        task = getattr(self, "_library_refresh_task", None)
        if task is not None and not task.done():
            return
        current = time.monotonic() if now is None else now
        if not self._movie_refresh_in_progress and current < self._library_refresh_due:
            return
        self._library_refresh_task = self.hass.async_create_task(
            self._async_refresh_movies_until_complete(),
            f"{DOMAIN}_{self.entry_id}_library_refresh",
        )

    async def _async_refresh_movies_until_complete(self) -> None:
        """Hydrate every Plex page independently from playback polling."""
        try:
            while True:
                await self._async_refresh_movies(time.monotonic())
                self.async_update_listeners()
                if not self._movie_refresh_in_progress:
                    break
                await asyncio.sleep(0)
        except (ConfigEntryAuthFailed, UpdateFailed) as err:
            self.async_set_update_error(err)
            _LOGGER.warning(
                "Movie Poster library refresh failed: %s", type(err).__name__
            )
        finally:
            self._library_refresh_task = None

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
        if page.total is not None:
            self._movie_refresh_total = page.total
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
            self._movie_refresh_total = len(self._movies)
            self._library_last_refresh = datetime.now(UTC).isoformat()
            self._library_refresh_due = now + self._library_refresh_seconds
            library_store = getattr(self, "_library_store", None)
            if library_store is not None:
                library_store.async_delay_save(self._library_state, delay=5)
        else:
            self._movie_refresh_offset += len(page.items)

    def _rotation_state(self) -> dict[str, object]:
        """Return JSON-safe rotation state for delayed persistence."""
        return {"remaining": list(self._bag.snapshot()), "last": self._bag.last}

    def _library_state(self) -> dict[str, object]:
        """Return a JSON-safe snapshot used for instant restart recovery."""
        return {
            "library": self._library_title,
            "collection": self._collection_title,
            "last_refresh": self._library_last_refresh,
            "movies": [asdict(movie) for movie in self._movies.values()],
        }

    def _restore_library(self, stored: object) -> None:
        """Restore a compatible cached movie pool and shuffle state."""
        if not isinstance(stored, dict) or (
            stored.get("library") != self._library_title
            or stored.get("collection") != self._collection_title
        ):
            return
        raw_movies = stored.get("movies")
        if not isinstance(raw_movies, list):
            return
        restored: dict[str, MediaPresentation] = {}
        for raw_movie in raw_movies:
            if not isinstance(raw_movie, dict):
                continue
            try:
                movie = MediaPresentation(**raw_movie)
            except TypeError:
                continue
            restored[movie.key] = movie
        self._movies = restored
        self._bag.replace(restored)
        if self._restored_rotation is not None:
            remaining, last = self._restored_rotation
            self._bag.restore(remaining, last)
            self._restored_rotation = None
        last_refresh = stored.get("last_refresh")
        self._library_last_refresh = (
            last_refresh if isinstance(last_refresh, str) else None
        )
