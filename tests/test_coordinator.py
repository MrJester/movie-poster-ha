"""Tests for independently cached Coming Soon library data."""

from types import SimpleNamespace

from custom_components.movie_poster.coordinator import MoviePosterCoordinator
from custom_components.movie_poster.rotation import ShuffleBag


class FakePlexClient:
    """Record movie-library requests."""

    def __init__(self) -> None:
        """Initialize the request counter."""
        self.calls = 0

    async def async_movies(
        self, library_title: str, collection_title: str | None
    ) -> list[SimpleNamespace]:
        """Return one stable movie fixture."""
        assert library_title == "Movies"
        assert collection_title == "Coming Soon"
        self.calls += 1
        return [
            SimpleNamespace(
                ratingKey=1,
                title="Example",
                thumb="/thumb/1",
                art="/art/1",
            )
        ]


async def test_library_refresh_uses_independent_cache_deadline() -> None:
    """Frequent playback polls do not repeatedly enumerate the movie library."""
    expected_refresh_due = 1000.0
    client = FakePlexClient()
    coordinator = object.__new__(MoviePosterCoordinator)
    coordinator._client = client
    coordinator._library_title = "Movies"
    coordinator._collection_title = "Coming Soon"
    coordinator._library_refresh_due = 0.0
    coordinator._library_refresh_seconds = 900
    coordinator._movies = {}
    coordinator._bag = ShuffleBag[str]()

    await coordinator._async_refresh_movies(100.0)
    await coordinator._async_refresh_movies(101.0)

    assert client.calls == 1
    assert coordinator._library_refresh_due == expected_refresh_due
    assert coordinator._movies["1"].title == "Example"
