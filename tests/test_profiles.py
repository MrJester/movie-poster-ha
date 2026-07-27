"""Tests for reusable display profile validation."""

import pytest
import voluptuous as vol

from custom_components.movie_poster.profiles import (
    PROFILE_VERSION,
    make_profile_id,
    presentation_from_options,
    stored_profiles,
    validate_profile_document,
)


def test_default_profile_is_complete_and_url_safe() -> None:
    """Legacy options become a complete versioned default profile."""
    profiles = stored_profiles({"theme": "neon", "layout": "split"})

    assert profiles["default"]["version"] == PROFILE_VERSION
    assert profiles["default"]["presentation"]["theme"] == "neon"
    assert profiles["default"]["presentation"]["layout"] == "split"
    assert profiles["default"]["design"]["resources"]["theme"]["id"] == (
        "builtin.theme.neon"
    )
    assert make_profile_id(" 55-inch Theater TV ") == "55-inch-theater-tv"


def test_import_rejects_unknown_or_invalid_presentation_fields() -> None:
    """Imports cannot inject unsupported settings or invalid colors."""
    presentation = presentation_from_options({})
    migrated = validate_profile_document(
        {"version": 1, "name": "Portrait", "presentation": presentation}
    )
    assert migrated["name"] == "Portrait"
    assert migrated["version"] == PROFILE_VERSION
    assert migrated["design"]["viewport"]["fit"] == "contain"

    with pytest.raises(vol.Invalid):
        validate_profile_document(
            {
                "version": 1,
                "name": "Bad",
                "presentation": {
                    **presentation,
                    "accent_color": "red",
                    "unexpected": True,
                },
            }
        )


def test_corrupt_saved_profiles_are_ignored() -> None:
    """One damaged custom profile never prevents the default from loading."""
    profiles = stored_profiles({"display_profiles": {"broken": {"name": "Broken"}}})

    assert set(profiles) == {"default"}


def test_version_two_profile_round_trips() -> None:
    """Current Profiles preserve design metadata and declarative resources."""
    presentation = presentation_from_options({"theme": "art_deco"})
    migrated = validate_profile_document(
        {"version": 1, "name": "Deco", "presentation": presentation}
    )
    migrated["description"] = "A shareable presentation"
    migrated["author"] = "Movie Poster"

    assert validate_profile_document(migrated) == migrated
