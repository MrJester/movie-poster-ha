"""Runtime coordination for Plex playback and display mode."""

from __future__ import annotations

import time
from dataclasses import dataclass
from datetime import timedelta
from typing import TYPE_CHECKING

from homeassistant.helpers.update_coordinator import DataUpdateCoordinator, UpdateFailed

from .models import DisplayMode
from .normalizer import normalize_movie, normalize_session
from .resolver import select_session
from .rotation import ShuffleBag
from .state_machine import DisplayModeMachine, ModeSnapshot

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
        self._bag = ShuffleBag[str]()
        self._coming_soon: MediaPresentation | None = None

    async def async_artwork(self, kind: str) -> tuple[bytes, str] | None:
        """Fetch artwork for the currently displayed media."""
        media = self.data.media if self.data is not None else None
        if media is None:
            return None
        path = media.poster_path if kind == "poster" else media.backdrop_path
        if path is None:
            return None
        return await self._client.async_artwork(path)

    async def _async_update_data(self) -> CoordinatorData:
        try:
            raw_sessions = await self._client.async_sessions()
        except Exception as err:
            message = f"Unable to retrieve Plex sessions: {err}"
            raise UpdateFailed(message) from err

        normalized = [normalize_session(session) for session in raw_sessions]
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
            await self._async_refresh_movies(now)
            if self._coming_soon is None or now >= self._rotation_due:
                key = self._bag.next()
                self._coming_soon = self._movies.get(key) if key else None
                self._rotation_due = now + self._rotation_seconds
        media = (
            playing_media
            if mode.mode is DisplayMode.NOW_PLAYING
            else self._coming_soon
        )
        return CoordinatorData(mode=mode, selected_session=selected, media=media)

    async def _async_refresh_movies(self, now: float) -> None:
        if self._library_title is None or now < self._library_refresh_due:
            return
        try:
            raw_movies = await self._client.async_movies(
                self._library_title, self._collection_title
            )
        except Exception as err:
            message = f"Unable to retrieve Plex movie library: {err}"
            raise UpdateFailed(message) from err
        movies = [normalize_movie(movie) for movie in raw_movies]
        self._movies = {movie.key: movie for movie in movies}
        self._bag.replace(self._movies)
        self._library_refresh_due = now + self._library_refresh_seconds
