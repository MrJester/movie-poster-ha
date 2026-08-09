"""Declarative presentation resources and compatibility builders."""

from __future__ import annotations

from copy import deepcopy
from typing import Any, Final

import voluptuous as vol

DESIGN_SCHEMA_VERSION: Final = 2
LEGACY_DESIGN_SCHEMA_VERSION: Final = 1
RESOURCE_VERSION: Final = 1
CANVAS_MAX: Final = 100

FIT_CONTAIN: Final = "contain"
FIT_POLICIES: Final = (FIT_CONTAIN,)
ORIENTATION_KEYS: Final = ("portrait", "landscape")
FRAME_SAFE_OPENING: Final[dict[str, dict[str, float]]] = {
    "portrait": {"x": 19, "y": 16, "width": 62, "height": 70},
    "landscape": {"x": 15, "y": 19, "width": 70, "height": 64},
}

COMPONENT_TYPES: Final = (
    "surface",
    "poster",
    "backdrop",
    "logo",
    "custom_image",
    "mode_heading",
    "title",
    "subtitle",
    "year",
    "content_rating",
    "runtime",
    "summary",
    "progress",
    "active_user",
    "player_name",
    "playback_state",
    "static_text",
)

ANIMATION_PRESETS: Final = (
    "none",
    "breathe",
    "chase",
    "pulse",
    "shimmer",
)

FRAME_MOTION_PRESETS: Final = (
    "none",
    "marquee_chase",
    "cyber_scan",
    "comic_energy",
    "theater_sconce",
    "nature_dapple",
    "golden_footlights",
    "steampunk_mechanical",
)

FRAME_MOTION_SCHEMA = vol.Schema(
    {
        vol.Required("preset"): vol.In(FRAME_MOTION_PRESETS),
        vol.Required("speed"): vol.All(
            vol.Coerce(float),
            vol.Range(min=0.1, max=5),
        ),
        vol.Required("intensity"): vol.All(
            vol.Coerce(float),
            vol.Range(min=0, max=1),
        ),
        vol.Required("light_count"): vol.All(
            int,
            vol.Range(min=0, max=24),
        ),
    },
    extra=vol.PREVENT_EXTRA,
)

THEME_TOKEN_KEYS: Final = (
    "light_primary",
    "light_secondary",
    "accent_primary",
    "accent_secondary",
    "text_heading",
    "text_body",
    "text_muted",
    "text_inverse",
    "surface",
    "surface_elevated",
    "backdrop",
    "border",
    "progress_track",
    "progress_fill",
)

_COLOR = vol.Match(r"^#[0-9a-fA-F]{6}$")
_RESOURCE_ID = vol.Match(r"^(builtin|user)\.[a-z][a-z0-9_.-]{1,79}$")
_COMPONENT_ID = vol.Match(r"^[a-z][a-z0-9_-]{0,63}$")
_PERCENT = vol.All(vol.Coerce(float), vol.Range(min=0, max=100))
BLEND_MODES: Final = ("normal", "multiply", "screen", "overlay", "soft-light")
CLIP_POLICIES: Final = ("none", "canvas", "safe_opening")


def _contained_bounds(bounds: dict[str, float]) -> dict[str, float]:
    """Require normalized bounds to remain entirely inside the canvas."""
    if bounds["x"] + bounds["width"] > CANVAS_MAX:
        message = "Component width extends beyond the canvas"
        raise vol.Invalid(message)
    if bounds["y"] + bounds["height"] > CANVAS_MAX:
        message = "Component height extends beyond the canvas"
        raise vol.Invalid(message)
    return bounds


BOUNDS_SCHEMA = vol.All(
    vol.Schema(
        {
            vol.Required("x"): _PERCENT,
            vol.Required("y"): _PERCENT,
            vol.Required("width"): vol.All(
                vol.Coerce(float),
                vol.Range(min=0.1, max=100),
            ),
            vol.Required("height"): vol.All(
                vol.Coerce(float),
                vol.Range(min=0.1, max=100),
            ),
        },
        extra=vol.PREVENT_EXTRA,
    ),
    _contained_bounds,
)

ORIENTATION_OVERRIDE_SCHEMA = vol.Schema(
    {
        vol.Optional("bounds"): BOUNDS_SCHEMA,
        vol.Optional("visible"): bool,
        vol.Optional("z_index"): vol.All(int, vol.Range(min=-100, max=100)),
    },
    extra=vol.PREVENT_EXTRA,
)

COMPONENT_STYLE_SCHEMA = vol.Schema(
    {
        vol.Optional("text_color"): _COLOR,
        vol.Optional("background_color"): _COLOR,
        vol.Optional("font_size"): vol.All(
            vol.Coerce(float),
            vol.Range(min=0.1, max=20),
        ),
        vol.Optional("font_family"): vol.In(
            (
                "theme_heading",
                "theme_body",
                "system",
                "cinematic",
                "serif",
                "modern",
                "condensed",
            )
        ),
        vol.Optional("opacity"): vol.All(
            vol.Coerce(float),
            vol.Range(min=0, max=1),
        ),
        vol.Optional("text_align"): vol.In(("left", "center", "right")),
        vol.Optional("image_fit"): vol.In(("contain", "cover", "fill")),
        vol.Optional("glow"): vol.All(
            vol.Coerce(float),
            vol.Range(min=0, max=1),
        ),
        vol.Optional("rotation"): vol.All(
            vol.Coerce(float),
            vol.Range(min=-180, max=180),
        ),
    },
    extra=vol.PREVENT_EXTRA,
)

