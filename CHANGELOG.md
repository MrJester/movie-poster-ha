# Changelog

## 0.1.0-beta.44

- Introduce schema-versioned Frame, Theme, Layout, component, animation, and
  Profile resources with normalized geometry, universal semantic styles, and
  automatic migration from legacy flat Profiles.
- Add an immutable built-in presentation catalog plus a responsive reference
  renderer for Marquee, Classic, and Cinematic.
- Add a local Presentation Library with autosaved drafts, immutable published
  revisions, rollback, deletion, and migration of existing custom Profiles.
- Add secure `.movieposter` import and export with packaged assets, hashes,
  traversal and symlink protection, bounded archive extraction, signature
  checks, and fail-closed validation.
- Add the first visual-editor canvas with blank or preset starting points,
  dynamic components, drag and resize, exact normalized geometry, layers,
  visibility, per-orientation geometry overrides, colors, opacity, type size,
  alignment, glow, preview states, autosave, and explicit publishing.
- Use a presentation-specific frontend module cache key so Home Assistant
  cannot reuse the pre-editor panel module after upgrading to beta.44.

## 0.1.0-beta.43

- Capitalize every Display Studio theme label.
- Recolor Cyber Noir's powered rails, fixture glow, glass accents, typography,
  poster border, plaque, metadata, and progress treatment with the selected
  Classic, Art Deco, Neon, Minimal, or OLED palette while preserving the
  rendered metal enclosure.

## 0.1.0-beta.42

- Refine Cyber Noir with a quieter inner chase rail, sharper cyan fixture cores,
  localized metal reflections, and staggered top, side, and bottom pulses.
- Remove the redundant empty details panel from compact portrait presentations
  when no summary is displayed.

## 0.1.0-beta.41

- Narrow and center the portrait Cyber Noir chase rail so both glowing side
  edges remain inside the transparent frame opening.

## 0.1.0-beta.40

- Move the portrait Cyber Noir chase rail's left edge inside the transparent
  opening so its cyan bloom no longer spills across the beveled metal.

## 0.1.0-beta.39

- Pulse a dedicated cyan light layer aligned to Cyber Noir's rendered fixtures,
  creating a pronounced dim-to-bright bloom instead of relying only on the
  subtle inner chase rail.
- Keep animated rendering out of exhaustive containment loops and verify motion
  once in a focused browser assertion.

## 0.1.0-beta.38

- Separate Cyber Noir's cyan rail movement from a stronger breathing pulse,
  expanding the bloom and brightness rhythm without speeding up the chase.

## 0.1.0-beta.37

- Add a restrained cyan chase and bloom around Cyber Noir's powered inner rail,
  with portrait alignment and a static low-glow state when motion is disabled.

## 0.1.0-beta.36

- Prioritize readable Cyber Noir poster artwork in short desktop frames by
  removing the redundant details block from Poster layout and compacting
  secondary metadata in portrait Cinematic layout.

## 0.1.0-beta.35

- Fit Cyber Noir's live content against an explicit inner stage aligned with
  the rendered bezel opening, preventing poster details from extending behind
  or outside the frame in portrait and compact layouts.

## 0.1.0-beta.34

- Replace Cyber Noir's CSS-only outer enclosure with dedicated transparent,
  high-detail gunmetal assets matched to the renderer's portrait and landscape
  aspect ratios.
- Keep headings, posters, metadata, progress, and lighting live and responsive
  beneath the rendered material overlay.

## 0.1.0-beta.33

- Rebuild Cyber Noir as a complete smoked-glass and gunmetal display enclosure
  with chamfered geometry, terminal typography, segmented cyan rails, restrained
  magenta signals, technical metadata, and no inherited gold theater styling.
- Present decorative frame names in title case throughout Display Studio.

## 0.1.0-beta.32

- Use the authenticated Plex account's registered player devices as the
  authoritative Preferred Player list when Preferred User is set to Any.
- Keep historical playback associations only for explicitly selected shared
  users, preventing shared history from expanding the owner's player list.

## 0.1.0-beta.31

- Derive owner and shared-user player choices only from server playback history
  and active sessions, excluding the broader Plex.tv account device list.

## 0.1.0-beta.30

- Group server-known Plex players by the users who played from them.
- Default Preferred Player choices to devices owned by the authenticated account.
- Filter Preferred Player immediately when Preferred User changes in Display Studio.
- Require both preferences to match when a user and player are selected together.

## 0.1.0-beta.20

- Add exhaustive browser coverage for 1,470 viewport, orientation, theme, frame, and layout combinations.
- Add compact phone typography and spacing so complete poster details remain inside 9:16 frames.
- Correct Studio Auto sizing on narrow portrait screens and add internal collision assertions.

