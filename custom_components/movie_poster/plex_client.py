"""Async boundary around the synchronous Python-PlexAPI client."""

from __future__ import annotations

from dataclasses import dataclass
from typing import TYPE_CHECKING, Any

from plexapi.server import PlexServer
from requests import Session

from .models import PlexMoviePage

if TYPE_CHECKING:
    from homeassistant.core import HomeAssistant

_REQUEST_TIMEOUT = 10


@dataclass(slots=True)
class PlexConnectionInfo:
    """Validated Plex server identity."""

    machine_identifier: str
    name: str
    version: str


@dataclass(frozen=True, slots=True)
class PlexLibraryChoice:
    """A selectable Plex movie library and its collections."""

    title: str
    collections: tuple[str, ...]


class PlexAuthenticationError(Exception):
    """Raised when Plex rejects the configured token."""


class PlexConnectionError(Exception):
    """Raised when a Plex server cannot be reached or queried."""


class MoviePosterPlexClient:
    """Keep all blocking Plex calls outside Home Assistant's event loop."""

    def __init__(
        self, hass: HomeAssistant, base_url: str, token: str, *, verify_ssl: bool
    ) -> None:
        """Initialize a Plex client without performing network I/O."""
        self._hass = hass
        self._base_url = base_url
        self._token = token
        self._verify_ssl = verify_ssl
        self._server: PlexServer | None = None

    async def async_connect(self) -> PlexConnectionInfo:
        """Connect and return the stable server identity."""
        return await self._hass.async_add_executor_job(self._connect)

    def _connect(self) -> PlexConnectionInfo:
        from plexapi.exceptions import Unauthorized  # noqa: PLC0415

        session = Session()
        session.verify = self._verify_ssl
        try:
            server = PlexServer(
                self._base_url,
                self._token,
                session=session,
                timeout=_REQUEST_TIMEOUT,
            )
        except Unauthorized as err:
            raise PlexAuthenticationError from err
        except Exception as err:
            raise PlexConnectionError from err
        self._server = server
        return PlexConnectionInfo(
            machine_identifier=server.machineIdentifier,
            name=server.friendlyName,
            version=server.version,
        )

    async def async_sessions(self) -> list[Any]:
        """Return active sessions; normalization occurs outside this adapter."""
        if self._server is None:
            await self.async_connect()
        return await self._hass.async_add_executor_job(self._sessions)

    def _sessions(self) -> list[Any]:
        if self._server is None:
            raise PlexConnectionError
        try:
            return self._server.sessions()
        except Exception as err:
            raise PlexConnectionError from err

    async def async_movie_libraries(self) -> list[PlexLibraryChoice]:
        """Return movie libraries and their collection names."""
        if self._server is None:
            await self.async_connect()
        return await self._hass.async_add_executor_job(self._movie_libraries)

    def _movie_libraries(self) -> list[PlexLibraryChoice]:
        if self._server is None:
            raise PlexConnectionError
        try:
            sections = self._server.library.sections()
            return [
                PlexLibraryChoice(
                    title=section.title,
                    collections=tuple(
                        sorted(
                            (collection.title for collection in section.collections()),
                            key=str.casefold,
                        )
                    ),
                )
                for section in sections
                if section.type == "movie"
            ]
        except Exception as err:
            raise PlexConnectionError from err

    async def async_movies(
        self, library_title: str, collection_title: str | None = None
    ) -> list[Any]:
        """Return movies from one library or an optional collection."""
        if self._server is None:
            await self.async_connect()
        return await self._hass.async_add_executor_job(
            self._movies, library_title, collection_title
        )

    async def async_movies_page(
        self,
        library_title: str,
        collection_title: str | None,
        *,
        offset: int,
        size: int,
    ) -> PlexMoviePage:
        """Return a bounded page so large libraries hydrate incrementally."""
        if self._server is None:
            await self.async_connect()
        return await self._hass.async_add_executor_job(
            self._movies_page,
            library_title,
            collection_title,
            offset,
            size,
        )

    def _movies(
        self, library_title: str, collection_title: str | None
    ) -> list[Any]:
        if self._server is None:
            raise PlexConnectionError
        try:
            section = self._server.library.section(library_title)
            if collection_title:
                return section.collection(collection_title).items()
            return section.all()
        except Exception as err:
            raise PlexConnectionError from err

    def _movies_page(
        self,
        library_title: str,
        collection_title: str | None,
        offset: int,
        size: int,
    ) -> PlexMoviePage:
        if self._server is None:
            raise PlexConnectionError
        try:
            section = self._server.library.section(library_title)
            if collection_title:
                items = tuple(section.collection(collection_title).items())
                return PlexMoviePage(items=items, complete=True)
            items = tuple(
                section.search(
                    container_start=offset,
                    container_size=size,
                    maxresults=size,
                )
            )
        except Exception as err:
            raise PlexConnectionError from err
        return PlexMoviePage(items=items, complete=len(items) < size)

    async def async_artwork(self, path: str) -> tuple[bytes, str]:
        """Fetch Plex artwork using the server-side authenticated session."""
        if self._server is None:
            await self.async_connect()
        return await self._hass.async_add_executor_job(self._artwork, path)

    def _artwork(self, path: str) -> tuple[bytes, str]:
        if self._server is None or not path.startswith("/"):
            raise PlexConnectionError
        try:
            response = self._server._session.get(  # noqa: SLF001
                f"{self._server._baseurl}{path}",  # noqa: SLF001
                params={"X-Plex-Token": self._token},
                timeout=30,
            )
            response.raise_for_status()
        except Exception as err:
            raise PlexConnectionError from err
        content_type = response.headers.get("Content-Type", "image/jpeg").split(
            ";", 1
        )[0]
        return response.content, content_type
