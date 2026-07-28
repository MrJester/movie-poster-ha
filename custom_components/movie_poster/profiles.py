"""Validated reusable display profiles."""

from __future__ import annotations

import re
from typing import Any

import voluptuous as vol

from .const import (
    CONF_ACCENT_COLOR,
    CONF_BACKGROUND_COLOR,
    CONF_BODY_FONT,
    CONF_COMING_SOON_TEXT,
    CONF_DISPLAY_PROFILES,
    CONF_ENABLE_MOTION,
    CONF_EYEBROW_TEXT,
    CONF_FRAME_THEME,
    CONF_HEADING_FONT,
    CONF_KIOSK_MODE,
    CONF_LAYOUT,
    CONF_LOGO_POSITION,
    CONF_LOGO_URL,
    CONF_NOW_PLAYING_TEXT,
    CONF_ORIENTATION,
    CONF_SHOW_PROGRESS,
    CONF_SHOW_RATING,
    CONF_SHOW_RUNTIME,
    CONF_SHOW_SESSION,
    CONF_SHOW_SUBTITLE,
    CONF_SHOW_SUMMARY,
    CONF_SHOW_TITLE,
    CONF_SHOW_YEAR,
    CONF_THEME,
    DEFAULT_ACCENT_COLOR,
    DEFAULT_BACKGROUND_COLOR,
    DEFAULT_BODY_FONT,
    DEFAULT_COMING_SOON_TEXT,
    DEFAULT_ENABLE_MOTION,
    DEFAULT_EYEBROW_TEXT,
    DEFAULT_FRAME_THEME,
    DEFAULT_HEADING_FONT,
    DEFAULT_KIOSK_MODE,
    DEFAULT_LAYOUT,
    DEFAULT_LOGO_POSITION,
    DEFAULT_LOGO_URL,
    DEFAULT_NOW_PLAYING_TEXT,
    DEFAULT_ORIENTATION,
    DEFAULT_PROFILE_ID,
    DEFAULT_SHOW_PROGRESS,
    DEFAULT_SHOW_RATING,
    DEFAULT_SHOW_RUNTIME,
    DEFAULT_SHOW_SESSION,
    DEFAULT_SHOW_SUBTITLE,
    DEFAULT_SHOW_SUMMARY,
    DEFAULT_SHOW_TITLE,
    DEFAULT_SHOW_YEAR,
    DEFAULT_THEME,
    FONTS,
    FRAME_THEMES,
    LAYOUTS,
    LOGO_POSITIONS,
    ORIENTATIONS,
    THEMES,
)
from .presentation_resources import DESIGN_SCHEMA, design_from_legacy_presentation

PROFILE_VERSION = 2
PROFILE_KEYS = (
    CONF_THEME,
    CONF_ORIENTATION,
    CONF_LAYOUT,
    CONF_FRAME_THEME,
    CONF_SHOW_TITLE,
    CONF_SHOW_SUBTITLE,
    CONF_SHOW_YEAR,
    CONF_SHOW_RATING,
    CONF_SHOW_RUNTIME,
    CONF_SHOW_SUMMARY,
    CONF_SHOW_PROGRESS,
    CONF_SHOW_SESSION,
    CONF_ENABLE_MOTION,
    CONF_KIOSK_MODE,
    CONF_ACCENT_COLOR,
    CONF_BACKGROUND_COLOR,
    CONF_HEADING_FONT,
    CONF_BODY_FONT,
    CONF_NOW_PLAYING_TEXT,
    CONF_COMING_SOON_TEXT,
    CONF_EYEBROW_TEXT,
    CONF_LOGO_URL,
    CONF_LOGO_POSITION,
)
_DEFAULTS: dict[str, Any] = {
    CONF_THEME: DEFAULT_THEME,
    CONF_ORIENTATION: DEFAULT_ORIENTATION,
    CONF_LAYOUT: DEFAULT_LAYOUT,
    CONF_FRAME_THEME: DEFAULT_FRAME_THEME,
    CONF_SHOW_TITLE: DEFAULT_SHOW_TITLE,
    CONF_SHOW_SUBTITLE: DEFAULT_SHOW_SUBTITLE,
    CONF_SHOW_YEAR: DEFAULT_SHOW_YEAR,
    CONF_SHOW_RATING: DEFAULT_SHOW_RATING,
    CONF_SHOW_RUNTIME: DEFAULT_SHOW_RUNTIME,
    CONF_SHOW_SUMMARY: DEFAULT_SHOW_SUMMARY,
    CONF_SHOW_PROGRESS: DEFAULT_SHOW_PROGRESS,
    CONF_SHOW_SESSION: DEFAULT_SHOW_SESSION,
    CONF_ENABLE_MOTION: DEFAULT_ENABLE_MOTION,
    CONF_KIOSK_MODE: DEFAULT_KIOSK_MODE,
    CONF_ACCENT_COLOR: DEFAULT_ACCENT_COLOR,
    CONF_BACKGROUND_COLOR: DEFAULT_BACKGROUND_COLOR,
    CONF_HEADING_FONT: DEFAULT_HEADING_FONT,
    CONF_BODY_FONT: DEFAULT_BODY_FONT,
    CONF_NOW_PLAYING_TEXT: DEFAULT_NOW_PLAYING_TEXT,
    CONF_COMING_SOON_TEXT: DEFAULT_COMING_SOON_TEXT,
    CONF_EYEBROW_TEXT: DEFAULT_EYEBROW_TEXT,
    CONF_LOGO_URL: DEFAULT_LOGO_URL,
    CONF_LOGO_POSITION: DEFAULT_LOGO_POSITION,
}

