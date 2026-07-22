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
    owner_user_id: str
    player_ids_by_user: tuple[tuple[str, tuple[str, ...]], ...]


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
        """Return players and users registered with this Plex server."""
        if self._server is None:
            await self.async_connect()
        return await self._hass.async_add_executor_job(self._playback_choices)

    def _playback_choices(self) -> PlexPlaybackChoices:  # noqa: C901, PLR0912
        if self._server is None:
            raise PlexConnectionError
        players: dict[str, str] = {}
        users: dict[str, str] = {}
        account_ids: dict[int, str] = {}
        device_ids: dict[int, str] = {}
        player_ids_by_user: dict[str, set[str]] = {}
        for device in self._optional_server_items("systemDevices"):
            identifier = getattr(device, "clientIdentifier", None)
            name = getattr(device, "name", None)
            if identifier:
                player_id = str(identifier)
                players[player_id] = str(name or identifier)
                device_id = getattr(device, "id", None)
                if device_id is not None:
                    device_ids[int(device_id)] = player_id
        for client in self._optional_server_items("clients"):
            identifier = getattr(client, "machineIdentifier", None)
            name = getattr(client, "title", None) or getattr(
                client, "product", None
            )
            if identifier:
                players[str(identifier)] = str(name or identifier)
        for account in self._optional_server_items("systemAccounts"):
            name = getattr(account, "name", None)
            if name:
                user_id = str(name).casefold()
                users[user_id] = str(name)
                account_id = getattr(account, "id", None)
                if account_id is not None:
                    account_ids[int(account_id)] = user_id
        for record in self._optional_bandwidth_items():
            user_id = account_ids.get(getattr(record, "accountID", None))
            player_id = device_ids.get(getattr(record, "deviceID", None))
            if user_id and player_id:
                player_ids_by_user.setdefault(user_id, set()).add(player_id)
        for candidate in self._optional_session_candidates():
            players[candidate.player_id] = candidate.player_name
            player_ids_by_user.setdefault(candidate.user_id, set()).add(
                candidate.player_id
            )
        owner_user_id, owned_device_ids = self._optional_owner_choices(users)
        if owner_user_id:
            owner_players = player_ids_by_user.setdefault(owner_user_id, set())
            owner_players.update(owned_device_ids.intersection(players))
        return PlexPlaybackChoices(
            players=tuple(sorted(players.items(), key=lambda item: item[1].casefold())),
            users=tuple(sorted(users.items(), key=lambda item: item[1].casefold())),
            owner_user_id=owner_user_id,
            player_ids_by_user=tuple(
                (user_id, tuple(sorted(player_ids)))
                for user_id, player_ids in sorted(player_ids_by_user.items())
            ),
        )

    def _optional_bandwidth_items(self) -> tuple[Any, ...]:
        """Return aggregated user/device playback associations when available."""
        if self._server is None:
            return ()
        try:
            return tuple(self._server.bandwidth(timespan="months"))
        except Unauthorized as err:
            raise PlexAuthenticationError from err
        except (AttributeError, BadRequest, NotFound, RequestException):
            return ()

    def _optional_session_candidates(self) -> tuple[Any, ...]:
        """Return active sessions without making discovery depend on them."""
        if self._server is None:
            return ()
        try:
            return tuple(normalize_session(item) for item in self._server.sessions())
        except Unauthorized as err:
            raise PlexAuthenticationError from err
        except (AttributeError, BadRequest, NotFound, RequestException):
            return ()

    def _optional_owner_choices(
        self, users: dict[str, str]
    ) -> tuple[str, set[str]]:
        """Return the authenticated owner and that account's player devices."""
        if self._server is None:
            return "", set()
        try:
            account = self._server.myPlexAccount()
            devices = account.devices()
        except Unauthorized as err:
            raise PlexAuthenticationError from err
        except (AttributeError, BadRequest, NotFound, RequestException):
            return "", set()
        owner_user_id = ""
        for name in (
            getattr(account, "title", None),
            getattr(account, "username", None),
            getattr(account, "friendlyName", None),
        ):
            if name and str(name).casefold() in users:
                owner_user_id = str(name).casefold()
                break
        owned_device_ids = set()
        for device in devices:
            provides = getattr(device, "provides", ()) or ()
            if isinstance(provides, str):
                provides = provides.split(",")
            identifier = getattr(device, "clientIdentifier", None)
            if identifier and "player" in provides:
                owned_device_ids.add(str(identifier))
        return owner_user_id, owned_device_ids

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
