"""Config flow for Movie Poster."""

from __future__ import annotations

from typing import TYPE_CHECKING, Any

import voluptuous as vol
from homeassistant import config_entries
from homeassistant.const import CONF_HOST
from homeassistant.core import callback

from .const import (
    CONF_COLLECTION,
    CONF_ENABLE_MOTION,
    CONF_GRACE_SECONDS,
    CONF_LIBRARY,
    CONF_LIBRARY_REFRESH_SECONDS,
    CONF_PLAYER_ID,
    CONF_ROTATION_SECONDS,
    CONF_SERVER_URL,
    CONF_SHOW_PROGRESS,
    CONF_SHOW_SESSION,
    CONF_SHOW_SUMMARY,
    CONF_THEME,
    CONF_TOKEN,
    CONF_USER_ID,
    CONF_VERIFY_SSL,
    DEFAULT_ENABLE_MOTION,
    DEFAULT_GRACE_SECONDS,
    DEFAULT_LIBRARY_REFRESH_SECONDS,
    DEFAULT_ROTATION_SECONDS,
    DEFAULT_SHOW_PROGRESS,
    DEFAULT_SHOW_SESSION,
    DEFAULT_SHOW_SUMMARY,
    DEFAULT_THEME,
    DEFAULT_VERIFY_SSL,
    DOMAIN,
    THEMES,
)
from .exceptions import PlexAuthenticationError, PlexConnectionError
from .plex_auth import PlexAuthError, PlexAuthSession, PlexServerChoice

if TYPE_CHECKING:
    import asyncio

    from homeassistant.components.zeroconf import ZeroconfServiceInfo
    from homeassistant.config_entries import ConfigEntry
    from homeassistant.data_entry_flow import FlowResult


