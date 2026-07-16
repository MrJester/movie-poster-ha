"""Pure display-mode transition logic."""

from __future__ import annotations

from dataclasses import dataclass
from enum import StrEnum

from .models import DisplayMode, PlaybackState


class TransitionReason(StrEnum):
    """Reason associated with the latest display transition."""

    GRACE_EXPIRED = "grace_expired"
    PLAYBACK_RESUMED = "playback_resumed"
    PLAYBACK_STARTED = "playback_started"
    PLAYBACK_STOPPED = "playback_stopped"
    STARTUP_IDLE = "startup_idle"


@dataclass(frozen=True, slots=True)
class ModeSnapshot:
    """Current state-machine snapshot."""

    mode: DisplayMode
    grace_deadline: float | None
    reason: TransitionReason


class DisplayModeMachine:
    """Choose Now Playing or Coming Soon with a configurable stop grace."""

    def __init__(self, grace_seconds: float) -> None:
        """Initialize in startup mode."""
        if grace_seconds < 0:
            msg = "grace_seconds must not be negative"
            raise ValueError(msg)
        self._grace_seconds = grace_seconds
        self._snapshot = ModeSnapshot(
            mode=DisplayMode.STARTING,
            grace_deadline=None,
            reason=TransitionReason.STARTUP_IDLE,
        )

    @property
    def snapshot(self) -> ModeSnapshot:
        """Return the immutable current snapshot."""
        return self._snapshot

    def update(
        self, playback: PlaybackState | None, *, monotonic_now: float
    ) -> ModeSnapshot:
        """Apply current playback state and time to the state machine."""
        active = playback in {
            PlaybackState.PLAYING,
            PlaybackState.PAUSED,
            PlaybackState.BUFFERING,
        }
        if active:
            reason = (
                TransitionReason.PLAYBACK_STARTED
                if self._snapshot.mode is not DisplayMode.NOW_PLAYING
                else TransitionReason.PLAYBACK_RESUMED
            )
            self._snapshot = ModeSnapshot(
                mode=DisplayMode.NOW_PLAYING,
                grace_deadline=None,
                reason=reason,
            )
            return self._snapshot

        if self._snapshot.mode is DisplayMode.STARTING:
            self._snapshot = ModeSnapshot(
                mode=DisplayMode.COMING_SOON,
                grace_deadline=None,
                reason=TransitionReason.STARTUP_IDLE,
            )
            return self._snapshot

        if self._snapshot.mode is DisplayMode.COMING_SOON:
            return self._snapshot

        deadline = self._snapshot.grace_deadline
        if deadline is None:
            deadline = monotonic_now + self._grace_seconds
            self._snapshot = ModeSnapshot(
                mode=DisplayMode.NOW_PLAYING,
                grace_deadline=deadline,
                reason=TransitionReason.PLAYBACK_STOPPED,
            )
        if monotonic_now >= deadline:
            self._snapshot = ModeSnapshot(
                mode=DisplayMode.COMING_SOON,
                grace_deadline=None,
                reason=TransitionReason.GRACE_EXPIRED,
            )
        return self._snapshot
