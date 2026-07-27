"""Tests for secure .movieposter packages."""

import io
import json
import zipfile

import pytest
import voluptuous as vol

from custom_components.movie_poster.presentation_package import (
    build_package,
    read_package,
)
from custom_components.movie_poster.profiles import (
    presentation_from_options,
    validate_profile_document,
)

PNG = b"\x89PNG\r\n\x1a\n" + b"sample"


def profile() -> dict:
    """Return a valid Profile document."""
    return validate_profile_document(
        {
            "version": 1,
            "name": "Shareable",
            "presentation": presentation_from_options({"theme": "neon"}),
        }
    )


def test_package_round_trip_preserves_profile_and_assets() -> None:
    """A complete package validates and reproduces its contents."""
    source = profile()
    payload = build_package(
        "shareable.neon",
        source,
        {"assets/images/frame.png": PNG},
    )
    result = read_package(payload)

    assert result["profile"] == source
    assert result["assets"] == {"assets/images/frame.png": PNG}
    assert result["manifest"]["package_id"] == "shareable.neon"


def test_package_rejects_traversal_and_unlisted_files() -> None:
    """Imports fail closed on traversal and manifest mismatches."""
    archive = io.BytesIO()
    with zipfile.ZipFile(archive, "w") as package:
        package.writestr("../manifest.json", "{}")
    with pytest.raises(vol.Invalid, match="Unsafe package path"):
        read_package(archive.getvalue())

    valid = build_package("shareable.neon", profile())
    source = zipfile.ZipFile(io.BytesIO(valid))
    changed = io.BytesIO()
    with source, zipfile.ZipFile(changed, "w") as package:
        for item in source.infolist():
            package.writestr(item.filename, source.read(item.filename))
        package.writestr("assets/images/unlisted.png", PNG)
    with pytest.raises(vol.Invalid, match="do not match"):
        read_package(changed.getvalue())


def test_package_rejects_hash_changes_and_fake_assets() -> None:
    """Manifest hashes and asset signatures are enforced."""
    valid = build_package(
        "shareable.neon",
        profile(),
        {"assets/images/frame.png": PNG},
    )
    source = zipfile.ZipFile(io.BytesIO(valid))
    changed = io.BytesIO()
    with source, zipfile.ZipFile(changed, "w") as package:
        for item in source.infolist():
            content = source.read(item.filename)
            if item.filename == "assets/images/frame.png":
                content += b"tampered"
            package.writestr(item.filename, content)
    with pytest.raises(vol.Invalid, match="size mismatch"):
        read_package(changed.getvalue())

    with pytest.raises(vol.Invalid, match="signature"):
        build_package(
            "shareable.neon",
            profile(),
            {"assets/images/not-really.png": b"<script>alert(1)</script>"},
        )


def test_package_manifest_must_be_json_object() -> None:
    """A syntactically valid but non-object manifest is rejected."""
    archive = io.BytesIO()
    with zipfile.ZipFile(archive, "w") as package:
        package.writestr("manifest.json", json.dumps([]))
    with pytest.raises(vol.Invalid, match="must be an object"):
        read_package(archive.getvalue())
