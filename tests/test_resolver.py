"""Tests for deterministic session resolution."""

from custom_components.movie_poster.models import (
    PlaybackPolicy,
    PlaybackState,
    SessionCandidate,
)
from custom_components.movie_poster.resolver import select_session


def candidate(
    session_id: str,
    *,
    player: str,
    user: str,
    state: PlaybackState = PlaybackState.PLAYING,
) -> SessionCandidate:
    """Create a concise session fixture."""
    return SessionCandidate(
        session_id=session_id,
        player_id=player,
        player_name=player,
        user_id=user,
        user_name=user,
        state=state,
        media_type="movie",
    )


def test_no_sessions_returns_none() -> None:
    """An idle server has no selected session."""
    assert select_session([], PlaybackPolicy()) is None


def test_ordered_player_preference_wins() -> None:
    """The first configured player wins over arbitrary session order."""
    sessions = [
        candidate("1", player="bedroom", user="ryan"),
        candidate("2", player="theater", user="ryan"),
    ]
    selected = select_session(
        sessions,
        PlaybackPolicy(player_ids=("theater", "bedroom"), allow_any=False),
    )
    assert selected is not None
    assert selected.player_id == "theater"


def test_playing_wins_over_paused_when_unfiltered() -> None:
    """Active playback wins over a paused session."""
    sessions = [
        candidate(
            "1", player="theater", user="ryan", state=PlaybackState.PAUSED
        ),
        candidate("2", player="bedroom", user="ryan"),
    ]
    assert select_session(sessions, PlaybackPolicy()).session_id == "2"
