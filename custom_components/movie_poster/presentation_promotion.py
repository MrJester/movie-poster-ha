"""Developer tooling for promoting reviewed presentation packages."""

from __future__ import annotations

import hashlib
import io
import json
import re
import zipfile
from copy import deepcopy
from typing import Any, Final

import voluptuous as vol

from .presentation_package import read_package
from .presentation_resources import (
    BUILTIN_FRAMES,
    BUILTIN_THEMES,
    FRAME_RESOURCE_SCHEMA,
    LAYOUT_RESOURCE_SCHEMA,
    THEME_RESOURCE_SCHEMA,
)
from .profiles import validate_profile_document

PROMOTION_VERSION: Final = 1
_CANDIDATE_ID = re.compile(r"^[a-z][a-z0-9_]{1,39}$")
_FRAME_SLOTS: Final = {
    "background",
    "bezel",
    "lighting",
    "foreground",
    "content_mask",
}


def build_promotion_bundle(package: bytes, candidate_id: str) -> bytes:
    """Convert a validated .movieposter package into a reviewable source bundle."""
    if not _CANDIDATE_ID.fullmatch(candidate_id):
        msg = "Candidate id must use lowercase letters, digits, and underscores"
        raise vol.Invalid(msg)
    imported = read_package(package)
    profile = validate_profile_document(imported["profile"])
    design = profile["design"]
    frame = _resource_by_id(BUILTIN_FRAMES, design["resources"]["frame"]["id"])
    theme = _resource_by_id(BUILTIN_THEMES, design["resources"]["theme"]["id"])

    frame_candidate = deepcopy(frame)
    frame_candidate.update(
        id=f"builtin.frame.{candidate_id}",
        name=profile["name"],
    )
    if design.get("frame_motion"):
        frame_candidate["motion"] = deepcopy(design["frame_motion"])
    layout_components = []
    for component in deepcopy(design["components"]):
        slot = _frame_slot(component)
        if slot is None:
            layout_components.append(component)
            continue
        layer = next(item for item in frame_candidate["layers"] if item["slot"] == slot)
        layer.update(
            asset=component["asset_ref"],
            opacity=component.get("style", {}).get("opacity", 1),
            blend_mode=component["blend_mode"],
            z_index=component["z_index"],
        )

    theme_candidate = deepcopy(theme)
    theme_candidate.update(
        id=f"builtin.theme.{candidate_id}",
        name=f"{profile['name']} Theme",
    )
    layout_candidate = {
        "id": f"builtin.layout.{candidate_id}",
        "version": 1,
        "name": f"{profile['name']} Layout",
        "components": layout_components,
    }
    frame_candidate = FRAME_RESOURCE_SCHEMA(frame_candidate)
    theme_candidate = THEME_RESOURCE_SCHEMA(theme_candidate)
    layout_candidate = LAYOUT_RESOURCE_SCHEMA(layout_candidate)

    promoted_profile = deepcopy(profile)
    promoted_profile["design"]["resources"] = {
        "frame": {"id": frame_candidate["id"], "version": 1},
        "theme": {"id": theme_candidate["id"], "version": 1},
        "layout": {"id": layout_candidate["id"], "version": 1},
    }
    candidate = {
        "promotion_version": PROMOTION_VERSION,
        "candidate_id": candidate_id,
        "source_package_id": imported["manifest"]["package_id"],
        "profile": promoted_profile,
        "resources": {
            "frame": frame_candidate,
            "theme": theme_candidate,
            "layout": layout_candidate,
        },
        "assets": [
            {
                "path": path,
                "sha256": hashlib.sha256(content).hexdigest(),
                "size": len(content),
            }
            for path, content in sorted(imported["assets"].items())
        ],
    }
    return _promotion_archive(candidate, imported["assets"])


def read_promotion_bundle(payload: bytes) -> dict[str, Any]:
    """Read a trusted developer candidate and revalidate its resource documents."""
    with zipfile.ZipFile(io.BytesIO(payload)) as archive:
        candidate = json.loads(archive.read("candidate.json"))
        candidate["profile"] = validate_profile_document(candidate["profile"])
        candidate["resources"]["frame"] = FRAME_RESOURCE_SCHEMA(
            candidate["resources"]["frame"]
        )
        candidate["resources"]["theme"] = THEME_RESOURCE_SCHEMA(
            candidate["resources"]["theme"]
        )
        candidate["resources"]["layout"] = LAYOUT_RESOURCE_SCHEMA(
            candidate["resources"]["layout"]
        )
        return candidate


def _resource_by_id(catalog: dict[str, dict[str, Any]], resource_id: str) -> dict:
    for resource in catalog.values():
        if resource["id"] == resource_id:
            return resource
    msg = f"Unknown built-in resource: {resource_id}"
    raise vol.Invalid(msg)


def _frame_slot(component: dict[str, Any]) -> str | None:
    """Treat locked custom images named frame_<slot> as physical Frame layers."""
    prefix = "frame_"
    identifier = str(component["id"])
    if (
        component["type"] != "custom_image"
        or not component["locked"]
        or not identifier.startswith(prefix)
    ):
        return None
    slot = identifier.removeprefix(prefix)
    if slot not in _FRAME_SLOTS or not component.get("asset_ref"):
        return None
    return slot


def _promotion_archive(
    candidate: dict[str, Any], assets: dict[str, bytes]
) -> bytes:
    def write_file(archive: zipfile.ZipFile, path: str, content: bytes) -> None:
        info = zipfile.ZipInfo(path, date_time=(1980, 1, 1, 0, 0, 0))
        info.compress_type = zipfile.ZIP_DEFLATED
        info.external_attr = 0o100644 << 16
        archive.writestr(info, content, compress_type=zipfile.ZIP_DEFLATED)

    output = io.BytesIO()
    with zipfile.ZipFile(
        output,
        "w",
        compression=zipfile.ZIP_DEFLATED,
        compresslevel=9,
    ) as archive:
        write_file(
            archive,
            "candidate.json",
            json.dumps(candidate, indent=2, sort_keys=True).encode() + b"\n",
        )
        for path, content in sorted(assets.items()):
            write_file(archive, path, content)
    return output.getvalue()
