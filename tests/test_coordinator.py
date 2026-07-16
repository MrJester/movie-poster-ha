"""Tests for independently cached Coming Soon library data."""

from types import SimpleNamespace

from custom_components.movie_poster.coordinator import MoviePosterCoordinator
from custom_components.movie_poster.models import PlaybackPolicy, PlexMoviePage
from custom_components.movie_poster.rotation import ShuffleBag
from custom_components.movie_poster.state_machine import DisplayModeMachine

PERSIST_DELAY_SECONDS = 30
MOVIE_PAGE_SIZE = 100
PAGED_MOVIE_TOTAL = 101


class FakePlexClient:
    """Record movie-library requests."""

    def __init__(self) -> None:
        """Initialize the request counter."""
        self.calls = 0

    async def async_movies_page(
        self,
        library_title: str,
        collection_title: str | None,
        *,
        offset: int,
        size: int,
    ) -> PlexMoviePage:
        """Return one stable movie fixture."""
        assert library_title == "Movies"
        assert collection_title == "Coming Soon"
        self.calls += 1
        assert offset == 0
        assert size == MOVIE_PAGE_SIZE
        return PlexMoviePage(
            items=(
                SimpleNamespace(
                    ratingKey=1,
                    title="Example",
                    thumb="/thumb/1",
                    art="/art/1",
                ),
            ),
            complete=True,
        )

    async def async_sessions(self) -> list[SimpleNamespace]:
        """Return an idle Plex server."""
        return []


class FakeStore:
    """Accept delayed saves during isolated coordinator tests."""

    def async_delay_save(self, _data_func: object, *, delay: float) -> None:
        """Record no data in this unit test."""
        assert delay == PERSIST_DELAY_SECONDS


class PagedPlexClient:
    """Return a large library in deterministic bounded pages."""

    def __init__(self) -> None:
        """Record requested page offsets."""
        self.offsets: list[int] = []

    async def async_movies_page(
        self,
        _library_title: str,
        _collection_title: str | None,
        *,
        offset: int,
        size: int,
    ) -> PlexMoviePage:
        """Return at most one requested page."""
        self.offsets.append(offset)
        end = min(offset + size, PAGED_MOVIE_TOTAL)
        items = tuple(
            SimpleNamespace(ratingKey=index, title=f"Movie {index}")
            for index in range(offset, end)
        )
        return PlexMoviePage(items=items, complete=end == PAGED_MOVIE_TOTAL)


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
    coordinator._movie_refresh_buffer = {}
    coordinator._movie_refresh_offset = 0
    coordinator._movie_refresh_in_progress = False
    coordinator._bag = ShuffleBag[str]()

    await coordinator._async_refresh_movies(100.0)
    await coordinator._async_refresh_movies(101.0)

    assert client.calls == 1
    assert coordinator._library_refresh_due == expected_refresh_due
    assert coordinator._movies["1"].title == "Example"


async def test_first_refresh_defers_full_library_enumeration() -> None:
    """HA setup readiness does not wait for a potentially large Plex library."""
    client = FakePlexClient()
    coordinator = object.__new__(MoviePosterCoordinator)
    coordinator._client = client
    coordinator._policy = PlaybackPolicy()
    coordinator._mode = DisplayModeMachine(30)
    coordinator._library_title = "Movies"
    coordinator._collection_title = "Coming Soon"
    coordinator._library_refresh_due = 0.0
    coordinator._library_refresh_seconds = 900
    coordinator._rotation_seconds = 15
    coordinator._rotation_due = 0.0
    coordinator._movies = {}
    coordinator._movie_refresh_buffer = {}
    coordinator._movie_refresh_offset = 0
    coordinator._movie_refresh_in_progress = False
    coordinator._bag = ShuffleBag[str]()
    coordinator._coming_soon = None
    coordinator._defer_library_refresh = True
    coordinator._store = FakeStore()

    first = await coordinator._async_update_data()
    assert first.media is None
    assert client.calls == 0

    second = await coordinator._async_update_data()
    assert second.media is not None
    assert client.calls == 1


async def test_library_hydrates_in_pages_and_reconciles_removed_movies() -> None:
    """Each update fetches one page and only prunes stale items when complete."""
    client = PagedPlexClient()
    coordinator = object.__new__(MoviePosterCoordinator)
    coordinator._client = client
    coordinator._library_title = "Movies"
    coordinator._collection_title = None
    coordinator._library_refresh_due = 0.0
    coordinator._library_refresh_seconds = 900
    coordinator._movies = {
        "stale": SimpleNamespace(key="stale", title="Removed movie")
    }
    coordinator._movie_refresh_buffer = {}
    coordinator._movie_refresh_offset = 0
    coordinator._movie_refresh_in_progress = False
    coordinator._bag = ShuffleBag[str]()

    await coordinator._async_refresh_movies(100.0)

    assert client.offsets == [0]
    assert coordinator._movie_refresh_in_progress
    assert "stale" in coordinator._movies
    assert len(coordinator._movie_refresh_buffer) == MOVIE_PAGE_SIZE

    await coordinator._async_refresh_movies(105.0)

    assert client.offsets == [0, MOVIE_PAGE_SIZE]
    assert not coordinator._movie_refresh_in_progress
    assert "stale" not in coordinator._movies
    assert len(coordinator._movies) == PAGED_MOVIE_TOTAL
