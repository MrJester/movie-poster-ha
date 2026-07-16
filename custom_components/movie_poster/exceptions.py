"""Domain exceptions for Movie Poster."""


class PlexAuthenticationError(Exception):
    """Raised when Plex rejects the configured token."""


class PlexConnectionError(Exception):
    """Raised when a Plex server cannot be reached or queried."""
