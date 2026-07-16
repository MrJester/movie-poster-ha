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
CONF_PLAYER_ID: Final = "player_id"
CONF_USER_ID: Final = "user_id"
CONF_THEME: Final = "theme"

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
DEFAULT_THEME: Final = THEME_CLASSIC
PLATFORMS: Final[list[str]] = []