COMPONENT_CONSTRAINT_SCHEMA = vol.Schema(
    {
        vol.Optional("max_lines", default=0): vol.All(
            int,
            vol.Range(min=0, max=20),
        ),
        vol.Optional("min_font_size", default=0.8): vol.All(
            vol.Coerce(float),
            vol.Range(min=0.1, max=20),
        ),
        vol.Optional("preserve_aspect", default=False): bool,
    },
    extra=vol.PREVENT_EXTRA,
)

COMPONENT_SCHEMA = vol.Schema(
    {
        vol.Required("id"): _COMPONENT_ID,
        vol.Required("name"): vol.All(str, vol.Length(min=1, max=80)),
        vol.Required("type"): vol.In(COMPONENT_TYPES),
        vol.Required("bounds"): BOUNDS_SCHEMA,
        vol.Required("z_index"): vol.All(int, vol.Range(min=-100, max=100)),
        vol.Required("visible"): bool,
        vol.Required("locked"): bool,
        vol.Required("blend_mode"): vol.In(BLEND_MODES),
        vol.Required("clip"): vol.In(CLIP_POLICIES),
        vol.Required("style_ref"): vol.All(str, vol.Length(min=1, max=80)),
        vol.Optional("style", default={}): COMPONENT_STYLE_SCHEMA,
        vol.Optional("constraints", default={}): COMPONENT_CONSTRAINT_SCHEMA,
        vol.Optional("text", default=""): vol.All(str, vol.Length(max=500)),
        vol.Optional("asset_ref", default=""): vol.All(
            str,
            vol.Length(max=240),
        ),
        vol.Optional("orientation_overrides", default={}): {
            vol.In(ORIENTATION_KEYS): ORIENTATION_OVERRIDE_SCHEMA
        },
    },
    extra=vol.PREVENT_EXTRA,
)

RESOURCE_REF_SCHEMA = vol.Schema(
    {
        vol.Required("id"): _RESOURCE_ID,
        vol.Required("version"): vol.All(int, vol.Range(min=1)),
    },
    extra=vol.PREVENT_EXTRA,
)

DESIGN_SCHEMA = vol.Schema(
    {
        vol.Required("schema_version"): vol.Equal(DESIGN_SCHEMA_VERSION),
        vol.Required("resources"): vol.Schema(
            {
                vol.Required("frame"): RESOURCE_REF_SCHEMA,
                vol.Required("theme"): RESOURCE_REF_SCHEMA,
                vol.Required("layout"): RESOURCE_REF_SCHEMA,
            },
            extra=vol.PREVENT_EXTRA,
        ),
        vol.Required("viewport"): vol.Schema(
            {
                vol.Required("fit"): vol.In(FIT_POLICIES),
                vol.Required("link_orientations"): bool,
            },
            extra=vol.PREVENT_EXTRA,
        ),
        vol.Required("components"): vol.All(
            [COMPONENT_SCHEMA],
            vol.Length(max=100),
        ),
        vol.Required("motion"): vol.Schema(
            {
                vol.Required("preset"): vol.In(ANIMATION_PRESETS),
                vol.Required("speed"): vol.All(
                    vol.Coerce(float),
                    vol.Range(min=0.1, max=5),
                ),
                vol.Required("intensity"): vol.All(
                    vol.Coerce(float),
                    vol.Range(min=0, max=1),
                ),
                vol.Required("stagger"): vol.All(
                    vol.Coerce(float),
                    vol.Range(min=0, max=5),
                ),
            },
            extra=vol.PREVENT_EXTRA,
        ),
        vol.Optional("frame_motion"): FRAME_MOTION_SCHEMA,
    },
    extra=vol.PREVENT_EXTRA,
)

THEME_RESOURCE_SCHEMA = vol.Schema(
    {
        vol.Required("id"): _RESOURCE_ID,
        vol.Required("version"): vol.All(int, vol.Range(min=1)),
        vol.Required("name"): vol.All(str, vol.Length(min=1, max=60)),
        vol.Required("tokens"): {
            vol.In(THEME_TOKEN_KEYS): _COLOR,
        },
        vol.Required("typography"): vol.Schema(
            {
                vol.Required("heading"): vol.All(str, vol.Length(min=1, max=120)),
                vol.Required("body"): vol.All(str, vol.Length(min=1, max=120)),
                vol.Required("heading_tracking"): vol.All(
                    vol.Coerce(float),
                    vol.Range(min=-0.1, max=1),
                ),
            },
            extra=vol.PREVENT_EXTRA,
        ),
        vol.Required("effects"): vol.Schema(
            {
                vol.Required("glow"): vol.All(
                    vol.Coerce(float),
                    vol.Range(min=0, max=1),
                ),
                vol.Required("animation"): vol.In(ANIMATION_PRESETS),
            },
            extra=vol.PREVENT_EXTRA,
        ),
    },
    extra=vol.PREVENT_EXTRA,
)