## 0.1.0-beta.19

- Give Display Studio a dedicated preview canvas that excludes the settings panel width.
- Scale preview frames and typography to laptop-sized Studio canvases without changing live displays.
- Stack the preview and scrollable controls on narrow screens and test that laptop previews never overlap controls.

## 0.1.0-beta.18

- Increase Classic Marquee bulb size while retaining even perimeter spacing.
- Add a responsive chasing bulb rail between the marquee heading and poster content.
- Keep the added rail steady when motion is disabled and hide it for bulb-free Minimal/OLED themes.

## 0.1.0-beta.17

- Replace full-frame replay on poster rotation with a subtle preloaded content crossfade.
- Keep the frame, marquee, and bulb treatment visually stable between Coming Soon movies.
- Respect disabled motion and the browser's reduced-motion preference during rotations.

## 0.1.0-beta.16

- Honor the Show Summary setting in portrait and poster layouts with bounded responsive text.
- Add Plex content ratings to the metadata line beside year and runtime.
- Scale portrait summaries for large 4K displays while keeping all details inside the frame.

## 0.1.0-beta.15

- Match portrait frames to 9:16 displays so rotated TVs use 95% of both screen dimensions.
- Scale marquee typography, plaque text, metadata, padding, and gaps for 2160x3840 displays.
- Add the rotated 4K TV viewport to the real-browser frame containment suite.

## 0.1.0-beta.14

- Expand portrait and landscape frames from an 88% to a 95% viewport envelope.
- Remove the fixed portrait width cap so large portrait displays use the available screen.
- Broadcast Studio presentation changes before reloading the integration so open panels refresh automatically.
- Add real-browser containment tests for all seven frames at laptop, theater, and tall portrait viewports.
- Run responsive frontend regression tests as a dedicated GitHub Actions job.
- Replace the historical roadmap with the remaining 1.0 punch-down checklist.

## 0.1.0-beta.13

- Reserve the complete below-poster metadata area when fitting posters on tall portrait displays.
- Include the stacked layout gap so the poster, plaque, and details remain inside the frame.

## 0.1.0-beta.12

- Move Coming Soon source, playback scope, timing, and presentation controls into Display Studio.
- Reduce Home Assistant's standard options dialog to a direct Display Studio gateway.
- Add Plex player/user discovery with mutually exclusive player, user, or any-session selection.

## 0.1.0-beta.11

- Fit posters from their actual rendered top edge to the frame's measured bottom
  boundary so theme margins cannot push poster content outside the frame.

## 0.1.0-beta.10

- Measure each rendered frame and fit the poster to its actual remaining height
  after marquee, padding, plaque, and below-poster details are accounted for.

## 0.1.0-beta.9

- Scale poster height, frame padding, marquee, metadata, plaque, and summary
  together on short landscape screens while preserving the poster ratio.

## 0.1.0-beta.8

- Scale the complete presentation frame into an 88% viewport envelope while
  preserving 4:3 landscape and 2:3 portrait proportions.

## 0.1.0-beta.7

- Keep Art Deco headings such as Coming Soon on one line by widening the safe
  marquee area and using responsive period-appropriate type scaling.

## 0.1.0-beta.6

- Give Classic, Art Deco, Minimal, and OLED distinct backgrounds, typography,
  surfaces, borders, poster treatments, and metadata presentation.

## 0.1.0-beta.5

- Add one calculated bulb to each horizontal Marquee rail while preserving
  balanced corner clearance and the continuous clockwise chase.

## 0.1.0-beta.4

- Space Marquee bulbs evenly along the measured frame perimeter and animate one
  continuous clockwise theater-light chase across every side and orientation.

## 0.1.0-beta.3

- Replace gradient-based Marquee dots with individual dimensional bulb elements
  on four collision-free rails with sockets, highlights, and staggered glow.

## 0.1.0-beta.2

- Replace the Marquee frame's dotted border with layered theater bulbs, visible
  sockets, warm glass centers, and a soft glow pulse.

## 0.1.0-beta.1

- Cache normalized Plex movie metadata for immediate restart recovery.
- Hydrate large libraries in a tracked background task with progress telemetry.
- Preserve the last complete cache when Plex refreshes fail.
- Restore shuffle progress and avoid repeats across restarts.
- Add native Home Assistant sensors, buttons, and automation services.
- Add auto-hiding on-screen operational controls and local Exit Kiosk.
- Resubscribe wall displays after browser wake and network recovery.
- Use media-specific no-store artwork URLs to prevent stale posters.
- Present TV episodes as series title, season/episode number, and episode title.
- Expand responsive layouts, frames, themes, logos, and native HA kiosk mode.
