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

const VIEWPORTS = [
  { name: "laptop", width: 1366, height: 768, orientation: "landscape" },
  { name: "theater", width: 1920, height: 1080, orientation: "landscape" },
  { name: "tall-portrait", width: 1080, height: 1920, orientation: "portrait" },
];

async function renderPoster(page, frame, orientation) {
  await page.goto("/tests/frontend/harness.html");
  await page.evaluate(({ frame, orientation }) => {
    const poster = document.createElement("movie-poster-panel");
    document.body.append(poster);
    poster._state = {
      schema_version: 1,
      entry_id: "frontend-test",
      presentation_revision: 1,
      health: { connected: true, message: null },
      operations: { can_control: false },
      presentation: {
        theme: "classic",
        orientation,
        layout: "cinematic",
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
        duration_ms: 7_200_000,
        position_ms: 1_800_000,
        poster_url: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='600' height='900'%3E%3Crect width='600' height='900' fill='%23321b16'/%3E%3C/svg%3E",
        backdrop_url: null,
      },
      session: { player: "Home Theater", user: "Movie Fan", state: "playing" },
    };
    poster._render();
  }, { frame, orientation });
  await page.waitForTimeout(100);
}

for (const viewport of VIEWPORTS) {
  for (const frame of FRAMES) {
    test(`${frame} stays contained on ${viewport.name}`, async ({ page }) => {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await renderPoster(page, frame, viewport.orientation);
      const boxes = await page.evaluate(() => {
        const root = document.querySelector("movie-poster-panel").shadowRoot;
        const box = (selector) => {
          const element = root.querySelector(selector);
          const style = element ? getComputedStyle(element) : null;
          return !element || style.display === "none"
            ? null : element.getBoundingClientRect().toJSON();
        };
        return {
          frame: box(".marquee-frame"),
          poster: box(".poster"),
          plaque: box(".frame-plaque"),
          details: box(".details"),
        };
      });

      expect(boxes.frame.top).toBeGreaterThanOrEqual(-1);
      expect(boxes.frame.bottom).toBeLessThanOrEqual(viewport.height + 1);
      expect(boxes.poster.top).toBeGreaterThanOrEqual(boxes.frame.top);
      expect(boxes.poster.bottom).toBeLessThanOrEqual(boxes.frame.bottom + 1);
      if (boxes.plaque) expect(boxes.plaque.bottom).toBeLessThanOrEqual(boxes.frame.bottom + 1);
      expect(boxes.details.bottom).toBeLessThanOrEqual(boxes.frame.bottom + 1);
    });
  }
}
