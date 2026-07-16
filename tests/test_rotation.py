"""Tests for Coming Soon rotation policies."""

import random

from custom_components.movie_poster.rotation import ShuffleBag


def test_shuffle_bag_uses_every_item_before_repeating() -> None:
    """A complete cycle contains each eligible movie exactly once."""
    bag = ShuffleBag[str](random.Random(7))
    bag.replace(["a", "b", "c", "d"])
    cycle = [bag.next() for _ in range(4)]
    assert set(cycle) == {"a", "b", "c", "d"}


def test_shuffle_bag_avoids_cycle_boundary_repeat() -> None:
    """The last item of one cycle is not first in the next cycle."""
    bag = ShuffleBag[str](random.Random(2))
    bag.replace(["a", "b", "c"])
    first_cycle = [bag.next() for _ in range(3)]
    assert bag.next() != first_cycle[-1]


def test_shuffle_bag_handles_empty_pool() -> None:
    """An empty library has no rotation candidate."""
    assert ShuffleBag[str]().next() is None
