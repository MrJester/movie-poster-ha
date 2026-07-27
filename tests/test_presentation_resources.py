"""Tests for declarative presentation resources."""

from copy import deepcopy

import pytest
import voluptuous as vol

from custom_components.movie_poster.presentation_resources import (
    BUILTIN_FRAMES,
    BUILTIN_LAYOUTS,
    BUILTIN_THEMES,
    DESIGN_SCHEMA,
    THEME_TOKEN_KEYS,
    builtin_catalog,
    design_from_legacy_presentation,
    semantic_style_for_presentation,
    validate_builtin_catalog,
)


def test_builtin_catalog_is_complete_and_defensive() -> None:
    """Every built-in validates and callers cannot mutate the source catalog."""
    validate_builtin_catalog()
    catalog = builtin_catalog()

    assert set(catalog["frames"]) == {
        "blank",
        "marquee",
        "cyber_noir",
        "comic_hero",
        "theater_classic",
        "indie_nature",
        "golden_age",
        "steampunk",
    }
    assert set(catalog["themes"]) == {
        "classic",
        "art_deco",
        "neon",
        "minimal",
        "oled",
    }
    assert set(catalog["layouts"]) == {"blank", "cinematic", "poster", "split"}
    assert set(catalog["themes"]["classic"]["tokens"]) == set(THEME_TOKEN_KEYS)

    catalog["themes"]["classic"]["name"] = "Changed"
    assert BUILTIN_THEMES["classic"]["name"] == "Classic"


def test_legacy_presentation_becomes_linked_contained_design() -> None:
    """Flat settings migrate to stable resource references and components."""
    design = design_from_legacy_presentation(
        {
            "frame_theme": "cyber_noir",
            "theme": "neon",
            "layout": "cinematic",
            "show_summary": False,
            "show_progress": True,
        }
    )

    assert design["resources"] == {
        "frame": {"id": "builtin.frame.cyber_noir", "version": 1},
        "theme": {"id": "builtin.theme.neon", "version": 1},
        "layout": {"id": "builtin.layout.cinematic", "version": 1},
    }
    assert design["viewport"] == {
        "fit": "contain",
        "link_orientations": True,
    }
    visibility = {
        component["id"]: component["visible"] for component in design["components"]
    }
    assert visibility["summary"] is False
    assert visibility["progress"] is True
    assert DESIGN_SCHEMA(design) == design


def test_invalid_geometry_and_executable_fields_are_rejected() -> None:
    """Design documents fail closed on bad geometry and unknown fields."""
    design = design_from_legacy_presentation({})
    invalid = deepcopy(design)
    invalid["components"][0]["bounds"]["x"] = -1
    with pytest.raises(vol.Invalid):
        DESIGN_SCHEMA(invalid)

    executable = deepcopy(design)
    executable["script"] = "alert(1)"
    with pytest.raises(vol.Invalid):
        DESIGN_SCHEMA(executable)


def test_catalogs_are_independent_objects() -> None:
    """Built-in layouts do not accidentally share mutable component trees."""
    assert BUILTIN_LAYOUTS["cinematic"]["components"] is not (
        BUILTIN_LAYOUTS["split"]["components"]
    )
    assert BUILTIN_FRAMES["marquee"] is not BUILTIN_FRAMES["cyber_noir"]


def test_semantic_style_resolves_without_exposing_mutable_catalog_data() -> None:
    """The renderer receives a complete defensive semantic style."""
    style = semantic_style_for_presentation({"theme": "art_deco"})

    assert style["id"] == "builtin.theme.art_deco"
    assert style["colors"]["light_primary"] == "#D8C17C"
    style["colors"]["light_primary"] = "#000000"
    assert BUILTIN_THEMES["art_deco"]["tokens"]["light_primary"] == "#D8C17C"
