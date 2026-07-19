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
    assert make_profile_id(" 55-inch Theater TV ") == "55-inch-theater-tv"


def test_import_rejects_unknown_or_invalid_presentation_fields() -> None:
    """Imports cannot inject unsupported settings or invalid colors."""
    presentation = presentation_from_options({})
    valid = validate_profile_document(
        {"version": 1, "name": "Portrait", "presentation": presentation}
    )
    assert valid["name"] == "Portrait"

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