FRAME_RESOURCE_SCHEMA = vol.Schema(
    {
        vol.Required("id"): _RESOURCE_ID,
        vol.Required("version"): vol.All(int, vol.Range(min=1)),
        vol.Required("name"): vol.All(str, vol.Length(min=1, max=60)),
        vol.Required("layers"): [
            vol.Schema(
                {
                    vol.Required("id"): _COMPONENT_ID,
                    vol.Required("name"): vol.All(str, vol.Length(min=1, max=80)),
                    vol.Required("slot"): vol.In(
                        (
                            "background",
                            "bezel",
                            "lighting",
                            "foreground",
                            "content_mask",
                        )
                    ),
                    vol.Required("asset"): vol.Any(
                        None,
                        str,
                        {
                            vol.Required("portrait"): str,
                            vol.Required("landscape"): str,
                        },
                    ),
                    vol.Required("token"): vol.Any(None, str),
                    vol.Required("z_index"): vol.All(
                        int,
                        vol.Range(min=-100, max=100),
                    ),
                    vol.Required("locked"): bool,
                    vol.Required("opacity"): vol.All(
                        vol.Coerce(float),
                        vol.Range(min=0, max=1),
                    ),
                    vol.Required("blend_mode"): vol.In(BLEND_MODES),
                },
                extra=vol.PREVENT_EXTRA,
            )
        ],
        vol.Required("safe_opening"): {
            vol.In(ORIENTATION_KEYS): BOUNDS_SCHEMA,
        },
        vol.Required("theme_bindings"): {
            vol.All(str, vol.Length(min=1, max=80)): vol.In(THEME_TOKEN_KEYS),
        },
        vol.Required("layout_tuning"): vol.Schema(
            {
                vol.Required("poster_share"): vol.All(
                    vol.Coerce(float),
                    vol.Range(min=25, max=70),
                ),
                vol.Required("gap"): vol.All(
                    vol.Coerce(float),
                    vol.Range(min=0, max=5),
                ),
                vol.Required("details_padding"): vol.All(
                    vol.Coerce(float),
                    vol.Range(min=0, max=5),
                ),
            },
            extra=vol.PREVENT_EXTRA,
        ),
        vol.Required("motion"): FRAME_MOTION_SCHEMA,
    },
    extra=vol.PREVENT_EXTRA,
)

LAYOUT_RESOURCE_SCHEMA = vol.Schema(
    {
        vol.Required("id"): _RESOURCE_ID,
        vol.Required("version"): vol.All(int, vol.Range(min=1)),
        vol.Required("name"): vol.All(str, vol.Length(min=1, max=60)),
        vol.Required("components"): [COMPONENT_SCHEMA],
    },
    extra=vol.PREVENT_EXTRA,
)


def _bounds(x: float, y: float, width: float, height: float) -> dict[str, float]:
    """Create normalized bounds."""
    return {"x": x, "y": y, "width": width, "height": height}


def _component(  # noqa: PLR0913 - concise built-in resource declarations
    identifier: str,
    component_type: str,
    bounds: dict[str, float],
    z_index: int,
    style_ref: str,
    *,
    visible: bool = True,
    portrait: dict[str, float] | None = None,
    landscape: dict[str, float] | None = None,
    max_lines: int = 0,
    min_font_size: float = 0.8,
    locked: bool = False,
    clip: str = "safe_opening",
    style: dict[str, Any] | None = None,
    text: str = "",
) -> dict[str, Any]:
    """Create a built-in component declaration."""
    return {
        "id": identifier,
        "name": identifier.replace("_", " ").title(),
        "type": component_type,
        "bounds": bounds,
        "z_index": z_index,
        "visible": visible,
        "locked": locked,
        "blend_mode": "normal",
        "clip": clip,
        "style_ref": style_ref,
        "style": deepcopy(style) if style is not None else {},
        "constraints": {
            "max_lines": (
                max_lines
                or (
                    2
                    if component_type == "title"
                    else 4
                    if component_type == "summary"
                    else 0
                )
            ),
            "min_font_size": min_font_size,
            "preserve_aspect": component_type in {"poster", "logo", "custom_image"},
        },
        "text": text,
        "asset_ref": "",
        "orientation_overrides": {
            key: {"bounds": value}
            for key, value in {
                "portrait": portrait,
                "landscape": landscape,
            }.items()
            if value is not None
        },
    }


