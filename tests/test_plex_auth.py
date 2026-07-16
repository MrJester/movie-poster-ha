"""Tests for Plex account resource selection."""

from types import SimpleNamespace
from unittest.mock import patch

import pytest

pytest.importorskip("plexapi")

from custom_components.movie_poster.plex_auth import PlexAuthSession


def connection(uri: str, *, local: bool, relay: bool = False) -> SimpleNamespace:
    """Create a Plex connection fixture."""
    return SimpleNamespace(uri=uri, local=local, relay=relay)


def test_servers_prefers_local_non_relay_connection() -> None:
    """Account discovery chooses the best endpoint for each server."""
    resource = SimpleNamespace(
        product="Plex Media Server",
        clientIdentifier="server-1",
        name="Theater",
        connections=[
            connection("https://relay.example", local=False, relay=True),
            connection("http://plex.local:32400", local=True),
        ],
    )
    account = SimpleNamespace(resources=lambda: [resource])
    with patch("plexapi.myplex.MyPlexAccount", return_value=account):
        choices = PlexAuthSession._servers("secret")

    assert len(choices) == 1
    assert choices[0].url == "http://plex.local:32400"
    assert choices[0].machine_identifier == "server-1"


def test_servers_ignores_non_server_resources() -> None:
    """Player applications are not offered as media servers."""
    player = SimpleNamespace(
        product="Plex for iOS",
        clientIdentifier="player-1",
        name="Phone",
        connections=[],
    )
    account = SimpleNamespace(resources=lambda: [player])
    with patch("plexapi.myplex.MyPlexAccount", return_value=account):
        assert PlexAuthSession._servers("secret") == []
