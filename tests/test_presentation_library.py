"""Tests for the local Presentation Library."""

from copy import deepcopy
from types import SimpleNamespace
from typing import Any

import pytest
import voluptuous as vol

from custom_components.movie_poster.presentation_library import (
    PresentationLibrary,
    empty_library,
    validate_library,
)
from custom_components.movie_poster.profiles import (
    PROFILE_VERSION,
    presentation_from_options,
    validate_profile_document,
)

SECOND_REVISION = 2


class FakeStore:
    """In-memory Home Assistant Store replacement."""

    def __init__(self, data: dict[str, Any] | None = None) -> None:
        """Initialize stored data."""
        self.data = deepcopy(data)

    async def async_load(self) -> dict[str, Any] | None:
        """Return stored data."""
        return deepcopy(self.data)

    async def async_save(self, data: dict[str, Any]) -> None:
        """Persist a defensive copy."""
        self.data = deepcopy(data)


def profile(name: str = "Custom") -> dict[str, Any]:
    """Return a valid current Profile."""
    return validate_profile_document(
        {
            "version": 1,
            "name": name,
            "presentation": presentation_from_options({}),
        }
    )


@pytest.mark.asyncio
async def test_draft_publish_edit_and_rollback() -> None:
    """Drafts never alter published revisions until explicitly published."""
    store = FakeStore()
    library = PresentationLibrary(
        SimpleNamespace(),
        "entry",
        store=store,
    )

    identifier = await library.async_create_draft(profile())
    before = await library.async_list()
    assert before["profiles"][identifier]["published"] == []

    assert await library.async_publish(identifier) == 1
    published = await library.async_list()
    assert published["profiles"][identifier]["draft"] is None
    assert published["profiles"][identifier]["active_revision"] == 1

    draft = await library.async_edit_published(identifier)
    draft["name"] = "Revised"
    await library.async_update_draft(identifier, draft)
    assert (await library.async_list())["profiles"][identifier]["published"][0][
        "profile"
    ]["name"] == "Custom"

    assert await library.async_publish(identifier) == SECOND_REVISION
    await library.async_rollback(identifier, 1)
    assert (await library.async_list())["profiles"][identifier][
        "active_revision"
    ] == 1


@pytest.mark.asyncio
async def test_legacy_import_is_idempotent() -> None:
    """Legacy config-entry Profiles migrate only once."""
    store = FakeStore()
    library = PresentationLibrary(SimpleNamespace(), "entry", store=store)
    legacy = {
        "display_profiles": {
            "shared": {
                "version": 1,
                "name": "Shared",
                "presentation": presentation_from_options({"theme": "neon"}),
            }
        }
    }

    assert await library.async_import_legacy(legacy) is True
    assert await library.async_import_legacy(legacy) is False
    saved = await library.async_list()
    assert saved["profiles"]["shared"]["published"][0]["profile"]["version"] == (
        PROFILE_VERSION
    )


@pytest.mark.asyncio
async def test_assets_are_validated_stored_and_removed() -> None:
    """Library assets use package validation and remain exportable."""
    store = FakeStore()
    library = PresentationLibrary(SimpleNamespace(), "entry", store=store)
    identifier = await library.async_create_draft(profile())
    png = b"\x89PNG\r\n\x1a\nasset"

    assert await library.async_put_asset(
        identifier,
        "assets/images/frame.png",
        png,
    ) == "assets/images/frame.png"
    assert await library.async_assets(identifier) == {
        "assets/images/frame.png": png,
    }

    with pytest.raises(vol.Invalid, match="signature"):
        await library.async_put_asset(
            identifier,
            "assets/images/fake.png",
            b"<script>",
        )

    await library.async_delete_asset(identifier, "assets/images/frame.png")
    assert await library.async_assets(identifier) == {}


def test_library_rejects_unknown_active_revision() -> None:
    """Corrupt revision pointers fail closed during validation."""
    document = empty_library()
    document["profiles"]["bad"] = {
        "draft": profile(),
        "published": [],
        "active_revision": 4,
    }
    with pytest.raises(vol.Invalid):
        validate_library(document)
