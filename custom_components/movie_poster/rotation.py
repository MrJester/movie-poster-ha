"""Coming Soon selection policies."""

from __future__ import annotations

import random
from dataclasses import dataclass, field
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from collections.abc import Iterable, Sequence


@dataclass(slots=True)
class ShuffleBag[T]:
    """Select every eligible item once before beginning a new random cycle."""

    random_source: random.Random = field(default_factory=random.Random)
    _source: tuple[T, ...] = field(default=(), init=False)
    _remaining: list[T] = field(default_factory=list, init=False)
    _last: T | None = field(default=None, init=False)

    def replace(self, items: Iterable[T]) -> None:
        """Replace eligible items, removing duplicates while preserving order."""
        source = tuple(dict.fromkeys(items))
        if source == self._source:
            return
        previous = set(self._source)
        self._source = source
        eligible = set(source)
        self._remaining = [item for item in self._remaining if item in eligible]
        self._remaining.extend(item for item in source if item not in previous)
        self.random_source.shuffle(self._remaining)
        if not self._remaining:
            self._refill()

    def next(self) -> T | None:
        """Return the next selection, or None when no items are eligible."""
        if not self._source:
            return None
        if not self._remaining:
            self._refill()
        selected = self._remaining.pop()
        self._last = selected
        return selected

    def snapshot(self) -> tuple[T, ...]:
        """Return remaining items for persistence and diagnostics."""
        return tuple(self._remaining)

    def reset(self, last: T | None = None) -> None:
        """Start a fresh randomized cycle while avoiding an immediate repeat."""
        self._remaining = []
        self._last = last if last in set(self._source) else None
        self._refill()

    @property
    def last(self) -> T | None:
        """Return the most recent selection for cycle-boundary protection."""
        return self._last

    def restore(self, remaining: Sequence[T], last: T | None = None) -> None:
        """Restore a prior cycle after filtering invalid entries."""
        eligible = set(self._source)
        self._remaining = [item for item in remaining if item in eligible]
        self._last = last if last in eligible else None

    def _refill(self) -> None:
        self._remaining = list(self._source)
        self.random_source.shuffle(self._remaining)
        if (
            len(self._remaining) > 1
            and self._last is not None
            and self._remaining[-1] == self._last
        ):
            self._remaining[0], self._remaining[-1] = (
                self._remaining[-1],
                self._remaining[0],
            )
