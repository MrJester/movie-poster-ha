"""Async boundary around the synchronous Python-PlexAPI client."""

from __future__ import annotations

from dataclasses import dataclass
from typing import TYPE_CHECKING, Any

from plexapi.exceptions import BadRequest, NotFound, Unauthorized
from plexapi.server import PlexServer
from requests import Session
from requests.exceptions import RequestException

from .exceptions import PlexAuthenticationError, PlexConnectionError
from .models import PlexMoviePage
from .normalizer import normalize_movie, normalize_session

if TYPE_CHECKING:
    from homeassistant.core import HomeAssistant
    from plexapi.myplex import MyPlexAccount

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


@dataclass(frozen=True, slots=True)
class PlexPlaybackChoices:
    """Plex players and users selectable even while nothing is playing."""

    players: tuple[tuple[str, str], ...]
    users: tuple[tuple[str, str], ...]


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

    async def async_sessions(self) -> list[tuple[Any, Any]]:
        """Return active sessions normalized inside the executor boundary."""
        if self._server is None:
            await self.async_connect()
        return await self._hass.async_add_executor_job(self._sessions)

    def _sessions(self) -> list[tuple[Any, Any]]:
        if self._server is None:
            raise PlexConnectionError
        try:
            return [normalize_session(session) for session in self._server.sessions()]
        except Unauthorized as err:
            raise PlexAuthenticationError from err
        except Exception as err:
            raise PlexConnectionError from err

    async def async_playback_choices(self) -> PlexPlaybackChoices:
        """Return players and Plex Home users owned by this Plex account."""
        if self._server is None:
            await self.async_connect()
        return await self._hass.async_add_executor_job(self._playback_choices)

    def _playback_choices(self) -> PlexPlaybackChoices:
        if self._server is None:
            raise PlexConnectionError
        players: dict[str, str] = {}
        users: dict[str, str] = {}
        account = self._optional_myplex_account()
        if account is None:
            return PlexPlaybackChoices(players=(), users=())

        for device in account.devices():
            identifier = getattr(device, "clientIdentifier", None)
            name = getattr(device, "name", None)
            provides = getattr(device, "provides", ()) or ()
            if isinstance(provides, str):
                provides = provides.split(",")
            if identifier and "player" in provides:
                players[str(identifier)] = str(name or identifier)
        owner_name = (
            getattr(account, "title", None)
            or getattr(account, "username", None)
            or getattr(account, "friendlyName", None)
        )
        if owner_name:
            users[str(owner_name).casefold()] = str(owner_name)
        for user in account.users():
            if not getattr(user, "home", False):
                continue
            name = getattr(user, "title", None) or getattr(user, "username", None)
            if name:
                users[str(name).casefold()] = str(name)
        return PlexPlaybackChoices(
            players=tuple(sorted(players.items(), key=lambda item: item[1].casefold())),
            users=tuple(sorted(users.items(), key=lambda item: item[1].casefold())),
        )

    def _optional_myplex_account(self) -> MyPlexAccount | None:
        """Return the authenticated Plex account when plex.tv is reachable."""
        if self._server is None:
            return None
        try:
            return self._server.myPlexAccount()
        except Unauthorized as err:
            raise PlexAuthenticationError from err
        except (AttributeError, BadRequest, NotFound, RequestException):
            return None

    def _optional_server_items(self, method: str) -> tuple[Any, ...]:
        """Return optional discovery results without failing all Studio choices."""
        if self._server is None:
            return ()
        try:
            return tuple(getattr(self._server, method)())
        except Unauthorized as err:
            raise PlexAuthenticationError from err
        except (AttributeError, BadRequest, NotFound, RequestException):
            return ()

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
        except Unauthorized as err:
            raise PlexAuthenticationError from err
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
        except Unauthorized as err:
            raise PlexAuthenticationError from err
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
                items = tuple(
                    normalize_movie(item)
                    for item in section.collection(collection_title).items()
                )
                return PlexMoviePage(items=items, complete=True, total=len(items))
            raw_items = tuple(
                section.search(
                    container_start=offset,
                    container_size=size,
                    maxresults=size,
                )
            )
        except Unauthorized as err:
            raise PlexAuthenticationError from err
        except Exception as err:
            raise PlexConnectionError from err
        return PlexMoviePage(
            items=tuple(normalize_movie(item) for item in raw_items),
            complete=len(raw_items) < size,
            total=_section_total(section),
        )

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


def _section_total(section: object) -> int | None:
    """Return Plex's library size when the server exposes it."""
    total = getattr(section, "totalSize", None)
    if callable(total):
        total = total()
    return total if isinstance(total, int) else None