class MoviePosterConfigFlow(config_entries.ConfigFlow, domain=DOMAIN):
    """Configure a Plex server for Movie Poster."""

    VERSION = 1
    MINOR_VERSION = 1

    @staticmethod
    @callback
    def async_get_options_flow(
        _config_entry: config_entries.ConfigEntry,
    ) -> config_entries.OptionsFlow:
        """Return the options flow."""
        return MoviePosterOptionsFlow()

    def __init__(self) -> None:
        """Initialize transient flow state."""
        self._discovered_url: str | None = None
        self._auth: PlexAuthSession | None = None
        self._auth_task: asyncio.Task[str] | None = None
        self._auth_error: str | None = None
        self._reauth_entry: ConfigEntry | None = None
        self._token: str | None = None
        self._servers: dict[str, PlexServerChoice] = {}

    async def async_step_user(
        self, user_input: dict[str, Any] | None = None
    ) -> FlowResult:
        """Choose automatic Plex sign-in or a manual token."""
        if user_input is not None:
            return await self.async_step_plex_auth()
        return self.async_show_menu(
            step_id="user", menu_options=["plex_auth", "manual"]
        )

    async def async_step_plex_auth(  # noqa: PLR0911
        self, _user_input: dict[str, Any] | None = None
    ) -> FlowResult:
        """Authenticate through Plex's approval page."""
        if self._auth_task is None:
            self._auth = PlexAuthSession(self.hass)
            try:
                authorization_url = await self._auth.async_start()
            except Exception:  # noqa: BLE001 - external library boundary
                return self.async_abort(reason="cannot_connect")
            self._auth_task = self.hass.async_create_task(
                self._auth.async_wait_for_token(), "movie_poster_plex_auth"
            )
            return self._show_auth_progress(authorization_url)

        if not self._auth_task.done():
            return self._show_auth_progress(self._auth.authorization_url)

        try:
            self._token = self._auth_task.result()
            servers = await self._auth.async_servers(self._token)
        except PlexAuthError:
            self._auth_error = "auth_timeout"
            return self.async_show_progress_done(next_step_id="auth_result")
        except Exception:  # noqa: BLE001 - external library boundary
            self._auth_error = "cannot_connect"
            return self.async_show_progress_done(next_step_id="auth_result")
        self._servers = {server.machine_identifier: server for server in servers}
        if not self._servers:
            self._auth_error = "no_servers"
            return self.async_show_progress_done(next_step_id="auth_result")
        if self._reauth_entry is not None:
            if self._reauth_entry.unique_id not in self._servers:
                self._auth_error = "no_servers"
                return self.async_show_progress_done(next_step_id="auth_result")
            return self.async_show_progress_done(next_step_id="reauth_complete")
        return self.async_show_progress_done(next_step_id="select_server")

    async def async_step_auth_result(
        self, _user_input: dict[str, Any] | None = None
    ) -> FlowResult:
        """Report an error discovered after the Plex progress task completed."""
        return self.async_abort(reason=self._auth_error or "cannot_connect")

    async def async_step_reauth(
        self, _entry_data: dict[str, Any]
    ) -> FlowResult:
        """Start reauthentication for an existing Plex server."""
        self._reauth_entry = self._get_reauth_entry()
        return await self.async_step_reauth_confirm()

    async def async_step_reauth_confirm(
        self, user_input: dict[str, Any] | None = None
    ) -> FlowResult:
        """Confirm that the user wants to replace the expired Plex token."""
        if user_input is not None:
            return await self.async_step_plex_auth()
        return self.async_show_form(
            step_id="reauth_confirm", data_schema=vol.Schema({})
        )

    async def async_step_reauth_complete(
        self, _user_input: dict[str, Any] | None = None
    ) -> FlowResult:
        """Update and reload the existing entry after Plex approval."""
        if self._reauth_entry is None or self._token is None:
            return self.async_abort(reason="cannot_connect")
        server = self._servers[self._reauth_entry.unique_id]
        return self.async_update_reload_and_abort(
            self._reauth_entry,
            data_updates={
                CONF_SERVER_URL: server.url,
                CONF_TOKEN: self._token,
                CONF_VERIFY_SSL: server.url.startswith("https://"),
            },
        )

    def _show_auth_progress(self, authorization_url: str | None) -> FlowResult:
        """Show Plex authorization progress using the active task."""
        return self.async_show_progress(
            step_id="plex_auth",
            progress_action="authorize_plex",
            progress_task=self._auth_task,
            description_placeholders={"authorization_url": authorization_url or ""},
        )

    async def async_step_select_server(
        self, user_input: dict[str, Any] | None = None
    ) -> FlowResult:
        """Select one server available to the authenticated Plex account."""
        if user_input is not None:
            server = self._servers[user_input["server"]]
            await self.async_set_unique_id(server.machine_identifier)
            self._abort_if_unique_id_configured()
            return self.async_create_entry(
                title=server.name,
                data={
                    CONF_SERVER_URL: server.url,
                    CONF_TOKEN: self._token,
                    CONF_VERIFY_SSL: server.url.startswith("https://"),
                },
            )
        labels = {
            key: f"{server.name} ({'local' if server.local else 'remote'})"
            for key, server in self._servers.items()
        }
        return self.async_show_form(
            step_id="select_server",
            data_schema=vol.Schema({vol.Required("server"): vol.In(labels)}),
        )

    async def async_step_manual(
        self, user_input: dict[str, Any] | None = None
    ) -> FlowResult:
        """Configure Plex using an existing token."""
        errors: dict[str, str] = {}
        if user_input is not None:
            from .plex_client import (  # noqa: PLC0415
                MoviePosterPlexClient,
            )

            client = MoviePosterPlexClient(
                self.hass,
                user_input[CONF_SERVER_URL],
                user_input[CONF_TOKEN],
                verify_ssl=user_input[CONF_VERIFY_SSL],
            )
            try:
                server = await client.async_connect()
            except PlexAuthenticationError:
                errors["base"] = "invalid_auth"
            except PlexConnectionError:
                errors["base"] = "cannot_connect"
            else:
                await self.async_set_unique_id(server.machine_identifier)
                self._abort_if_unique_id_configured()
                return self.async_create_entry(title=server.name, data=user_input)

        schema = vol.Schema(
            {
                vol.Required(
                    CONF_SERVER_URL,
                    default=self._discovered_url or "http://localhost:32400",
                ): str,
                vol.Required(CONF_TOKEN): str,
                vol.Optional(CONF_VERIFY_SSL, default=DEFAULT_VERIFY_SSL): bool,
            }
        )
        return self.async_show_form(step_id="manual", data_schema=schema, errors=errors)

    async def async_step_zeroconf(
        self, discovery_info: ZeroconfServiceInfo
    ) -> FlowResult:
        """Handle local Plex Media Server discovery."""
        host = str(discovery_info.host)
        self._discovered_url = f"http://{host}:{discovery_info.port}"
        await self.async_set_unique_id(
            discovery_info.properties.get("machineIdentifier")
        )
        self._abort_if_unique_id_configured(updates={CONF_HOST: host})
        self.context["title_placeholders"] = {
            "name": discovery_info.name.removesuffix("._plexmediasvr._tcp.local.")
        }
        return await self.async_step_user()