BUILTIN_THEMES: Final[dict[str, dict[str, Any]]] = {
    "classic": {
        "id": "builtin.theme.classic",
        "version": RESOURCE_VERSION,
        "name": "Classic",
        "tokens": {
            "light_primary": "#F6CF70",
            "light_secondary": "#B4232F",
            "accent_primary": "#F6CF70",
            "accent_secondary": "#7A251D",
            "text_heading": "#FFF7DF",
            "text_body": "#E8DCC2",
            "text_muted": "#C9BFA8",
            "text_inverse": "#160806",
            "surface": "#32110D",
            "surface_elevated": "#4A1711",
            "backdrop": "#090706",
            "border": "#B77A24",
            "progress_track": "#3B2118",
            "progress_fill": "#F6CF70",
        },
        "typography": {
            "heading": 'Georgia, "Times New Roman", serif',
            "body": '"Trebuchet MS", Arial, sans-serif',
            "heading_tracking": 0.08,
        },
        "effects": {"glow": 0.55, "animation": "chase"},
    },
    "art_deco": {
        "id": "builtin.theme.art_deco",
        "version": RESOURCE_VERSION,
        "name": "Art Deco",
        "tokens": {
            "light_primary": "#D8C17C",
            "light_secondary": "#2D8F78",
            "accent_primary": "#E9D59B",
            "accent_secondary": "#245E51",
            "text_heading": "#F0DFAA",
            "text_body": "#DED2AA",
            "text_muted": "#B9AB82",
            "text_inverse": "#071412",
            "surface": "#17332E",
            "surface_elevated": "#21473F",
            "backdrop": "#08100F",
            "border": "#7C6735",
            "progress_track": "#15302A",
            "progress_fill": "#D8C17C",
        },
        "typography": {
            "heading": 'Futura, Avenir, "Arial Narrow", sans-serif',
            "body": "Avenir, Montserrat, Arial, sans-serif",
            "heading_tracking": 0.16,
        },
        "effects": {"glow": 0.35, "animation": "shimmer"},
    },
    "neon": {
        "id": "builtin.theme.neon",
        "version": RESOURCE_VERSION,
        "name": "Neon",
        "tokens": {
            "light_primary": "#29F2FF",
            "light_secondary": "#FF3EA5",
            "accent_primary": "#29F2FF",
            "accent_secondary": "#B51FFF",
            "text_heading": "#F8EDFF",
            "text_body": "#E8DDF2",
            "text_muted": "#BCB0D0",
            "text_inverse": "#05000D",
            "surface": "#260052",
            "surface_elevated": "#3A0870",
            "backdrop": "#05000D",
            "border": "#29F2FF",
            "progress_track": "#25103B",
            "progress_fill": "#FF3EA5",
        },
        "typography": {
            "heading": 'Avenir, Montserrat, "Arial Narrow", sans-serif',
            "body": "Avenir, Montserrat, Arial, sans-serif",
            "heading_tracking": 0.12,
        },
        "effects": {"glow": 0.9, "animation": "pulse"},
    },
    "minimal": {
        "id": "builtin.theme.minimal",
        "version": RESOURCE_VERSION,
        "name": "Minimal",
        "tokens": {
            "light_primary": "#F2F2F2",
            "light_secondary": "#8A8A86",
            "accent_primary": "#171717",
            "accent_secondary": "#777777",
            "text_heading": "#171717",
            "text_body": "#383631",
            "text_muted": "#5B5954",
            "text_inverse": "#F5F3EE",
            "surface": "#F5F3EE",
            "surface_elevated": "#FFFFFF",
            "backdrop": "#E8E5DE",
            "border": "#777777",
            "progress_track": "#D1CEC6",
            "progress_fill": "#171717",
        },
        "typography": {
            "heading": "Avenir, Montserrat, Arial, sans-serif",
            "body": "Avenir, Montserrat, Arial, sans-serif",
            "heading_tracking": 0.03,
        },
        "effects": {"glow": 0.05, "animation": "none"},
    },
    "oled": {
        "id": "builtin.theme.oled",
        "version": RESOURCE_VERSION,
        "name": "OLED",
        "tokens": {
            "light_primary": "#FFFFFF",
            "light_secondary": "#777777",
            "accent_primary": "#FFFFFF",
            "accent_secondary": "#777777",
            "text_heading": "#FFFFFF",
            "text_body": "#D6D6D6",
            "text_muted": "#999999",
            "text_inverse": "#000000",
            "surface": "#000000",
            "surface_elevated": "#080808",
            "backdrop": "#000000",
            "border": "#292929",
            "progress_track": "#222222",
            "progress_fill": "#FFFFFF",
        },
        "typography": {
            "heading": "Avenir, Montserrat, Arial, sans-serif",
            "body": "Avenir, Montserrat, Arial, sans-serif",
            "heading_tracking": 0.08,
        },
        "effects": {"glow": 0.15, "animation": "breathe"},
    },
}

def _frame_resource(  # noqa: PLR0913 - declarative resource builder
    key: str,
    name: str,
    portrait_opening: dict[str, float],
    landscape_opening: dict[str, float],
    *,
    assets: dict[str, Any] | None = None,
    bindings: dict[str, str] | None = None,
    tuning: dict[str, float] | None = None,
    motion: dict[str, Any] | None = None,
) -> dict[str, Any]:
    """Create one explicit built-in Frame resource."""
    assets = assets or {}
    return {
        "id": f"builtin.frame.{key}",
        "version": RESOURCE_VERSION,
        "name": name,
        "layers": [
            {
                "id": f"frame_{slot}",
                "name": slot.replace("_", " ").title(),
                "slot": slot,
                "asset": assets.get(slot),
                "token": token,
                "z_index": {
                    "background": -100,
                    "content_mask": 70,
                    "bezel": 80,
                    "lighting": 90,
                    "foreground": 100,
                }[slot],
                "locked": True,
                "opacity": 1,
                "blend_mode": "normal",
            }
            for slot, token in (
                ("background", "backdrop"),
                ("bezel", "border"),
                ("lighting", "light_primary"),
                ("foreground", "accent_secondary"),
                ("content_mask", None),
            )
        ],
        "safe_opening": {
            "portrait": deepcopy(portrait_opening),
            "landscape": deepcopy(landscape_opening),
        },
        "theme_bindings": bindings or {
            "primary_light": "light_primary",
            "secondary_light": "light_secondary",
            "surface": "surface",
            "border": "border",
            "raised_surface": "surface_elevated",
            "trim": "accent_primary",
        },
        "layout_tuning": tuning or {
            "poster_share": 44,
            "gap": 1.35,
            "details_padding": 0.7,
        },
        "motion": motion or {
            "preset": "none",
            "speed": 1,
            "intensity": 0,
            "light_count": 0,
        },
    }


