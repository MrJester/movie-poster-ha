# Changelog

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