class MoviePosterOptionsFlow(config_entries.OptionsFlow):
    """Configure Coming Soon source, playback scope, and timing."""

    async def async_step_init(
        self, user_input: dict[str, Any] | None = None
    ) -> FlowResult:
        """Discover Plex choices and save display behavior options."""
        from .plex_client import MoviePosterPlexClient  # noqa: PLC0415

        entry = self.config_entry
        client = MoviePosterPlexClient(
            self.hass,
            entry.data[CONF_SERVER_URL],
            entry.data[CONF_TOKEN],
            verify_ssl=entry.data[CONF_VERIFY_SSL],
        )
        try:
            libraries = await client.async_movie_libraries()
            sessions = [
                candidate for candidate, _media in await client.async_sessions()
            ]
        except Exception:  # noqa: BLE001 - external library boundary
            return self.async_abort(reason="cannot_connect")

        sources: dict[str, str] = {}
        for library in libraries:
            sources[f"{library.title}::"] = f"{library.title} — All movies"
            sources.update(
                {
                    f"{library.title}::{collection}": (
                        f"{library.title} — {collection}"
                    )
                    for collection in library.collections
                }
            )
        if not sources:
            return self.async_abort(reason="no_movie_libraries")

        players = {"": "Any active Plex player"}
        users = {"": "Any active Plex user"}
        players.update({session.player_id: session.player_name for session in sessions})
        users.update({session.user_id: session.user_name for session in sessions})
        current_source = (
            f"{entry.options.get(CONF_LIBRARY, '')}::"
            f"{entry.options.get(CONF_COLLECTION, '')}"
        )
        if current_source not in sources:
            current_source = next(iter(sources))

        if user_input is not None:
            library, collection = user_input.pop("source").split("::", 1)
            user_input[CONF_LIBRARY] = library
            user_input[CONF_COLLECTION] = collection or None
            return self.async_create_entry(title="", data=user_input)

        schema = vol.Schema(
            {
                vol.Required("source", default=current_source): vol.In(sources),
                vol.Optional(
                    CONF_PLAYER_ID, default=entry.options.get(CONF_PLAYER_ID, "")
                ): vol.In(players),
                vol.Optional(
                    CONF_USER_ID, default=entry.options.get(CONF_USER_ID, "")
                ): vol.In(users),
                vol.Required(
                    CONF_GRACE_SECONDS,
                    default=entry.options.get(
                        CONF_GRACE_SECONDS, DEFAULT_GRACE_SECONDS
                    ),
                ): vol.All(vol.Coerce(int), vol.Range(min=0, max=600)),
                vol.Required(
                    CONF_ROTATION_SECONDS,
                    default=entry.options.get(
                        CONF_ROTATION_SECONDS, DEFAULT_ROTATION_SECONDS
                    ),
                ): vol.All(vol.Coerce(int), vol.Range(min=2, max=3600)),
                vol.Required(
                    CONF_LIBRARY_REFRESH_SECONDS,
                    default=entry.options.get(
                        CONF_LIBRARY_REFRESH_SECONDS,
                        DEFAULT_LIBRARY_REFRESH_SECONDS,
                    ),
                ): vol.All(vol.Coerce(int), vol.Range(min=60, max=86400)),
                vol.Required(
                    CONF_THEME,
                    default=entry.options.get(CONF_THEME, DEFAULT_THEME),
                ): vol.In(THEMES),
                vol.Required(
                    CONF_SHOW_SUMMARY,
                    default=entry.options.get(
                        CONF_SHOW_SUMMARY, DEFAULT_SHOW_SUMMARY
                    ),
                ): bool,
                vol.Required(
                    CONF_SHOW_PROGRESS,
                    default=entry.options.get(
                        CONF_SHOW_PROGRESS, DEFAULT_SHOW_PROGRESS
                    ),
                ): bool,
                vol.Required(
                    CONF_SHOW_SESSION,
                    default=entry.options.get(
                        CONF_SHOW_SESSION, DEFAULT_SHOW_SESSION
                    ),
                ): bool,
                vol.Required(
                    CONF_ENABLE_MOTION,
                    default=entry.options.get(
                        CONF_ENABLE_MOTION, DEFAULT_ENABLE_MOTION
                    ),
                ): bool,
            }
        )
        return self.async_show_form(step_id="init", data_schema=schema)
