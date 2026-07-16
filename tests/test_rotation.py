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


def test_growing_library_joins_current_cycle_without_repeats() -> None:
    """Incrementally hydrated pages become eligible without resetting selections."""
    bag = ShuffleBag[str](random.Random(4))
    bag.replace(["a", "b", "c"])
    selected = [bag.next()]
    bag.replace(["a", "b", "c", "d", "e", "f"])
    selected.extend(bag.next() for _ in range(5))
    assert set(selected) == {"a", "b", "c", "d", "e", "f"}
    assert len(selected) == len(set(selected))


def test_shuffle_bag_restores_cycle_without_repeating_last() -> None:
    """A restored empty cycle remembers its boundary selection."""
    bag = ShuffleBag[str](random.Random(2))
    bag.replace(["a", "b", "c"])
    last = [bag.next() for _ in range(3)][-1]

    restored = ShuffleBag[str](random.Random(2))
    restored.replace(["a", "b", "c"])
    restored.restore([], last)

    assert restored.last == last
    assert restored.next() != last


def test_shuffle_bag_reset_avoids_current_poster() -> None:
    """A manual reset starts a new cycle without immediately showing the same item."""
    bag = ShuffleBag[str](random.Random(8))
    bag.replace(["a", "b", "c"])
    current = bag.next()
    bag.reset(current)
    assert bag.next() != current
