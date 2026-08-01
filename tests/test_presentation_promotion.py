"""Tests for the developer-only built-in promotion workflow."""

from copy import deepcopy

import pytest
import voluptuous as vol

from custom_components.movie_poster.presentation_package import build_package
from custom_components.movie_poster.presentation_promotion import (
    build_promotion_bundle,
    read_promotion_bundle,
)
from custom_components.movie_poster.presentation_resources import (
    design_from_legacy_presentation,
)
from custom_components.movie_poster.profiles import (
    presentation_from_options,
    validate_profile_document,
)

PNG = b"\x89PNG\r\n\x1a\n" + b"frame"


def _profile() -> dict:
    presentation = presentation_from_options(
        {"frame_theme": "marquee", "theme": "neon", "layout": "cinematic"}
    )
    design = design_from_legacy_presentation(presentation)
    frame_layer = deepcopy(design["components"][0])
    frame_layer.update(
        id="frame_bezel",
        name="Frame Bezel",
        type="custom_image",
        locked=True,
        asset_ref="assets/frame/bezel.png",
        z_index=80,
    )
    design["components"].append(frame_layer)
    design["frame_motion"] = {
        "preset": "marquee_chase",
        "speed": 1.2,
        "intensity": 0.9,
        "light_count": 20,
    }
    return validate_profile_document(
        {
            "version": 2,
            "name": "Reviewed Marquee",
            "description": "",
            "author": "",
            "presentation": presentation,
            "design": design,
        }
    )


def test_promotion_bundle_snapshots_resources_and_extracts_frame_layers() -> None:
    """A reviewed package becomes deterministic source candidates and assets."""
    package = build_package(
        "reviewed.marquee",
        _profile(),
        {"assets/frame/bezel.png": PNG},
    )

    bundle = build_promotion_bundle(package, "reviewed_marquee")
    assert bundle == build_promotion_bundle(package, "reviewed_marquee")
    promoted = read_promotion_bundle(bundle)

    assert promoted["candidate_id"] == "reviewed_marquee"
    assert promoted["resources"]["frame"]["id"] == (
        "builtin.frame.reviewed_marquee"
    )
    bezel = next(
        layer
        for layer in promoted["resources"]["frame"]["layers"]
        if layer["slot"] == "bezel"
    )
    assert bezel["asset"] == "assets/frame/bezel.png"
    assert promoted["resources"]["frame"]["motion"] == {
        "preset": "marquee_chase",
        "speed": 1.2,
        "intensity": 0.9,
        "light_count": 20,
    }
    assert all(
        component["id"] != "frame_bezel"
        for component in promoted["resources"]["layout"]["components"]
    )
    assert promoted["profile"]["design"]["resources"] == {
        "frame": {"id": "builtin.frame.reviewed_marquee", "version": 1},
        "theme": {"id": "builtin.theme.reviewed_marquee", "version": 1},
        "layout": {"id": "builtin.layout.reviewed_marquee", "version": 1},
    }


def test_promotion_rejects_unsafe_candidate_identifiers() -> None:
    """Candidate identifiers cannot escape the built-in resource namespace."""
    package = build_package("reviewed.marquee", _profile())

    with pytest.raises(vol.Invalid, match="Candidate id"):
        build_promotion_bundle(package, "../unsafe")