BUILTIN_FRAMES: Final[dict[str, dict[str, Any]]] = {
    "blank": _frame_resource(
        "blank", "Blank", _bounds(0, 0, 100, 100), _bounds(0, 0, 100, 100),
    ),
    "marquee": _frame_resource(
        "marquee",
        "Marquee",
        FRAME_SAFE_OPENING["portrait"],
        FRAME_SAFE_OPENING["landscape"],
        assets={
            "bezel": {
                "portrait": (
                    "/movie_poster_static/assets/marquee-frame-portrait.png"
                ),
                "landscape": (
                    "/movie_poster_static/assets/marquee-frame-landscape.png"
                ),
            },
        },
        bindings={
            "bulb_glass": "light_primary",
            "bulb_chase": "light_secondary",
            "metal_trim": "accent_primary",
            "cabinet": "surface",
            "inner_border": "border",
        },
        tuning={"poster_share": 45, "gap": 1.35, "details_padding": 0.7},
        motion={
            "preset": "marquee_chase", "speed": 1, "intensity": 0.8,
            "light_count": 18,
        },
    ),
    "cyber_noir": _frame_resource(
        "cyber_noir",
        "Cyber Noir",
        FRAME_SAFE_OPENING["portrait"],
        FRAME_SAFE_OPENING["landscape"],
        assets={
            "bezel": {
                "portrait": (
                    "/movie_poster_static/assets/cyber-noir-frame-portrait.png"
                ),
                "landscape": (
                    "/movie_poster_static/assets/cyber-noir-frame-landscape.png"
                ),
            },
        },
        bindings={
            "powered_rail": "light_primary",
            "fixture_core": "light_secondary",
            "glass_edge": "accent_primary",
            "metal_shadow": "surface",
            "metal_highlight": "surface_elevated",
            "screen_border": "border",
        },
        tuning={"poster_share": 43, "gap": 1.6, "details_padding": 0.7},
        motion={
            "preset": "cyber_scan", "speed": 0.8, "intensity": 0.85,
            "light_count": 8,
        },
    ),
    "comic_hero": _frame_resource(
        "comic_hero",
        "Comic Hero",
        FRAME_SAFE_OPENING["portrait"],
        FRAME_SAFE_OPENING["landscape"],
        assets={
            "bezel": {
                "portrait": (
                    "/movie_poster_static/assets/comic-hero-frame-portrait.png"
                ),
                "landscape": (
                    "/movie_poster_static/assets/comic-hero-frame-landscape.png"
                ),
            },
        },
        bindings={
            "ink": "border",
            "hero_fill": "accent_primary",
            "burst": "accent_secondary",
            "highlight": "light_primary",
            "caption": "surface_elevated",
        },
        tuning={"poster_share": 42, "gap": 1.35, "details_padding": 0.9},
        motion={
            "preset": "comic_energy", "speed": 0.65, "intensity": 0.55,
            "light_count": 6,
        },
    ),
    "theater_classic": _frame_resource(
        "theater_classic",
        "Theater Classic",
        FRAME_SAFE_OPENING["portrait"],
        FRAME_SAFE_OPENING["landscape"],
        assets={
            "bezel": {
                "portrait": (
                    "/movie_poster_static/assets/"
                    "theater-classic-frame-portrait.png"
                ),
                "landscape": (
                    "/movie_poster_static/assets/"
                    "theater-classic-frame-landscape.png"
                ),
            },
        },
        bindings={
            "sconce": "light_primary",
            "curtain": "accent_secondary",
            "velvet_shadow": "surface",
            "gilding": "accent_primary",
            "proscenium": "border",
        },
        tuning={"poster_share": 44, "gap": 1.35, "details_padding": 0.7},
        motion={
            "preset": "theater_sconce", "speed": 0.55, "intensity": 0.65,
            "light_count": 4,
        },
    ),
    "indie_nature": _frame_resource(
        "indie_nature",
        "Indie Nature",
        FRAME_SAFE_OPENING["portrait"],
        FRAME_SAFE_OPENING["landscape"],
        assets={
            "bezel": {
                "portrait": (
                    "/movie_poster_static/assets/indie-nature-frame-portrait.png"
                ),
                "landscape": (
                    "/movie_poster_static/assets/indie-nature-frame-landscape.png"
                ),
            },
        },
        bindings={
            "daylight": "light_primary",
            "foliage": "accent_secondary",
            "paper": "surface_elevated",
            "wood": "surface",
            "edge": "border",
        },
        tuning={"poster_share": 46, "gap": 1.8, "details_padding": 0.7},
        motion={
            "preset": "nature_dapple", "speed": 0.35, "intensity": 0.4,
            "light_count": 5,
        },
    ),
    "golden_age": _frame_resource(
        "golden_age",
        "Golden Age",
        FRAME_SAFE_OPENING["portrait"],
        FRAME_SAFE_OPENING["landscape"],
        assets={
            "bezel": {
                "portrait": (
                    "/movie_poster_static/assets/golden-age-frame-portrait.png"
                ),
                "landscape": (
                    "/movie_poster_static/assets/golden-age-frame-landscape.png"
                ),
            },
        },
        bindings={
            "footlight": "light_primary",
            "jewel": "light_secondary",
            "gold_leaf": "accent_primary",
            "lacquer": "surface",
            "ornament": "border",
        },
        tuning={"poster_share": 42, "gap": 1.35, "details_padding": 1},
        motion={
            "preset": "golden_footlights", "speed": 0.7, "intensity": 0.75,
            "light_count": 12,
        },
    ),
    "steampunk": _frame_resource(
        "steampunk",
        "Steampunk",
        FRAME_SAFE_OPENING["portrait"],
        FRAME_SAFE_OPENING["landscape"],
        assets={
            "bezel": {
                "portrait": (
                    "/movie_poster_static/assets/steampunk-frame-portrait.png"
                ),
                "landscape": (
                    "/movie_poster_static/assets/steampunk-frame-landscape.png"
                ),
            },
        },
        bindings={
            "gauge_light": "light_primary",
            "indicator": "light_secondary",
            "brass": "accent_primary",
            "iron": "surface",
            "rivets": "border",
        },
        tuning={"poster_share": 43, "gap": 1.5, "details_padding": 0.7},
        motion={
            "preset": "steampunk_mechanical", "speed": 0.4,
            "intensity": 0.65, "light_count": 6,
        },
    ),
}

