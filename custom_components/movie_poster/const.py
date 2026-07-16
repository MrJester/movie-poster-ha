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
CONF_ORIENTATION: Final = "orientation"
CONF_LAYOUT: Final = "layout"
CONF_FRAME_THEME: Final = "frame_theme"
CONF_ACCENT_COLOR: Final = "accent_color"
CONF_BACKGROUND_COLOR: Final = "background_color"
CONF_HEADING_FONT: Final = "heading_font"
CONF_BODY_FONT: Final = "body_font"
CONF_NOW_PLAYING_TEXT: Final = "now_playing_text"
CONF_COMING_SOON_TEXT: Final = "coming_soon_text"
CONF_EYEBROW_TEXT: Final = "eyebrow_text"
CONF_LOGO_URL: Final = "logo_url"
CONF_LOGO_POSITION: Final = "logo_position"

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

ORIENTATION_AUTO: Final = "auto"
ORIENTATION_LANDSCAPE: Final = "landscape"
ORIENTATION_PORTRAIT: Final = "portrait"
ORIENTATIONS: Final[tuple[str, ...]] = (
    ORIENTATION_AUTO,
    ORIENTATION_LANDSCAPE,
    ORIENTATION_PORTRAIT,
)

LAYOUT_CINEMATIC: Final = "cinematic"
LAYOUT_POSTER: Final = "poster"
LAYOUT_SPLIT: Final = "split"
LAYOUTS: Final[tuple[str, ...]] = (
    LAYOUT_CINEMATIC,
    LAYOUT_POSTER,
    LAYOUT_SPLIT,
)

FRAME_MARQUEE: Final = "marquee"
FRAME_CYBER_NOIR: Final = "cyber_noir"
FRAME_COMIC_HERO: Final = "comic_hero"
FRAME_THEATER_CLASSIC: Final = "theater_classic"
FRAME_INDIE_NATURE: Final = "indie_nature"
FRAME_GOLDEN_AGE: Final = "golden_age"
FRAME_STEAMPUNK: Final = "steampunk"
FRAME_THEMES: Final[tuple[str, ...]] = (
    FRAME_MARQUEE,
    FRAME_CYBER_NOIR,
    FRAME_COMIC_HERO,
    FRAME_THEATER_CLASSIC,
    FRAME_INDIE_NATURE,
    FRAME_GOLDEN_AGE,
    FRAME_STEAMPUNK,
)

FONT_SYSTEM: Final = "system"
FONT_CINEMATIC: Final = "cinematic"
FONT_SERIF: Final = "serif"
FONT_MODERN: Final = "modern"
FONT_CONDENSED: Final = "condensed"
FONTS: Final[tuple[str, ...]] = (
    FONT_SYSTEM,
    FONT_CINEMATIC,
    FONT_SERIF,
    FONT_MODERN,
    FONT_CONDENSED,
)

LOGO_LEFT: Final = "left"
LOGO_CENTER: Final = "center"
LOGO_RIGHT: Final = "right"
LOGO_POSITIONS: Final[tuple[str, ...]] = (
    LOGO_LEFT,
    LOGO_CENTER,
    LOGO_RIGHT,
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
DEFAULT_ORIENTATION: Final = ORIENTATION_AUTO
DEFAULT_LAYOUT: Final = LAYOUT_CINEMATIC
DEFAULT_FRAME_THEME: Final = FRAME_MARQUEE
DEFAULT_ACCENT_COLOR: Final = "#f6cf70"
DEFAULT_BACKGROUND_COLOR: Final = "#090706"
DEFAULT_HEADING_FONT: Final = FONT_CINEMATIC
DEFAULT_BODY_FONT: Final = FONT_SYSTEM
DEFAULT_NOW_PLAYING_TEXT: Final = "Now Playing"
DEFAULT_COMING_SOON_TEXT: Final = "Coming Soon"
DEFAULT_EYEBROW_TEXT: Final = "Theater Presentation"
DEFAULT_LOGO_URL: Final = ""
DEFAULT_LOGO_POSITION: Final = LOGO_RIGHT
PLATFORMS: Final[list[str]] = ["button", "sensor"]
