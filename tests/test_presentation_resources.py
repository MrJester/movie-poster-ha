"""Tests for declarative presentation resources."""

from copy import deepcopy

import pytest
import voluptuous as vol

from custom_components.movie_poster.presentation_resources import (
    BUILTIN_FRAMES,
    BUILTIN_LAYOUTS,
    BUILTIN_THEMES,
    DESIGN_SCHEMA,
    DESIGN_SCHEMA_VERSION,
    FRAME_SAFE_OPENING,
    THEME_TOKEN_KEYS,
    builtin_catalog,
    design_from_legacy_presentation,
    semantic_style_for_presentation,
    validate_builtin_catalog,
    validate_design_document,
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


def test_component_font_family_is_validated() -> None:
    """Component typography accepts safe presets and rejects arbitrary CSS."""
    design = design_from_legacy_presentation({})
    title = next(
        component
        for component in design["components"]
        if component["type"] == "title"
    )
    title["style"]["font_family"] = "serif"
    assert DESIGN_SCHEMA(design)["components"]

    title["style"]["font_family"] = "url(evil)"
    with pytest.raises(vol.Invalid):
        DESIGN_SCHEMA(design)


def test_component_rotation_is_bounded_and_declarative() -> None:
    """Authored rotation accepts a safe angle and rejects unbounded values."""
    design = design_from_legacy_presentation({})
    poster = next(
        component
        for component in design["components"]
        if component["type"] == "poster"
    )
    poster["style"]["rotation"] = -12.5
    assert DESIGN_SCHEMA(design)["components"]

    poster["style"]["rotation"] = 181
    with pytest.raises(vol.Invalid):
        DESIGN_SCHEMA(design)


def test_schema_one_designs_migrate_to_locked_layer_capable_schema() -> None:
    """Stored schema-one component documents gain safe layer defaults."""
    current = design_from_legacy_presentation({})
    legacy = deepcopy(current)
    legacy["schema_version"] = 1
    for component in legacy["components"]:
        for field in (
            "name",
            "locked",
            "blend_mode",
            "clip",
            "constraints",
        ):
            component.pop(field)

    migrated = validate_design_document(legacy)

    assert migrated["schema_version"] == DESIGN_SCHEMA_VERSION
    title = next(
        component
        for component in migrated["components"]
        if component["type"] == "title"
    )
    assert title["name"] == "Title"
    assert title["locked"] is False
    assert title["blend_mode"] == "normal"
    assert title["clip"] == "safe_opening"
    assert title["constraints"] == {
        "max_lines": 2,
        "min_font_size": 0.8,
        "preserve_aspect": False,
    }


def test_catalogs_are_independent_objects() -> None:
    """Built-in layouts do not accidentally share mutable component trees."""
    assert BUILTIN_LAYOUTS["cinematic"]["components"] is not (
        BUILTIN_LAYOUTS["split"]["components"]
    )
    assert BUILTIN_FRAMES["marquee"] is not BUILTIN_FRAMES["cyber_noir"]
    assert BUILTIN_LAYOUTS["cinematic"]["components"] != (
        BUILTIN_LAYOUTS["split"]["components"]
    )
    assert BUILTIN_FRAMES["marquee"]["safe_opening"] == (
        BUILTIN_FRAMES["cyber_noir"]["safe_opening"]
    )
    for key, frame in BUILTIN_FRAMES.items():
        if key == "blank":
            continue
        assert frame["safe_opening"] == FRAME_SAFE_OPENING
        assert frame["safe_opening"] is not FRAME_SAFE_OPENING
        assert frame["safe_opening"] is not (
            BUILTIN_FRAMES["marquee"]["safe_opening"]
        ) or key == "marquee"
        assert frame["motion"]["preset"] != "none"
        assert frame["motion"]["light_count"] > 0
    marquee_bezel = next(
        layer
        for layer in BUILTIN_FRAMES["marquee"]["layers"]
        if layer["slot"] == "bezel"
    )
    assert marquee_bezel["asset"] == {
        "portrait": "/movie_poster_static/assets/marquee-frame-portrait.png",
        "landscape": "/movie_poster_static/assets/marquee-frame-landscape.png",
    }
    cyber_bezel = next(
        layer
        for layer in BUILTIN_FRAMES["cyber_noir"]["layers"]
        if layer["slot"] == "bezel"
    )
    assert set(cyber_bezel["asset"]) == {"portrait", "landscape"}
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
    comic_bezel = next(
        layer
        for layer in BUILTIN_FRAMES["comic_hero"]["layers"]
        if layer["slot"] == "bezel"
    )
    assert set(comic_bezel["asset"]) == {"portrait", "landscape"}
    nature_bezel = next(
        layer
        for layer in BUILTIN_FRAMES["indie_nature"]["layers"]
        if layer["slot"] == "bezel"
    )
    assert set(nature_bezel["asset"]) == {"portrait", "landscape"}
    golden_bezel = next(
        layer
        for layer in BUILTIN_FRAMES["golden_age"]["layers"]
        if layer["slot"] == "bezel"
    )
    assert set(golden_bezel["asset"]) == {"portrait", "landscape"}
    steampunk_bezel = next(
        layer
        for layer in BUILTIN_FRAMES["steampunk"]["layers"]
        if layer["slot"] == "bezel"
    )
    assert set(steampunk_bezel["asset"]) == {"portrait", "landscape"}
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