_CINEMATIC_COMPONENTS: Final = [
    _component("backdrop", "backdrop", _bounds(0, 0, 100, 100), -10, "backdrop"),
    _component("logo", "logo", _bounds(38, 3, 24, 8), 10, "accent_primary"),
    _component(
        "mode_heading",
        "mode_heading",
        _bounds(14, 10, 72, 8),
        10,
        "text_heading",
    ),
    _component(
        "poster", "poster", _bounds(12, 20, 44, 68), 5, "border",
        portrait=_bounds(15, 18, 70, 52),
    ),
    _component(
        "title", "title", _bounds(60, 27, 30, 12), 10, "text_heading",
        portrait=_bounds(12, 72, 76, 8),
    ),
    _component(
        "subtitle", "subtitle", _bounds(60, 40, 30, 8), 10, "text_body",
        portrait=_bounds(12, 81, 76, 5),
    ),
    _component(
        "summary", "summary", _bounds(60, 50, 30, 22), 10, "text_body",
        portrait=_bounds(12, 87, 76, 8),
    ),
    _component(
        "progress", "progress", _bounds(60, 77, 30, 3), 10, "progress_fill",
        portrait=_bounds(12, 96, 76, 2),
    ),
]


# Marquee is the declarative reference preset. Its Profile keeps the generic
# Cinematic Layout reference while embedding frame-specific component
# overrides. This allows Layouts to remain reusable and gives the editor an
# honest, bounded model of the complete display instead of relying on legacy
# CSS to invent a metadata region around a partial component tree.
_MARQUEE_CINEMATIC_COMPONENTS: Final = [
    _component(
        "backdrop",
        "backdrop",
        _bounds(0, 0, 100, 100),
        -10,
        "backdrop",
        locked=True,
        clip="canvas",
        style={"image_fit": "cover", "opacity": 0.42},
    ),
    _component(
        "heading_surface",
        "surface",
        _bounds(24, 22, 52, 8),
        4,
        "surface_elevated",
        portrait=_bounds(25, 18.5, 50, 6),
        locked=True,
        style={"opacity": 0.96},
    ),
    _component(
        "mode_heading",
        "mode_heading",
        _bounds(26, 23.2, 48, 5.6),
        10,
        "text_heading",
        portrait=_bounds(27, 19.3, 46, 4.3),
        max_lines=1,
        min_font_size=2.2,
        style={
            "font_size": 3.4,
            "font_family": "theme_heading",
            "text_align": "center",
            "glow": 0.22,
        },
    ),
    _component(
        "poster",
        "poster",
        _bounds(20, 32, 24, 46),
        5,
        "border",
        portrait=_bounds(29, 26, 42, 35),
        style={"image_fit": "cover"},
    ),
    _component(
        "metadata_surface",
        "surface",
        _bounds(47, 32, 34, 46),
        4,
        "surface_elevated",
        portrait=_bounds(23, 63, 54, 21.5),
        locked=True,
        style={"opacity": 0.96},
    ),
    _component(
        "title",
        "title",
        _bounds(49.5, 35, 29, 10.5),
        10,
        "text_heading",
        portrait=_bounds(25, 64.5, 50, 5.8),
        max_lines=2,
        min_font_size=2.2,
        style={
            "font_size": 3.3,
            "font_family": "theme_heading",
            "text_align": "left",
            "glow": 0.12,
        },
    ),
    _component(
        "subtitle",
        "subtitle",
        _bounds(49.5, 46, 29, 5.5),
        10,
        "text_body",
        portrait=_bounds(25, 70.4, 50, 3.1),
        max_lines=2,
        min_font_size=1.1,
        style={"font_size": 1.7, "text_align": "left"},
    ),
    _component(
        "year",
        "year",
        _bounds(49.5, 52.5, 7, 3.5),
        10,
        "text_muted",
        portrait=_bounds(25, 74, 9, 2.5),
        max_lines=1,
        min_font_size=0.8,
        style={"font_size": 1.4, "text_align": "left"},
    ),
    _component(
        "content_rating",
        "content_rating",
        _bounds(57.5, 52.5, 9, 3.5),
        10,
        "text_muted",
        portrait=_bounds(35, 74, 12, 2.5),
        max_lines=1,
        min_font_size=0.8,
        style={"font_size": 1.4, "text_align": "center"},
    ),
    _component(
        "runtime",
        "runtime",
        _bounds(67.5, 52.5, 11, 3.5),
        10,
        "text_muted",
        portrait=_bounds(48, 74, 15, 2.5),
        max_lines=1,
        min_font_size=0.8,
        style={"font_size": 1.4, "text_align": "right"},
    ),
    _component(
        "summary",
        "summary",
        _bounds(49.5, 57, 29, 10.5),
        10,
        "text_body",
        portrait=_bounds(25, 76.8, 50, 4),
        max_lines=4,
        min_font_size=0.9,
        style={"font_size": 1.55, "text_align": "left"},
    ),
    _component(
        "active_user",
        "active_user",
        _bounds(49.5, 69, 13, 3.5),
        10,
        "text_muted",
        portrait=_bounds(25, 81.2, 22, 2.4),
        max_lines=1,
        min_font_size=0.8,
        style={"font_size": 1.25, "text_align": "left"},
    ),
    _component(
        "session_separator",
        "static_text",
        _bounds(62.5, 69, 2, 3.5),
        10,
        "text_muted",
        portrait=_bounds(47.2, 81.2, 3, 2.4),
        max_lines=1,
        min_font_size=0.8,
        locked=True,
        style={"font_size": 1.25, "text_align": "center"},
        text="·",
    ),
    _component(
        "player_name",
        "player_name",
        _bounds(64.5, 69, 14, 3.5),
        10,
        "text_muted",
        portrait=_bounds(50.5, 81.2, 24.5, 2.4),
        max_lines=1,
        min_font_size=0.8,
        style={"font_size": 1.25, "text_align": "right"},
    ),
    _component(
        "progress",
        "progress",
        _bounds(49.5, 74.5, 29, 1.5),
        10,
        "progress_fill",
        portrait=_bounds(25, 83.8, 50, 0.8),
    ),
    _component(
        "logo",
        "logo",
        _bounds(46, 19.5, 8, 2.2),
        12,
        "accent_primary",
        portrait=_bounds(46, 16.2, 8, 1.8),
        visible=False,
        style={"image_fit": "contain"},
    ),
]


