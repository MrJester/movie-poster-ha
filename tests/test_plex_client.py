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


async def test_playback_choices_only_include_server_devices_and_local_users() -> None:
    """Studio excludes account-wide Plex.tv devices and users."""
    client = MoviePosterPlexClient(
        FakeHass(), "http://plex:32400", "test-token", verify_ssl=False
    )
    client._server = SimpleNamespace(
        systemDevices=lambda: [
            SimpleNamespace(clientIdentifier="theater", name="Theater TV")
        ],
        clients=lambda: [
            SimpleNamespace(machineIdentifier="laptop", title="Ryan's Laptop")
        ],
        systemAccounts=lambda: [
            SimpleNamespace(name="Ryan"),
            SimpleNamespace(name="Guest"),
        ],
        myPlexAccount=lambda: SimpleNamespace(
            devices=lambda: [
                SimpleNamespace(clientIdentifier="remote-player", name="Remote Player")
            ],
            users=lambda: [SimpleNamespace(title="Remote Friend")],
        ),
    )

    choices = await client.async_playback_choices()

    assert choices.players == (
        ("laptop", "Ryan's Laptop"),
        ("theater", "Theater TV"),
    )
    assert choices.users == (("guest", "Guest"), ("ryan", "Ryan"))
    assert "remote-player" not in dict(choices.players)
    assert "remote friend" not in dict(choices.users)
