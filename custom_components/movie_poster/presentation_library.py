"""Versioned local Presentation Library with draft and publish semantics."""

from __future__ import annotations

import asyncio
import base64
from copy import deepcopy
from typing import TYPE_CHECKING, Any, Final, Protocol

import voluptuous as vol
from homeassistant.helpers.storage import Store

from .const import CONF_DISPLAY_PROFILES, DOMAIN
from .profiles import make_profile_id, validate_profile_document

if TYPE_CHECKING:
    from homeassistant.core import HomeAssistant

LIBRARY_VERSION: Final = 1
STORAGE_KEY_PREFIX: Final = f"{DOMAIN}.presentation_library"
MAX_REVISIONS: Final = 20

REVISION_SCHEMA = vol.Schema(
    {
        vol.Required("revision"): vol.All(int, vol.Range(min=1)),
        vol.Required("profile"): dict,
    },
    extra=vol.PREVENT_EXTRA,
)

LIBRARY_PROFILE_SCHEMA = vol.Schema(
    {
        vol.Required("draft"): vol.Any(None, dict),
        vol.Required("published"): [REVISION_SCHEMA],
        vol.Required("active_revision"): vol.Any(
            None,
            vol.All(int, vol.Range(min=1)),
        ),
        vol.Optional("assets", default={}): {str: str},
    },
    extra=vol.PREVENT_EXTRA,
)

LIBRARY_SCHEMA = vol.Schema(
    {
        vol.Required("version"): vol.Equal(LIBRARY_VERSION),
        vol.Required("profiles"): {str: LIBRARY_PROFILE_SCHEMA},
    },
    extra=vol.PREVENT_EXTRA,
)


class LibraryStore(Protocol):
    """Storage operations required by the Presentation Library."""

    async def async_load(self) -> dict[str, Any] | None:
        """Load stored data."""

    async def async_save(self, data: dict[str, Any]) -> None:
        """Save stored data."""


def empty_library() -> dict[str, Any]:
    """Return a new empty library document."""
    return {"version": LIBRARY_VERSION, "profiles": {}}


def validate_library(document: dict[str, Any]) -> dict[str, Any]:
    """Validate a library and every embedded Profile."""
    validated = LIBRARY_SCHEMA(document)
    result = empty_library()
    for identifier, item in validated["profiles"].items():
        draft = item["draft"]
        if draft is not None:
            draft = validate_profile_document(draft)
        revisions = [
            {
                "revision": revision["revision"],
                "profile": validate_profile_document(revision["profile"]),
            }
            for revision in item["published"]
        ]
        revision_numbers = [item["revision"] for item in revisions]
        if revision_numbers != sorted(set(revision_numbers)):
            msg = f"Profile {identifier} has invalid revision ordering"
            raise vol.Invalid(msg)
        active_revision = item["active_revision"]
        if active_revision is not None and active_revision not in revision_numbers:
            msg = f"Profile {identifier} has an unknown active revision"
            raise vol.Invalid(msg)
        result["profiles"][identifier] = {
            "draft": draft,
            "published": revisions,
            "active_revision": active_revision,
            "assets": dict(item["assets"]),
        }
    return result


