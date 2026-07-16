"""Tests for Now Playing and Coming Soon transitions."""

from custom_components.movie_poster.models import DisplayMode, PlaybackState
from custom_components.movie_poster.state_machine import DisplayModeMachine


def test_idle_start_enters_coming_soon_immediately() -> None:
    """Startup does not use the post-playback grace period."""
    machine = DisplayModeMachine(grace_seconds=30)
    assert machine.update(None, monotonic_now=10).mode is DisplayMode.COMING_SOON


def test_stopped_playback_waits_for_grace_period() -> None:
    """A stopped session retains Now Playing until its grace expires."""
    machine = DisplayModeMachine(grace_seconds=30)
    machine.update(PlaybackState.PLAYING, monotonic_now=10)
    assert machine.update(None, monotonic_now=20).mode is DisplayMode.NOW_PLAYING
    assert machine.update(None, monotonic_now=49).mode is DisplayMode.NOW_PLAYING
    assert machine.update(None, monotonic_now=50).mode is DisplayMode.COMING_SOON


def test_playback_during_grace_cancels_transition() -> None:
    """Episode changes do not briefly expose Coming Soon."""
    machine = DisplayModeMachine(grace_seconds=30)
    machine.update(PlaybackState.PLAYING, monotonic_now=10)
    machine.update(None, monotonic_now=20)
    resumed = machine.update(PlaybackState.BUFFERING, monotonic_now=25)
    assert resumed.mode is DisplayMode.NOW_PLAYING
    assert resumed.grace_deadline is None


def test_paused_media_remains_now_playing() -> None:
    """Pausing is not treated as stopping."""
    machine = DisplayModeMachine(grace_seconds=0)
    assert (
        machine.update(PlaybackState.PAUSED, monotonic_now=10).mode
        is DisplayMode.NOW_PLAYING
    )
