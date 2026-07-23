"""Tests for the Plex adapter's async boundary."""

from __future__ import annotations

import asyncio
import threading
from types import SimpleNamespace
from typing import TYPE_CHECKING, ClassVar

import pytest

pytest.importorskip("plexapi")

from custom_components.movie_poster.plex_client import MoviePosterPlexClient

if TYPE_CHECKING:
    from collections.abc import Callable


class FakeHass:
    """Run executor jobs in a real worker thread."""

    async def async_add_executor_job(
        self, target: Callable[..., object], *args: object
    ) -> object:
        """Match Home Assistant's executor helper for this boundary test."""
        return await asyncio.to_thread(target, *args)


class LazySession:
    """Fail if a Plex-style lazy attribute is read on the event-loop thread."""

    sessionKey = "session-1"  # noqa: N815
    ratingKey = "movie-1"  # noqa: N815
    type = "movie"
    title = "Example"
    usernames: ClassVar[list[str]] = ["Ryan"]
    player: ClassVar[SimpleNamespace] = SimpleNamespace(
        machineIdentifier="theater", title="Theater", state="playing"
    )

    def __init__(self, event_loop_thread: int) -> None:
        """Remember which thread must never perform lazy I/O."""
        self._event_loop_thread = event_loop_thread

    @property
    def tagline(self) -> str:
        """Represent a PlexPartialObject property that may trigger HTTP I/O."""
        assert threading.get_ident() != self._event_loop_thread
        return "Loaded lazily"


async def test_session_normalization_stays_inside_executor() -> None:
    """Potentially lazy Plex properties never run on Home Assistant's loop."""
    event_loop_thread = threading.get_ident()
    client = MoviePosterPlexClient(
        FakeHass(), "http://plex:32400", "test-token", verify_ssl=False
    )
    client._server = SimpleNamespace(
        sessions=lambda: [LazySession(event_loop_thread)]
    )

    normalized = await client.async_sessions()

    assert normalized[0][1].subtitle == "Loaded lazily"


async def test_playback_choices_group_server_players_by_user() -> None:
    """Owner devices are registered devices, not the owner's broad history."""
    client = MoviePosterPlexClient(
        FakeHass(), "http://plex:32400", "test-token", verify_ssl=False
    )
    client._server = SimpleNamespace(
        systemDevices=lambda: [
            SimpleNamespace(id=10, clientIdentifier="theater", name="Theater TV"),
            SimpleNamespace(id=11, clientIdentifier="guest-tv", name="Guest TV"),
        ],
        clients=lambda: [
            SimpleNamespace(machineIdentifier="laptop", title="Ryan's Laptop")
        ],
        systemAccounts=lambda: [
            SimpleNamespace(id=1, name="Ryan"),
            SimpleNamespace(id=2, name="Guest"),
        ],
        bandwidth=lambda **_: [
            SimpleNamespace(accountID=1, deviceID=10),
            SimpleNamespace(accountID=1, deviceID=11),
            SimpleNamespace(accountID=2, deviceID=11),
        ],
        sessions=list,
        myPlexAccount=lambda: SimpleNamespace(
            title="Ryan",
            devices=lambda: [
                SimpleNamespace(
                    clientIdentifier="theater",
                    name="Theater TV",
                    provides="player",
                ),
                SimpleNamespace(
                    clientIdentifier="owner-phone",
                    name="Owner Phone",
                    provides=["player"],
                ),
                SimpleNamespace(
                    clientIdentifier="server-id",
                    name="Plex Server",
                    provides="server",
                ),
            ],
        ),
    )

    choices = await client.async_playback_choices()

    assert choices.players == (
        ("guest-tv", "Guest TV"),
        ("owner-phone", "Owner Phone"),
        ("laptop", "Ryan's Laptop"),
        ("theater", "Theater TV"),
    )
    assert choices.users == (("guest", "Guest"), ("ryan", "Ryan"))
    assert choices.owner_user_id == "ryan"
    assert dict(choices.player_ids_by_user) == {
        "guest": ("guest-tv",),
        "ryan": ("owner-phone", "theater"),
    }
    assert "remote-player" not in dict(choices.players)
    assert "remote friend" not in dict(choices.users)
