"""Home Assistant Repairs issue lifecycle for Movie Poster."""

from __future__ import annotations

from pathlib import Path
from typing import TYPE_CHECKING

from homeassistant.helpers import issue_registry as ir

from .const import DOMAIN

if TYPE_CHECKING:
    from homeassistant.core import HomeAssistant


def issue_id(kind: str, entry_id: str) -> str:
    """Return one stable issue identifier per configuration and problem."""
    return f"{kind}_{entry_id}"


def async_set_connection_issue(
    hass: HomeAssistant, entry_id: str, *, active: bool
) -> None:
    """Create or clear the Plex connectivity issue."""
    identifier = issue_id("plex_unreachable", entry_id)
    if not active:
        ir.async_delete_issue(hass, DOMAIN, identifier)
        return
    ir.async_create_issue(
        hass,
        DOMAIN,
        identifier,
        is_fixable=True,
        is_persistent=True,
        severity=ir.IssueSeverity.ERROR,
        translation_key="plex_unreachable",
        translation_placeholders={},
        data={"entry_id": entry_id, "kind": "plex_unreachable"},
    )


def async_set_source_issue(
    hass: HomeAssistant,
    entry_id: str,
    *,
    active: bool,
    source: str,
) -> None:
    """Create or clear the missing Plex library/collection issue."""
    identifier = issue_id("missing_source", entry_id)
    if not active:
        ir.async_delete_issue(hass, DOMAIN, identifier)
        return
    ir.async_create_issue(
        hass,
        DOMAIN,
        identifier,
        is_fixable=True,
        is_persistent=True,
        severity=ir.IssueSeverity.ERROR,
        translation_key="missing_source",
        translation_placeholders={"source": source},
        data={"entry_id": entry_id, "kind": "missing_source"},
    )


async def async_validate_logo(
    hass: HomeAssistant, entry_id: str, logo_url: str
) -> bool:
    """Create or clear an issue for a missing Home Assistant local logo."""
    identifier = issue_id("invalid_logo", entry_id)
    relative = (
        logo_url.removeprefix("/local/") if logo_url.startswith("/local/") else None
    )
    valid = relative is None or await hass.async_add_executor_job(
        Path(hass.config.path("www", relative)).is_file
    )
    if valid:
        ir.async_delete_issue(hass, DOMAIN, identifier)
        return True
    ir.async_create_issue(
        hass,
        DOMAIN,
        identifier,
        is_fixable=True,
        is_persistent=True,
        severity=ir.IssueSeverity.WARNING,
        translation_key="invalid_logo",
        translation_placeholders={"logo_url": logo_url},
        data={"entry_id": entry_id, "kind": "invalid_logo"},
    )
    return False
