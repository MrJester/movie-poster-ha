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
    assert BUILTIN_LAYOUTS["cinematic"]["components"] != (
        BUILTIN_LAYOUTS["split"]["components"]
    )
    assert BUILTIN_FRAMES["marquee"]["safe_opening"] != (
        BUILTIN_FRAMES["cyber_noir"]["safe_opening"]
    )
    marquee_bezel = next(
        layer
        for layer in BUILTIN_FRAMES["marquee"]["layers"]
        if layer["slot"] == "bezel"
    )
    assert marquee_bezel["asset"] == {
        "portrait": "/movie_poster_static/assets/marquee-frame-portrait.png",
        "landscape": "/movie_poster_static/assets/marquee-frame-landscape.png",
    }
    assert BUILTIN_FRAMES["marquee"]["safe_opening"] == {
        "portrait": {"x": 19, "y": 18, "width": 62, "height": 68},
        "landscape": {"x": 15, "y": 23, "width": 70, "height": 55},
    }
    cyber_bezel = next(
        layer
        for layer in BUILTIN_FRAMES["cyber_noir"]["layers"]
        if layer["slot"] == "bezel"
    )
    assert set(cyber_bezel["asset"]) == {"portrait", "landscape"}
    assert BUILTIN_FRAMES["cyber_noir"]["safe_opening"] == {
        "portrait": {"x": 14, "y": 10, "width": 72, "height": 80},
        "landscape": {"x": 9, "y": 11, "width": 82, "height": 78},
    }
    theater_bezel = next(
        layer
        for layer in BUILTIN_FRAMES["theater_classic"]["layers"]
        if layer["slot"] == "bezel"
    )
    assert theater_bezel["asset"] == {
        "portrait": (
            "/movie_poster_static/assets/"
            "theater-classic-frame-portrait.png"
        ),
        "landscape": (
            "/movie_poster_static/assets/"
            "theater-classic-frame-landscape.png"
        ),
    }
    assert BUILTIN_FRAMES["theater_classic"]["safe_opening"] == {
        "portrait": {"x": 20, "y": 16, "width": 60, "height": 68},
        "landscape": {"x": 15, "y": 20, "width": 70, "height": 61},
    }
    comic_bezel = next(
        layer
        for layer in BUILTIN_FRAMES["comic_hero"]["layers"]
        if layer["slot"] == "bezel"
    )
    assert set(comic_bezel["asset"]) == {"portrait", "landscape"}
    assert BUILTIN_FRAMES["comic_hero"]["safe_opening"] == {
        "portrait": {"x": 19, "y": 14, "width": 62, "height": 71},
        "landscape": {"x": 15, "y": 21, "width": 70, "height": 58},
    }
    nature_bezel = next(
        layer
        for layer in BUILTIN_FRAMES["indie_nature"]["layers"]
        if layer["slot"] == "bezel"
    )
    assert set(nature_bezel["asset"]) == {"portrait", "landscape"}
    assert BUILTIN_FRAMES["indie_nature"]["safe_opening"] == {
        "portrait": {"x": 15, "y": 12, "width": 71, "height": 76},
        "landscape": {"x": 19, "y": 18, "width": 62, "height": 64},
    }
    golden_bezel = next(
        layer
        for layer in BUILTIN_FRAMES["golden_age"]["layers"]
        if layer["slot"] == "bezel"
    )
    assert set(golden_bezel["asset"]) == {"portrait", "landscape"}
    assert BUILTIN_FRAMES["golden_age"]["safe_opening"] == {
        "portrait": {"x": 19, "y": 18, "width": 62, "height": 68},
        "landscape": {"x": 22, "y": 25, "width": 55, "height": 63},
    }
    steampunk_bezel = next(
        layer
        for layer in BUILTIN_FRAMES["steampunk"]["layers"]
        if layer["slot"] == "bezel"
    )
    assert set(steampunk_bezel["asset"]) == {"portrait", "landscape"}
    assert BUILTIN_FRAMES["steampunk"]["safe_opening"] == {
        "portrait": {"x": 20, "y": 16, "width": 59, "height": 68},
        "landscape": {"x": 11, "y": 19, "width": 77, "height": 63},
    }
    split_poster = next(
        component
        for component in BUILTIN_LAYOUTS["split"]["components"]
        if component["id"] == "poster"
    )
    assert split_poster["orientation_overrides"]["portrait"]["bounds"] == {
        "x": 8,
        "y": 8,
        "width": 84,
        "height": 47,
    }


def test_semantic_style_resolves_without_exposing_mutable_catalog_data() -> None:
    """The renderer receives a complete defensive semantic style."""
    style = semantic_style_for_presentation({"theme": "art_deco"})

    assert style["id"] == "builtin.theme.art_deco"
    assert style["colors"]["light_primary"] == "#D8C17C"
    style["colors"]["light_primary"] = "#000000"
    assert BUILTIN_THEMES["art_deco"]["tokens"]["light_primary"] == "#D8C17C"
