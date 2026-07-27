"""Secure import and export for shareable .movieposter packages."""

from __future__ import annotations

import hashlib
import io
import json
import zipfile
from pathlib import PurePosixPath
from typing import Any, Final

import voluptuous as vol

from .profiles import validate_profile_document

PACKAGE_VERSION: Final = 1
MAX_PACKAGE_BYTES: Final = 50 * 1024 * 1024
MAX_FILE_BYTES: Final = 20 * 1024 * 1024
MAX_FILES: Final = 100
SYMLINK_MODE: Final = 0o120000
ALLOWED_ASSET_SUFFIXES: Final = {
    ".png",
    ".jpg",
    ".jpeg",
    ".webp",
    ".woff",
    ".woff2",
    ".ttf",
    ".otf",
}
_SHA256 = vol.Match(r"^[0-9a-f]{64}$")

FILE_SCHEMA = vol.Schema(
    {
        vol.Required("path"): vol.All(str, vol.Length(min=1, max=240)),
        vol.Required("sha256"): _SHA256,
        vol.Required("size"): vol.All(int, vol.Range(min=0, max=MAX_FILE_BYTES)),
    },
    extra=vol.PREVENT_EXTRA,
)

MANIFEST_SCHEMA = vol.Schema(
    {
        vol.Required("package_version"): vol.Equal(PACKAGE_VERSION),
        vol.Required("package_id"): vol.Match(r"^[a-z0-9][a-z0-9.-]{0,79}$"),
        vol.Required("name"): vol.All(str, vol.Length(min=1, max=60)),
        vol.Optional("author", default=""): vol.All(str, vol.Length(max=120)),
        vol.Required("application"): vol.Equal("movie-poster-ha"),
        vol.Required("profile_path"): vol.Equal("profile.json"),
        vol.Required("files"): vol.All([FILE_SCHEMA], vol.Length(max=MAX_FILES)),
    },
    extra=vol.PREVENT_EXTRA,
)


def build_package(
    package_id: str,
    profile: dict[str, Any],
    assets: dict[str, bytes] | None = None,
) -> bytes:
    """Build a deterministic validated .movieposter archive."""
    validated_profile = validate_profile_document(profile)
    files = {"profile.json": _json_bytes(validated_profile)}
    for path, content in (assets or {}).items():
        safe_path = _safe_asset_path(path)
        _validate_asset(safe_path, content)
        files[safe_path] = content
    if len(files) > MAX_FILES:
        message = f"Package contains more than {MAX_FILES} files"
        raise vol.Invalid(message)

    manifest = MANIFEST_SCHEMA(
        {
            "package_version": PACKAGE_VERSION,
            "package_id": package_id,
            "name": validated_profile["name"],
            "author": validated_profile.get("author", ""),
            "application": "movie-poster-ha",
            "profile_path": "profile.json",
            "files": [
                {
                    "path": path,
                    "sha256": _digest(content),
                    "size": len(content),
                }
                for path, content in sorted(files.items())
            ],
        }
    )
    archive = io.BytesIO()
    with zipfile.ZipFile(
        archive,
        "w",
        compression=zipfile.ZIP_DEFLATED,
        compresslevel=9,
    ) as package:
        package.writestr("manifest.json", _json_bytes(manifest))
        for path, content in sorted(files.items()):
            package.writestr(path, content)
    payload = archive.getvalue()
    if len(payload) > MAX_PACKAGE_BYTES:
        message = f"Package exceeds {MAX_PACKAGE_BYTES} bytes"
        raise vol.Invalid(message)
    return payload


def read_package(payload: bytes) -> dict[str, Any]:  # noqa: C901
    """Read and fully validate an untrusted .movieposter archive."""
    if len(payload) > MAX_PACKAGE_BYTES:
        message = f"Package exceeds {MAX_PACKAGE_BYTES} bytes"
        raise vol.Invalid(message)
    try:
        package = zipfile.ZipFile(io.BytesIO(payload))
    except zipfile.BadZipFile as err:
        message = "Package is not a valid ZIP archive"
        raise vol.Invalid(message) from err

    with package:
        members = package.infolist()
        if len(members) > MAX_FILES + 1:
            message = f"Package contains more than {MAX_FILES + 1} files"
            raise vol.Invalid(message)
        names = [_safe_member_name(member) for member in members]
        if len(names) != len(set(names)):
            message = "Package contains duplicate file paths"
            raise vol.Invalid(message)
        if "manifest.json" not in names:
            message = "Package does not contain manifest.json"
            raise vol.Invalid(message)
        manifest = MANIFEST_SCHEMA(
            _read_json(package, "manifest.json", MAX_FILE_BYTES)
        )
        expected = {item["path"]: item for item in manifest["files"]}
        actual = set(names) - {"manifest.json"}
        if set(expected) != actual:
            message = "Package files do not match the manifest"
            raise vol.Invalid(message)

        contents: dict[str, bytes] = {}
        for path, metadata in expected.items():
            content = _read_member(package, path, MAX_FILE_BYTES)
            if len(content) != metadata["size"]:
                message = f"Package file size mismatch: {path}"
                raise vol.Invalid(message)
            if _digest(content) != metadata["sha256"]:
                message = f"Package file hash mismatch: {path}"
                raise vol.Invalid(message)
            if path.startswith("assets/"):
                _validate_asset(path, content)
            contents[path] = content

        profile = validate_profile_document(
            _decode_json(contents[manifest["profile_path"]], "profile.json")
        )
        return {
            "manifest": manifest,
            "profile": profile,
            "assets": {
                path: content
                for path, content in contents.items()
                if path.startswith("assets/")
            },
        }