class PresentationLibrary:
    """Manage local drafts and immutable published Profile revisions."""

    def __init__(
        self,
        hass: HomeAssistant,
        entry_id: str,
        *,
        store: LibraryStore | None = None,
    ) -> None:
        """Initialize a per-config-entry library."""
        self._store = store or Store[dict[str, Any]](
            hass, LIBRARY_VERSION, f"{STORAGE_KEY_PREFIX}.{entry_id}"
        )
        self._data = empty_library()
        self._loaded = False
        self._lock = asyncio.Lock()

    async def async_load(self) -> None:
        """Load and validate stored data, failing closed to an empty library."""
        async with self._lock:
            if self._loaded:
                return
            stored = await self._store.async_load()
            if stored is not None:
                try:
                    self._data = validate_library(stored)
                except vol.Invalid:
                    self._data = empty_library()
            self._loaded = True

    async def async_import_legacy(self, options: dict[str, Any]) -> bool:
        """Import legacy config-entry Profiles once without replacing new data."""
        await self.async_load()
        changed = False
        async with self._lock:
            for raw_id, raw_profile in options.get(
                CONF_DISPLAY_PROFILES,
                {},
            ).items():
                identifier = str(raw_id)
                if identifier in self._data["profiles"]:
                    continue
                try:
                    profile = validate_profile_document(raw_profile)
                except vol.Invalid:
                    continue
                self._data["profiles"][identifier] = {
                    "draft": None,
                    "published": [{"revision": 1, "profile": profile}],
                    "active_revision": 1,
                    "assets": {},
                }
                changed = True
            if changed:
                await self._async_save()
        return changed

    async def async_list(self) -> dict[str, Any]:
        """Return a defensive copy of the library."""
        await self.async_load()
        return deepcopy(self._data)

    async def async_create_draft(
        self,
        profile: dict[str, Any],
        *,
        identifier: str | None = None,
        assets: dict[str, bytes] | None = None,
    ) -> str:
        """Create a user-owned draft, choosing a collision-safe identifier."""
        validated = validate_profile_document(profile)
        await self.async_load()
        async with self._lock:
            base = make_profile_id(identifier or validated["name"])
            candidate = base
            suffix = 2
            while candidate in self._data["profiles"]:
                candidate = f"{base}-{suffix}"
                suffix += 1
            self._data["profiles"][candidate] = {
                "draft": validated,
                "published": [],
                "active_revision": None,
                "assets": {
                    path: base64.b64encode(content).decode("ascii")
                    for path, content in (assets or {}).items()
                },
            }
            await self._async_save()
        return candidate

    async def async_update_draft(
        self,
        identifier: str,
        profile: dict[str, Any],
    ) -> None:
        """Replace a draft without affecting the published display."""
        validated = validate_profile_document(profile)
        await self.async_load()
        async with self._lock:
            item = self._item(identifier)
            item["draft"] = validated
            await self._async_save()

    async def async_publish(self, identifier: str) -> int:
        """Publish the current draft as a new immutable revision."""
        await self.async_load()
        async with self._lock:
            item = self._item(identifier)
            if item["draft"] is None:
                msg = f"Profile {identifier} has no draft to publish"
                raise vol.Invalid(msg)
            revisions = item["published"]
            revision = revisions[-1]["revision"] + 1 if revisions else 1
            revisions.append(
                {
                    "revision": revision,
                    "profile": deepcopy(item["draft"]),
                }
            )
            if len(revisions) > MAX_REVISIONS:
                del revisions[: len(revisions) - MAX_REVISIONS]
            item["active_revision"] = revision
            item["draft"] = None
            await self._async_save()
        return revision

    async def async_edit_published(self, identifier: str) -> dict[str, Any]:
        """Create a draft copy from the active published revision."""
        await self.async_load()
        async with self._lock:
            item = self._item(identifier)
            active = item["active_revision"]
            profile = next(
                (
                    revision["profile"]
                    for revision in item["published"]
                    if revision["revision"] == active
                ),
                None,
            )
            if profile is None:
                msg = f"Profile {identifier} has no published revision"
                raise vol.Invalid(msg)
            item["draft"] = deepcopy(profile)
            await self._async_save()
            return deepcopy(item["draft"])

    async def async_active_profile(self, identifier: str) -> dict[str, Any]:
        """Return the active published Profile, or its draft when unpublished."""
        await self.async_load()
        async with self._lock:
            item = self._item(identifier)
            active = item["active_revision"]
            if active is not None:
                for revision in item["published"]:
                    if revision["revision"] == active:
                        return deepcopy(revision["profile"])
            if item["draft"] is not None:
                return deepcopy(item["draft"])
            message = f"Profile {identifier} has no available document"
            raise vol.Invalid(message)

    async def async_assets(self, identifier: str) -> dict[str, bytes]:
        """Return decoded packaged assets for one user Profile."""
        await self.async_load()
        async with self._lock:
            item = self._item(identifier)
            return {
                path: base64.b64decode(content)
                for path, content in item["assets"].items()
            }

    async def async_rollback(self, identifier: str, revision: int) -> None:
        """Activate a retained published revision without mutating it."""
        await self.async_load()
        async with self._lock:
            item = self._item(identifier)
            if not any(
                saved["revision"] == revision for saved in item["published"]
            ):
                msg = f"Profile {identifier} does not contain revision {revision}"
                raise vol.Invalid(msg)
            item["active_revision"] = revision
            await self._async_save()

    async def async_delete(self, identifier: str) -> None:
        """Delete one user Profile."""
        await self.async_load()
        async with self._lock:
            self._item(identifier)
            del self._data["profiles"][identifier]
            await self._async_save()

    def _item(self, identifier: str) -> dict[str, Any]:
        """Return one mutable item or raise a validation error."""
        try:
            return self._data["profiles"][identifier]
        except KeyError as err:
            msg = f"Unknown Profile: {identifier}"
            raise vol.Invalid(msg) from err

    async def _async_save(self) -> None:
        """Persist the current validated document."""
        self._data = validate_library(self._data)
        await self._store.async_save(self._data)
