# Changelog

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
