# ruff: noqa: INP001
"""Serve the renderer harness with Home Assistant's frontend asset route."""

from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer


class RendererHandler(SimpleHTTPRequestHandler):
    """Map the integration's runtime asset prefix into the source tree."""

    def translate_path(self, path: str) -> str:
        """Translate Home Assistant's registered static route for local tests."""
        prefix = "/movie_poster_static/"
        if path.startswith(prefix):
            path = (
                "/custom_components/movie_poster/frontend/"
                f"{path.removeprefix(prefix)}"
            )
        return super().translate_path(path)


if __name__ == "__main__":
    ThreadingHTTPServer(("127.0.0.1", 4173), RendererHandler).serve_forever()
