"""Resolve simultaneous Plex sessions using explicit user policy."""

from __future__ import annotations

from typing import TYPE_CHECKING

from .models import PlaybackPolicy, PlaybackState, SessionCandidate

if TYPE_CHECKING:
    from collections.abc import Iterable

_STATE_SCORE = {
    PlaybackState.PLAYING: 3,
    PlaybackState.BUFFERING: 2,
    PlaybackState.PAUSED: 1,
    PlaybackState.STOPPED: 0,
}


def select_session(
    sessions: Iterable[SessionCandidate], policy: PlaybackPolicy
) -> SessionCandidate | None:
    """Select a session deterministically, respecting ordered preferences."""
    candidates = [s for s in sessions if s.state is not PlaybackState.STOPPED]
    if not candidates:
        return None

    def preference(value: str, ordered: tuple[str, ...]) -> int:
        try:
            return len(ordered) - ordered.index(value)
        except ValueError:
            return 0

    eligible = [
        session
        for session in candidates
        if policy.allow_any
        or (
            (not policy.player_ids or session.player_id in policy.player_ids)
            and (not policy.user_ids or session.user_id in policy.user_ids)
        )
    ]
    if not eligible:
        return None

    return max(
        eligible,
        key=lambda session: (
            preference(session.player_id, policy.player_ids),
            preference(session.user_id, policy.user_ids),
            _STATE_SCORE[session.state],
            session.session_id,
        ),
    )