# Some Frames need an authored arrangement that is more specific than the
# reusable Layout alone. Publish those narrow overrides in the catalog so the
# Display Studio can resolve the same component tree as the backend while the
# user previews a preset before saving it.
FRAME_LAYOUT_OVERRIDES: Final[dict[str, dict[str, Any]]] = {
    "marquee:cinematic": {
        "components": _MARQUEE_CINEMATIC_COMPONENTS,
        "motion_preset": "none",
    },
}

BUILTIN_LAYOUTS: Final[dict[str, dict[str, Any]]] = {
    "blank": {
        "id": "builtin.layout.blank",
        "version": RESOURCE_VERSION,
        "name": "Blank",
        "components": [],
    },
    "cinematic": {
        "id": "builtin.layout.cinematic",
        "version": RESOURCE_VERSION,
        "name": "Cinematic",
        "components": _CINEMATIC_COMPONENTS,
    },
    "poster": {
        "id": "builtin.layout.poster",
        "version": RESOURCE_VERSION,
        "name": "Poster",
        "components": [
            _component(
                "backdrop",
                "backdrop",
                _bounds(0, 0, 100, 100),
                -10,
                "backdrop",
            ),
            _component("poster", "poster", _bounds(22, 10, 56, 78), 5, "border"),
            _component(
                "title", "title", _bounds(18, 90, 64, 7), 10, "text_heading",
                landscape=_bounds(24, 88, 52, 8),
            ),
            _component(
                "subtitle",
                "subtitle",
                _bounds(22, 97, 56, 3),
                10,
                "text_muted",
                landscape=_bounds(24, 96, 52, 3),
            ),
        ],
    },
    "split": {
        "id": "builtin.layout.split",
        "version": RESOURCE_VERSION,
        "name": "Split",
        "components": [
            _component(
                "backdrop", "backdrop", _bounds(0, 0, 100, 100), -10, "backdrop",
            ),
            _component(
                "poster", "poster", _bounds(4, 10, 44, 80), 5, "border",
                portrait=_bounds(8, 8, 84, 47),
            ),
            _component(
                "mode_heading",
                "mode_heading",
                _bounds(53, 9, 42, 8),
                10,
                "text_heading",
                portrait=_bounds(10, 57, 80, 6),
            ),
            _component(
                "title", "title", _bounds(53, 20, 42, 13), 10, "text_heading",
                portrait=_bounds(10, 65, 80, 8),
            ),
            _component(
                "subtitle", "subtitle", _bounds(53, 35, 42, 7), 10, "text_body",
                portrait=_bounds(10, 74, 80, 5),
            ),
            _component(
                "summary", "summary", _bounds(53, 45, 42, 25), 10, "text_body",
                portrait=_bounds(10, 80, 80, 13),
            ),
            _component(
                "progress",
                "progress",
                _bounds(53, 76, 42, 3),
                10,
                "progress_fill",
                portrait=_bounds(10, 95, 80, 2),
            ),
        ],
    },
}


def validate_builtin_catalog() -> None:
    """Validate every bundled resource at import-test time."""
    for theme in BUILTIN_THEMES.values():
        validated = THEME_RESOURCE_SCHEMA(theme)
        if set(validated["tokens"]) != set(THEME_TOKEN_KEYS):
            msg = f"Theme {theme['id']} does not define every semantic token"
            raise vol.Invalid(msg)
    for frame in BUILTIN_FRAMES.values():
        FRAME_RESOURCE_SCHEMA(frame)
    for layout in BUILTIN_LAYOUTS.values():
        LAYOUT_RESOURCE_SCHEMA(layout)
    for override in FRAME_LAYOUT_OVERRIDES.values():
        for component in override["components"]:
            COMPONENT_SCHEMA(component)
        if override["motion_preset"] not in ANIMATION_PRESETS:
            msg = f"Unsupported Frame/Layout motion: {override['motion_preset']}"
            raise vol.Invalid(msg)


def validate_design_document(document: dict[str, Any]) -> dict[str, Any]:
    """Migrate and validate a declarative design document."""
    candidate = deepcopy(document)
    version = candidate.get("schema_version", LEGACY_DESIGN_SCHEMA_VERSION)
    if version == LEGACY_DESIGN_SCHEMA_VERSION:
        candidate["schema_version"] = DESIGN_SCHEMA_VERSION
        for component in candidate.get("components", []):
            identifier = str(component.get("id", "Layer"))
            component.setdefault("name", identifier.replace("_", " ").title())
            component.setdefault("locked", False)
            component.setdefault("blend_mode", "normal")
            component.setdefault("clip", "safe_opening")
            component.setdefault(
                "constraints",
                {
                    "max_lines": (
                        2
                        if component.get("type") == "title"
                        else 4
                        if component.get("type") == "summary"
                        else 0
                    ),
                    "min_font_size": 0.8,
                    "preserve_aspect": component.get("type")
                    in {"poster", "logo", "custom_image"},
                },
            )
    elif version != DESIGN_SCHEMA_VERSION:
        msg = f"Unsupported design schema version: {version}"
        raise vol.Invalid(msg)
    return DESIGN_SCHEMA(candidate)