def _safe_member_name(member: zipfile.ZipInfo) -> str:
    """Validate one archive member and return its normalized path."""
    if member.is_dir():
        message = "Package directories must be implicit"
        raise vol.Invalid(message)
    if member.file_size > MAX_FILE_BYTES:
        message = f"Package member is too large: {member.filename}"
        raise vol.Invalid(message)
    mode = member.external_attr >> 16
    if mode & 0o170000 == SYMLINK_MODE:
        message = "Package cannot contain symbolic links"
        raise vol.Invalid(message)
    return _safe_path(member.filename)


def _safe_asset_path(path: str) -> str:
    """Validate a packaged asset path."""
    safe = _safe_path(path)
    if not safe.startswith("assets/"):
        message = "Assets must be stored below assets/"
        raise vol.Invalid(message)
    if PurePosixPath(safe).suffix.casefold() not in ALLOWED_ASSET_SUFFIXES:
        message = f"Unsupported asset type: {safe}"
        raise vol.Invalid(message)
    return safe


def _safe_path(path: str) -> str:
    """Reject absolute, platform-specific, and traversal paths."""
    if "\\" in path:
        message = "Package paths must use forward slashes"
        raise vol.Invalid(message)
    candidate = PurePosixPath(path)
    if (
        not path
        or candidate.is_absolute()
        or ".." in candidate.parts
        or "." in candidate.parts
    ):
        message = f"Unsafe package path: {path}"
        raise vol.Invalid(message)
    normalized = candidate.as_posix()
    if normalized != path:
        message = f"Non-canonical package path: {path}"
        raise vol.Invalid(message)
    return normalized


def _validate_asset(path: str, content: bytes) -> None:
    """Validate type, size, and basic signature of one asset."""
    safe = _safe_asset_path(path)
    if len(content) > MAX_FILE_BYTES:
        message = f"Asset is too large: {safe}"
        raise vol.Invalid(message)
    suffix = PurePosixPath(safe).suffix.casefold()
    signatures = {
        ".png": (b"\x89PNG\r\n\x1a\n",),
        ".jpg": (b"\xff\xd8\xff",),
        ".jpeg": (b"\xff\xd8\xff",),
        ".webp": (b"RIFF",),
        ".woff": (b"wOFF",),
        ".woff2": (b"wOF2",),
        ".ttf": (b"\x00\x01\x00\x00", b"true"),
        ".otf": (b"OTTO",),
    }
    if not any(content.startswith(signature) for signature in signatures[suffix]):
        message = f"Asset signature does not match its extension: {safe}"
        raise vol.Invalid(message)
    if suffix == ".webp" and content[8:12] != b"WEBP":
        message = f"Asset signature does not match its extension: {safe}"
        raise vol.Invalid(message)


def _read_json(
    package: zipfile.ZipFile,
    path: str,
    limit: int,
) -> dict[str, Any]:
    """Read a JSON archive member."""
    return _decode_json(_read_member(package, path, limit), path)


def _decode_json(content: bytes, path: str) -> dict[str, Any]:
    """Decode a UTF-8 JSON object."""
    try:
        value = json.loads(content.decode("utf-8"))
    except (UnicodeDecodeError, json.JSONDecodeError) as err:
        message = f"Invalid JSON document: {path}"
        raise vol.Invalid(message) from err
    if not isinstance(value, dict):
        message = f"JSON document must be an object: {path}"
        raise vol.Invalid(message)
    return value


def _read_member(package: zipfile.ZipFile, path: str, limit: int) -> bytes:
    """Read a bounded archive member without trusting compressed size."""
    with package.open(path) as member:
        content = member.read(limit + 1)
    if len(content) > limit:
        message = f"Package member is too large: {path}"
        raise vol.Invalid(message)
    return content


def _json_bytes(value: dict[str, Any]) -> bytes:
    """Serialize deterministic UTF-8 JSON."""
    return json.dumps(
        value,
        ensure_ascii=False,
        sort_keys=True,
        separators=(",", ":"),
    ).encode()


def _digest(content: bytes) -> str:
    """Return a SHA-256 content digest."""
    return hashlib.sha256(content).hexdigest()
