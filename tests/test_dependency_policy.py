"""Tests for runtime dependency compatibility policy."""

import json
import tomllib
from pathlib import Path

PROJECT_ROOT = Path(__file__).parents[1]


def test_plexapi_requirement_is_bounded_and_shared() -> None:
    """Runtime and development installs share a compatible PlexAPI 4.x range."""
    pyproject = tomllib.loads((PROJECT_ROOT / "pyproject.toml").read_text())
    manifest = json.loads(
        (
            PROJECT_ROOT / "custom_components" / "movie_poster" / "manifest.json"
        ).read_text()
    )

    project_requirement = next(
        requirement
        for requirement in pyproject["project"]["dependencies"]
        if requirement.startswith("PlexAPI")
    )
    runtime_requirement = next(
        requirement
        for requirement in manifest["requirements"]
        if requirement.startswith("PlexAPI")
    )

    assert runtime_requirement == project_requirement
    assert ">=" in runtime_requirement
    assert "<5" in runtime_requirement
    assert "==" not in runtime_requirement
