"""Constants for Movie Poster."""

from typing import Final

DOMAIN: Final = "movie_poster"
CONF_SERVER_URL: Final = "server_url"
CONF_TOKEN: Final = "token"  # noqa: S105 - configuration key, not a credential
CONF_VERIFY_SSL: Final = "verify_ssl"
CONF_GRACE_SECONDS: Final = "grace_seconds"
CONF_LIBRARY: Final = "library"
CONF_COLLECTION: Final = "collection"
CONF_ROTATION_SECONDS: Final = "rotation_seconds"
CONF_LIBRARY_REFRESH_SECONDS: Final = "library_refresh_seconds"
CONF_KIOSK_MODE: Final = "kiosk_mode"
CONF_PLAYER_ID: Final = "player_id"
CONF_USER_ID: Final = "user_id"
CONF_THEME: Final = "theme"
CONF_SHOW_SUMMARY: Final = "show_summary"
CONF_SHOW_PROGRESS: Final = "show_progress"
CONF_SHOW_SESSION: Final = "show_session"
CONF_ENABLE_MOTION: Final = "enable_motion"

THEME_CLASSIC: Final = "classic"
THEME_ART_DECO: Final = "art_deco"
THEME_NEON: Final = "neon"
THEME_MINIMAL: Final = "minimal"
THEME_OLED: Final = "oled"
THEMES: Final[tuple[str, ...]] = (
    THEME_CLASSIC,
    THEME_ART_DECO,
    THEME_NEON,
    THEME_MINIMAL,
    THEME_OLED,
)

DEFAULT_VERIFY_SSL: Final = True
DEFAULT_GRACE_SECONDS: Final = 30
DEFAULT_ROTATION_SECONDS: Final = 15
DEFAULT_LIBRARY_REFRESH_SECONDS: Final = 900
DEFAULT_KIOSK_MODE: Final = True
DEFAULT_THEME: Final = THEME_CLASSIC
DEFAULT_SHOW_SUMMARY: Final = True
DEFAULT_SHOW_PROGRESS: Final = True
DEFAULT_SHOW_SESSION: Final = True
DEFAULT_ENABLE_MOTION: Final = True
PLATFORMS: Final[list[str]] = []
