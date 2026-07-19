# Beta testing

Movie Poster `0.1.0-beta.25` is intended for supervised testing on a production
Home Assistant instance before unattended wall-display rollout.

## Upgrade checklist

1. Update Movie Poster through HACS and restart Home Assistant.
2. Hard-refresh every browser displaying `/movie-poster`.
3. Confirm the Movie Poster device exposes mode, title, library, and shuffle
   sensors plus the three operational buttons.
4. Open the poster overlay by moving the mouse and confirm the loaded count,
   hydration progress, last refresh, and controls.
5. Confirm the sidebar and top bar disappear, then use **Exit kiosk** to restore
   navigation locally.

## Reliability scenarios

- Restart Home Assistant while Plex is reachable. A cached Coming Soon poster
  should appear before the background refresh completes.
- Temporarily stop or block Plex. The last complete Coming Soon library should
  remain usable and the connection warning should be visible.
- Restore Plex and press **Refresh library**. Progress should advance without
  interrupting playback polling.
- Put the wall browser to sleep and wake it. The display should resubscribe and
  show the current state without a manual reload.
- Let Coming Soon rotate long enough to confirm the remaining count decreases
  and no title repeats within the cycle.

## Automation smoke test

Call these actions from Developer Tools → Actions while Coming Soon is active:

- `movie_poster.next_poster`
- `movie_poster.refresh_library`
- `movie_poster.reset_shuffle`

The optional `entry_id` field selects a specific configuration if support for
multiple entries is added later.