def design_from_legacy_presentation(
    presentation: dict[str, Any],
) -> dict[str, Any]:
    """Build a declarative design from the legacy flat presentation."""
    frame = str(presentation.get("frame_theme", "marquee"))
    theme = str(presentation.get("theme", "classic"))
    layout = str(presentation.get("layout", "cinematic"))
    if frame not in BUILTIN_FRAMES:
        frame = "marquee"
    if theme not in BUILTIN_THEMES:
        theme = "classic"
    if layout not in BUILTIN_LAYOUTS:
        layout = "cinematic"

    override = FRAME_LAYOUT_OVERRIDES.get(f"{frame}:{layout}")
    components = deepcopy(
        override["components"]
        if override is not None
        else BUILTIN_LAYOUTS[layout]["components"]
    )
    show_session = bool(presentation.get("show_session", True))
    show_details = any(
        bool(presentation.get(key, True))
        for key in (
            "show_title",
            "show_subtitle",
            "show_year",
            "show_rating",
            "show_runtime",
            "show_summary",
            "show_progress",
            "show_session",
        )
    )
    visibility = {
        "logo": bool(str(presentation.get("logo_url", "")).strip()),
        "metadata_surface": show_details,
        "title": bool(presentation.get("show_title", True)),
        "subtitle": bool(presentation.get("show_subtitle", True)),
        "year": bool(presentation.get("show_year", True)),
        "content_rating": bool(presentation.get("show_rating", True)),
        "runtime": bool(presentation.get("show_runtime", True)),
        "summary": bool(presentation.get("show_summary", True)),
        "progress": bool(presentation.get("show_progress", True)),
        "active_user": show_session,
        "session_separator": show_session,
        "player_name": show_session,
    }
    for component in components:
        if component["id"] in visibility:
            component["visible"] = visibility[component["id"]]

    return DESIGN_SCHEMA(
        {
            "schema_version": DESIGN_SCHEMA_VERSION,
            "resources": {
                "frame": {
                    "id": BUILTIN_FRAMES[frame]["id"],
                    "version": RESOURCE_VERSION,
                },
                "theme": {
                    "id": BUILTIN_THEMES[theme]["id"],
                    "version": RESOURCE_VERSION,
                },
                "layout": {
                    "id": BUILTIN_LAYOUTS[layout]["id"],
                    "version": RESOURCE_VERSION,
                },
            },
            "viewport": {
                "fit": FIT_CONTAIN,
                "link_orientations": True,
            },
            "components": components,
            "motion": {
                # The Marquee frame owns its chasing-bulb motion. Moving each
                # content layer with the Theme's generic chase made the
                # authored poster, plaque, and text drift independently.
                "preset": (
                    override["motion_preset"]
                    if override is not None
                    else BUILTIN_THEMES[theme]["effects"]["animation"]
                ),
                "speed": 1,
                "intensity": BUILTIN_THEMES[theme]["effects"]["glow"],
                "stagger": 0.15,
            },
        }
    )


def blank_design() -> dict[str, Any]:
    """Return a linked, contained design with no dynamic components."""
    return DESIGN_SCHEMA(
        {
            "schema_version": DESIGN_SCHEMA_VERSION,
            "resources": {
                "frame": {
                    "id": BUILTIN_FRAMES["blank"]["id"],
                    "version": RESOURCE_VERSION,
                },
                "theme": {
                    "id": BUILTIN_THEMES["classic"]["id"],
                    "version": RESOURCE_VERSION,
                },
                "layout": {
                    "id": BUILTIN_LAYOUTS["blank"]["id"],
                    "version": RESOURCE_VERSION,
                },
            },
            "viewport": {
                "fit": FIT_CONTAIN,
                "link_orientations": True,
            },
            "components": [],
            "motion": {
                "preset": "none",
                "speed": 1,
                "intensity": 0,
                "stagger": 0,
            },
        }
    )


def builtin_catalog() -> dict[str, Any]:
    """Return a defensive copy of the built-in presentation catalog."""
    return {
        "schema_version": DESIGN_SCHEMA_VERSION,
        "frames": deepcopy(BUILTIN_FRAMES),
        "themes": deepcopy(BUILTIN_THEMES),
        "layouts": deepcopy(BUILTIN_LAYOUTS),
        "frame_layout_overrides": deepcopy(FRAME_LAYOUT_OVERRIDES),
        "component_types": list(COMPONENT_TYPES),
        "animation_presets": list(ANIMATION_PRESETS),
    }


def semantic_style_for_presentation(
    presentation: dict[str, Any],
) -> dict[str, Any]:
    """Resolve one built-in Theme into frontend-safe semantic styles."""
    theme_id = str(presentation.get("theme", "classic"))
    theme = BUILTIN_THEMES.get(theme_id, BUILTIN_THEMES["classic"])
    return {
        "id": theme["id"],
        "version": theme["version"],
        "colors": deepcopy(theme["tokens"]),
        "typography": deepcopy(theme["typography"]),
        "effects": deepcopy(theme["effects"]),
    }


def frame_geometry_for_presentation(
    presentation: dict[str, Any],
) -> dict[str, Any]:
    """Resolve frontend-safe geometry for one built-in Frame."""
    frame_id = str(presentation.get("frame_theme", "marquee"))
    frame = BUILTIN_FRAMES.get(frame_id, BUILTIN_FRAMES["marquee"])
    return {
        "id": frame["id"],
        "version": frame["version"],
        "layers": deepcopy(frame["layers"]),
        "safe_opening": deepcopy(frame["safe_opening"]),
        "layout_tuning": deepcopy(frame["layout_tuning"]),
        "motion": deepcopy(frame["motion"]),
    }


validate_builtin_catalog()
