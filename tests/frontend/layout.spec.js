const { test, expect } = require("@playwright/test");

const FRAMES = [
  "marquee",
  "cyber_noir",
  "comic_hero",
  "theater_classic",
  "indie_nature",
  "golden_age",
  "steampunk",
];
const THEMES = ["classic", "art_deco", "neon", "minimal", "oled"];
const LAYOUTS = ["cinematic", "poster", "split"];

const VIEWPORTS = [
  { name: "phone", width: 390, height: 844, orientation: "portrait" },
  { name: "tablet", width: 768, height: 1024, orientation: "portrait" },
  { name: "laptop", width: 1366, height: 768, orientation: "landscape" },
  { name: "theater", width: 1920, height: 1080, orientation: "landscape" },
  { name: "ultrawide", width: 2560, height: 1080, orientation: "landscape" },
  { name: "tall-portrait", width: 1080, height: 1920, orientation: "portrait" },
  { name: "rotated-4k-tv", width: 2160, height: 3840, orientation: "portrait" },
];

async function renderPoster(page, frame, theme, layout, orientation) {
  return page.evaluate(async ({ frame, theme, layout, orientation }) => {
    document.querySelector("movie-poster-panel")?.remove();
    const poster = document.createElement("movie-poster-panel");
    document.body.append(poster);
    poster._state = {
      schema_version: 1,
      entry_id: "frontend-test",
      presentation_revision: 1,
      health: { connected: true, message: null },
      operations: { can_control: false },
      presentation: {
        theme,
        orientation,
        layout,
        frame_theme: frame,
        show_summary: true,
        show_progress: true,
        show_session: true,
        enable_motion: false,
        kiosk_mode: false,
        accent_color: "#f6cf70",
        background_color: "#090706",
        heading_font: "cinematic",
        body_font: "system",
        now_playing_text: "Now Playing",
        coming_soon_text: "Coming Soon",
        eyebrow_text: "Theater Presentation",
        logo_url: "",
        logo_position: "right",
      },
      mode: "coming_soon",
      heading: "Coming Soon",
      media: {
        key: "test-movie",
        type: "movie",
        title: "The Grand Premiere",
        subtitle: "Every night deserves a little magic",
        summary: "A long summary verifies that the complete metadata area remains inside the decorative frame at every supported viewport size.",
        year: 2026,
        content_rating: "PG-13",
        duration_ms: 7_200_000,
        position_ms: 1_800_000,
        poster_url: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='600' height='900'%3E%3Crect width='600' height='900' fill='%23321b16'/%3E%3C/svg%3E",
        backdrop_url: null,
      },
      session: { player: "Home Theater", user: "Movie Fan", state: "playing" },
    };
    poster._render();
    await new Promise((resolve) => requestAnimationFrame(() =>
      requestAnimationFrame(resolve)));

    const root = poster.shadowRoot;
    const element = (selector) => root.querySelector(selector);
    const visible = (value) => value && getComputedStyle(value).display !== "none";
    const frameElement = element(".marquee-frame");
    const frameBox = frameElement.getBoundingClientRect();
    const violations = [];
    const boxes = new Map();
    const contained = (selector, name) => {
      const value = element(selector);
      if (!visible(value)) return;
      const box = value.getBoundingClientRect();
      boxes.set(name, box);
      if (box.width < 1 || box.height < 1) violations.push(`${name} has no size`);
      if (box.left < frameBox.left - 1 || box.right > frameBox.right + 1
        || box.top < frameBox.top - 1 || box.bottom > frameBox.bottom + 1) {
        violations.push(`${name} falls outside frame`);
      }
    };
    if (frameBox.left < -1 || frameBox.top < -1
      || frameBox.right > innerWidth + 1 || frameBox.bottom > innerHeight + 1) {
      violations.push("frame falls outside viewport");
    }
    contained(".marquee", "marquee");
    contained(".poster", "poster");
    contained(".frame-plaque", "plaque");
    contained(".details", "details");
    contained(".marquee-divider-bulbs", "divider bulbs");
    const overlaps = (first, second) => {
      const a = boxes.get(first);
      const b = boxes.get(second);
      if (!a || !b) return false;
      return Math.min(a.right, b.right) - Math.max(a.left, b.left) > 1
        && Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top) > 1;
    };
    if (overlaps("marquee", "poster")) violations.push("marquee overlaps poster");
    if (overlaps("marquee", "details")) violations.push("marquee overlaps details");
    if (overlaps("poster", "details")) violations.push("poster overlaps details");
    if (overlaps("plaque", "details")) violations.push("plaque overlaps details");
    if (overlaps("divider bulbs", "poster")) violations.push("divider overlaps poster");
    const heading = element("h1");
    if (heading.scrollWidth > heading.clientWidth + 1
      || heading.scrollHeight > heading.clientHeight + 1) {
      violations.push("heading text overflows");
    }
    return violations;
  }, { frame, theme, layout, orientation });
}

for (const viewport of VIEWPORTS) {
  test(`all renderer combinations stay contained on ${viewport.name}`, async ({ page }) => {
    test.setTimeout(180_000);
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    await page.goto("/tests/frontend/harness.html");
    const failures = [];
    for (const orientation of [viewport.orientation, "auto"]) {
      for (const theme of THEMES) {
        for (const frame of FRAMES) {
          for (const layout of LAYOUTS) {
            const violations = await renderPoster(
              page, frame, theme, layout, orientation,
            );
            failures.push(...violations.map((violation) =>
              `${orientation}/${theme}/${frame}/${layout}: ${violation}`));
          }
        }
      }
    }
    expect(failures).toEqual([]);
  });
}

test("Display Studio orientations stay beside controls on a laptop", async ({ page }) => {
  await page.setViewportSize({ width: 1366, height: 768 });
  await page.goto("/tests/frontend/harness.html?studio=1");
  await page.evaluate(() => {
    document.body.append(document.createElement("movie-poster-panel"));
  });
  for (const orientation of ["auto", "landscape", "portrait"]) {
    const boxes = await page.evaluate(async (orientation) => {
      const panel = document.querySelector("movie-poster-panel");
      panel._state.presentation.orientation = orientation;
      panel._render();
      await new Promise((resolve) => requestAnimationFrame(resolve));
      const root = panel.shadowRoot;
      return {
        frame: root.querySelector(".marquee-frame").getBoundingClientRect().toJSON(),
        studio: root.querySelector(".studio").getBoundingClientRect().toJSON(),
      };
    }, orientation);
    expect(boxes.frame.right, orientation).toBeLessThanOrEqual(boxes.studio.left - 8);
    expect(boxes.frame.bottom, orientation).toBeLessThanOrEqual(769);
  }
});
