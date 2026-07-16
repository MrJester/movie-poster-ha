"""Guided Plex authentication and account resource discovery."""

from __future__ import annotations

from dataclasses import dataclass
from typing import TYPE_CHECKING
from uuid import uuid4

if TYPE_CHECKING:
    from homeassistant.core import HomeAssistant
    from plexapi.myplex import MyPlexPinLogin

_PRODUCT = "Movie Poster for Home Assistant"


class PlexAuthError(Exception):
    """Raised when guided Plex authentication fails or expires."""


@dataclass(frozen=True, slots=True)
class PlexServerChoice:
    """A Plex server and preferred connection discovered from an account."""

    machine_identifier: str
    name: str
    url: str
    local: bool
    relay: bool


class PlexAuthSession:
    """Run Python-PlexAPI's blocking OAuth/PIN helper safely."""

    def __init__(self, hass: HomeAssistant) -> None:
        """Initialize a guided authentication session."""
        self._hass = hass
        self._login: MyPlexPinLogin | None = None
        self.authorization_url: str | None = None

    async def async_start(self) -> str:
        """Create the Plex PIN, start polling, and return the approval URL."""
        self.authorization_url = await self._hass.async_add_executor_job(self._start)
        return self.authorization_url

    def _start(self) -> str:
        from plexapi.myplex import MyPlexPinLogin  # noqa: PLC0415

        headers = {
            "X-Plex-Client-Identifier": str(uuid4()),
            "X-Plex-Product": _PRODUCT,
            "X-Plex-Version": "0.1.0",
        }
        self._login = MyPlexPinLogin(headers=headers, oauth=True)
        url = self._login.oauthUrl()
        self._login.run(timeout=300)
        return url

    async def async_wait_for_token(self) -> str:
        """Wait for user approval without blocking Home Assistant."""
        token = await self._hass.async_add_executor_job(self._wait_for_token)
        if not token:
            raise PlexAuthError
        return token

    def _wait_for_token(self) -> str | None:
        if self._login is None or not self._login.waitForLogin():
            return None
        return self._login.token

    async def async_servers(self, token: str) -> list[PlexServerChoice]:
        """Return accessible Plex Media Servers, preferring local connections."""
        return await self._hass.async_add_executor_job(self._servers, token)

    @staticmethod
    def _servers(token: str) -> list[PlexServerChoice]:
        from plexapi.myplex import MyPlexAccount  # noqa: PLC0415

        account = MyPlexAccount(token=token)
        choices: list[PlexServerChoice] = []
        for resource in account.resources():
            if resource.product != "Plex Media Server":
                continue
            connections = sorted(
                resource.connections,
                key=lambda item: (not item.local, item.relay, item.uri),
            )
            if not connections:
                continue
            connection = connections[0]
            choices.append(
                PlexServerChoice(
                    machine_identifier=resource.clientIdentifier,
                    name=resource.name,
                    url=connection.uri,
                    local=connection.local,
                    relay=connection.relay,
                )
            )
        return sorted(choices, key=lambda item: item.name.casefold())
