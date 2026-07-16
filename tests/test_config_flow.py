"""Tests for Movie Poster configuration flow transitions."""

import asyncio
from types import SimpleNamespace

from homeassistant.data_entry_flow import FlowResultType

from custom_components.movie_poster.config_flow import (
    MoviePosterConfigFlow,
    _discovery_identifier,
)


class FakeAuth:
    """Return one Plex server after authorization."""

    async def async_servers(self, token: str) -> list[SimpleNamespace]:
        """Return a server available to the approved account."""
        assert token == "approved-token"  # noqa: S105 - synthetic test token
        return [SimpleNamespace(machine_identifier="server-1")]


async def test_completed_plex_auth_finishes_progress_before_server_form() -> None:
    """An approved Plex PIN uses HA's required progress-done transition."""
    flow = MoviePosterConfigFlow()
    flow.flow_id = "test-flow"
    flow.context = {}
    flow._auth = FakeAuth()
    flow._auth_task = asyncio.create_task(asyncio.sleep(0, result="approved-token"))
    await flow._auth_task

    result = await flow.async_step_plex_auth()

    assert result["type"] is FlowResultType.SHOW_PROGRESS_DONE
    assert result["step_id"] == "select_server"
    assert flow._servers == {"server-1": flow._servers["server-1"]}


async def test_completed_reauth_returns_to_existing_server() -> None:
    """Reauthentication updates the existing entry instead of creating another."""
    flow = MoviePosterConfigFlow()
    flow.flow_id = "test-flow"
    flow.context = {}
    flow._auth = FakeAuth()
    flow._reauth_entry = SimpleNamespace(unique_id="server-1")
    flow._auth_task = asyncio.create_task(asyncio.sleep(0, result="approved-token"))
    await flow._auth_task

    result = await flow.async_step_plex_auth()

    assert result["type"] is FlowResultType.SHOW_PROGRESS_DONE
    assert result["step_id"] == "reauth_complete"


def test_discovery_identifier_accepts_plex_txt_key_variants() -> None:
    """Discovery matches configured Plex identity despite TXT key spelling."""
    assert _discovery_identifier({"MachineIdentifier": "server-1"}) == "server-1"
    assert _discovery_identifier({"Resource-Identifier": "server-2"}) == "server-2"
