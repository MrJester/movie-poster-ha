"""Tests for Plex session normalization."""

from types import SimpleNamespace

from custom_components.movie_poster.models import PlaybackState
from custom_components.movie_poster.normalizer import normalize_movie, normalize_session


def test_episode_session_is_normalized_without_account_lookup() -> None:
    """Episode identity, player, user, and progress are retained."""
    expected_position = 900_000
    session = SimpleNamespace(
        sessionKey=7,
        ratingKey=42,
        type="episode",
        title="The Test",
        grandparentTitle="Example Show",
        parentIndex=2,
        index=4,
        summary="Summary",
        year=2026,
        contentRating="TV-14",
        duration=3_600_000,
        viewOffset=expected_position,
        grandparentThumb="/shows/example/poster",
        parentThumb="/shows/example/seasons/2/poster",
        thumb="/episodes/42/still",
        grandparentArt="/shows/example/art",
        art="/episodes/42/art",
        usernames=["Ryan"],
        player=SimpleNamespace(
            machineIdentifier="theater-id",
            title="Theater",
            state="playing",
        ),
    )
    candidate, media = normalize_session(session)
    assert candidate.state is PlaybackState.PLAYING
    assert candidate.player_id == "theater-id"
    assert candidate.user_id == "ryan"
    assert media.key == "42"
    assert media.title == "Example Show"
    assert media.subtitle == "S02E04 · The Test"
    assert media.content_rating == "TV-14"
    assert media.position_ms == expected_position
    assert media.poster_path == "/shows/example/poster"
    assert media.backdrop_path == "/shows/example/art"


def test_episode_artwork_falls_back_to_season_then_episode() -> None:
    """Episodes without show artwork still receive a poster and backdrop."""
    session = SimpleNamespace(
        sessionKey=8,
        ratingKey=43,
        type="episode",
        title="The Follow-up",
        grandparentThumb=None,
        parentThumb="/shows/example/seasons/2/poster",
        thumb="/episodes/43/still",
        grandparentArt=None,
        art="/episodes/43/art",
        usernames=["Ryan"],
        player=SimpleNamespace(state="playing"),
    )
    _candidate, media = normalize_session(session)
    assert media.poster_path == "/shows/example/seasons/2/poster"
    assert media.backdrop_path == "/episodes/43/art"


def test_unknown_state_is_safely_treated_as_stopped() -> None:
    """New Plex state strings do not accidentally activate Now Playing."""
    session = SimpleNamespace(
        sessionKey="session",
        type="clip",
        title="Trailer",
        usernames=[],
        player=SimpleNamespace(state="mystery"),
    )
    candidate, _media = normalize_session(session)
    assert candidate.state is PlaybackState.STOPPED


def test_movie_is_normalized_for_coming_soon() -> None:
    """Coming Soon retains display metadata and artwork paths."""
    movie = SimpleNamespace(
        ratingKey=99,
        title="Feature Film",
        tagline="The tagline",
        summary="The summary",
        year=2025,
        contentRating="PG-13",
        duration=7_200_000,
        thumb="/thumb/99",
        art="/art/99",
    )
    media = normalize_movie(movie)
    assert media.key == "99"
    assert media.title == "Feature Film"
    assert media.content_rating == "PG-13"
    assert media.poster_path == "/thumb/99"
