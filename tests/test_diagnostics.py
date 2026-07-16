"""Tests for privacy-conscious Home Assistant diagnostics."""

from types import SimpleNamespace

from homeassistant.components.diagnostics import REDACTED

from custom_components.movie_poster.const import DOMAIN
from custom_components.movie_poster.diagnostics import (
    async_get_config_entry_diagnostics,
)
from custom_components.movie_poster.models import DisplayMode
from custom_components.movie_poster.state_machine import ModeSnapshot, TransitionReason


async def test_diagnostics_redact_token_and_exclude_exception_message() -> None:
    """Diagnostics retain useful health while removing secrets and error details."""
    entry = SimpleNamespace(
        entry_id="entry-1",
        as_dict=lambda: {
            "entry_id": "entry-1",
            "data": {"server_url": "http://plex:32400", "token": "secret"},
            "options": {"library": "Movies"},
        },
    )
    coordinator = SimpleNamespace(
        data=SimpleNamespace(
            mode=ModeSnapshot(
                mode=DisplayMode.COMING_SOON,
                grace_deadline=None,
                reason=TransitionReason.STARTUP_IDLE,
            ),
            media=None,
        ),
        last_update_success=False,
        last_exception=RuntimeError("private network detail"),
        _movies={"1": object()},
        _movie_refresh_in_progress=True,
        _movie_refresh_offset=100,
    )
    hass = SimpleNamespace(data={DOMAIN: {"entry-1": coordinator}})

    diagnostics = await async_get_config_entry_diagnostics(hass, entry)

    assert diagnostics["config_entry"]["data"]["token"] == REDACTED
    assert diagnostics["runtime"]["last_error_type"] == "RuntimeError"
    assert diagnostics["runtime"]["library_item_count"] == 1
    assert "private network detail" not in str(diagnostics)
