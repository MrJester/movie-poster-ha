# ADR 0001: Native Home Assistant integration with bundled frontend

Status: Accepted

Movie Poster will be distributed as one HACS integration. The compiled frontend
is shipped inside the custom integration and served by Home Assistant.

This avoids a separate add-on/container, keeps credentials server-side, provides
native config and options flows, and gives the frontend Home Assistant's existing
authenticated WebSocket connection.