PRESENTATION_SCHEMA = vol.Schema(
    {
        vol.Required(CONF_THEME): vol.In(THEMES),
        vol.Required(CONF_ORIENTATION): vol.In(ORIENTATIONS),
        vol.Required(CONF_LAYOUT): vol.In(LAYOUTS),
        vol.Required(CONF_FRAME_THEME): vol.In(FRAME_THEMES),
        vol.Optional(CONF_SHOW_TITLE, default=DEFAULT_SHOW_TITLE): bool,
        vol.Optional(CONF_SHOW_SUBTITLE, default=DEFAULT_SHOW_SUBTITLE): bool,
        vol.Optional(CONF_SHOW_YEAR, default=DEFAULT_SHOW_YEAR): bool,
        vol.Optional(CONF_SHOW_RATING, default=DEFAULT_SHOW_RATING): bool,
        vol.Optional(CONF_SHOW_RUNTIME, default=DEFAULT_SHOW_RUNTIME): bool,
        vol.Required(CONF_SHOW_SUMMARY): bool,
        vol.Required(CONF_SHOW_PROGRESS): bool,
        vol.Required(CONF_SHOW_SESSION): bool,
        vol.Required(CONF_ENABLE_MOTION): bool,
        vol.Required(CONF_KIOSK_MODE): bool,
        vol.Required(CONF_ACCENT_COLOR): vol.Match(r"^#[0-9a-fA-F]{6}$"),
        vol.Required(CONF_BACKGROUND_COLOR): vol.Match(r"^#[0-9a-fA-F]{6}$"),
        vol.Required(CONF_HEADING_FONT): vol.In(FONTS),
        vol.Required(CONF_BODY_FONT): vol.In(FONTS),
        vol.Required(CONF_NOW_PLAYING_TEXT): vol.All(str, vol.Length(min=1, max=60)),
        vol.Required(CONF_COMING_SOON_TEXT): vol.All(str, vol.Length(min=1, max=60)),
        vol.Required(CONF_EYEBROW_TEXT): vol.All(str, vol.Length(min=1, max=80)),
        vol.Required(CONF_LOGO_URL): vol.All(str, vol.Length(max=500)),
        vol.Required(CONF_LOGO_POSITION): vol.In(LOGO_POSITIONS),
    },
    extra=vol.PREVENT_EXTRA,
)


def presentation_from_options(options: dict[str, Any]) -> dict[str, Any]:
    """Return a complete validated presentation from config options."""
    return PRESENTATION_SCHEMA(
        {key: options.get(key, default) for key, default in _DEFAULTS.items()}
    )


def make_profile_id(name: str) -> str:
    """Create a stable URL-safe profile identifier."""
    value = re.sub(r"[^a-z0-9]+", "-", name.strip().casefold()).strip("-")
    return value[:40] or "display"


def stored_profiles(options: dict[str, Any]) -> dict[str, dict[str, Any]]:
    """Return valid stored profiles plus the implicit default profile."""
    default_presentation = presentation_from_options(options)
    result = {
        DEFAULT_PROFILE_ID: {
            "name": "Default",
            "version": PROFILE_VERSION,
            "description": "",
            "author": "",
            "presentation": default_presentation,
            "design": design_from_legacy_presentation(default_presentation),
        }
    }
    raw = options.get(CONF_DISPLAY_PROFILES, {})
    if not isinstance(raw, dict):
        return result
    for identifier, value in raw.items():
        if identifier == DEFAULT_PROFILE_ID or not isinstance(value, dict):
            continue
        try:
            profile = _migrate_profile_document(value)
        except vol.Invalid:
            continue
        result[str(identifier)] = profile
    return result


def validate_profile_document(document: dict[str, Any]) -> dict[str, Any]:
    """Validate and migrate an imported profile document."""
    return _migrate_profile_document(document)


def _migrate_profile_document(document: dict[str, Any]) -> dict[str, Any]:
    """Return the current representation of a legacy or current Profile."""
    version = document.get("version", 1)
    if version == 1:
        legacy = vol.Schema(
            {
                vol.Required("version"): vol.Equal(1),
                vol.Required("name"): vol.All(str, vol.Length(min=1, max=60)),
                vol.Required("presentation"): PRESENTATION_SCHEMA,
            },
            extra=vol.PREVENT_EXTRA,
        )(document)
        return {
            "version": PROFILE_VERSION,
            "name": legacy["name"],
            "description": "",
            "author": "",
            "presentation": legacy["presentation"],
            "design": design_from_legacy_presentation(legacy["presentation"]),
        }

    return vol.Schema(
        {
            vol.Required("version"): vol.Equal(PROFILE_VERSION),
            vol.Required("name"): vol.All(str, vol.Length(min=1, max=60)),
            vol.Optional("description", default=""): vol.All(
                str,
                vol.Length(max=500),
            ),
            vol.Optional("author", default=""): vol.All(
                str,
                vol.Length(max=120),
            ),
            vol.Required("presentation"): PRESENTATION_SCHEMA,
            vol.Required("design"): DESIGN_SCHEMA,
        },
        extra=vol.PREVENT_EXTRA,
    )(document)
