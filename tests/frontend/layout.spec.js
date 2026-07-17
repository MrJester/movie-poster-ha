let playwrightTest;
try {
  playwrightTest = require("@playwright/test");
} catch (_error) {
  playwrightTest = require("playwright/test");
}
const { test, expect } = playwrightTest;
const path = require("node:path");
const { pathToFileURL } = require("node:url");

const HARNESS_FILE = path.resolve(__dirname, "harness.html");

async function openHarness(page, query = "") {
  if (process.env.PLAYWRIGHT_FILE_MODE === "1") {
    await page.goto(`${pathToFileURL(HARNESS_FILE).href}${query}`);
    return;
  }
  await page.goto(`/tests/frontend/harness.html${query}`);
}

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
  { name: "small-phone", width: 320, height: 568, orientation: "portrait" },
  { name: "phone-compact", width: 360, height: 640, orientation: "portrait" },
  { name: "phone", width: 390, height: 844, orientation: "portrait" },
  { name: "phone-large", width: 430, height: 932, orientation: "portrait" },
  { name: "tablet", width: 768, height: 1024, orientation: "portrait" },
  { name: "tablet-large", width: 1024, height: 1366, orientation: "portrait" },
  { name: "hd-laptop", width: 1280, height: 720, orientation: "landscape" },
  { name: "laptop", width: 1366, height: 768, orientation: "landscape" },
  { name: "laptop-tall", width: 1440, height: 900, orientation: "landscape" },
  { name: "macbook", width: 2048, height: 1222, orientation: "landscape" },
  { name: "theater", width: 1920, height: 1080, orientation: "landscape" },
  { name: "ultrawide", width: 2560, height: 1080, orientation: "landscape" },
  { name: "ultrawide-4k", width: 3440, height: 1440, orientation: "landscape" },
  { name: "4k-tv", width: 3840, height: 2160, orientation: "landscape" },
  { name: "hd-portrait", width: 720, height: 1280, orientation: "portrait" },
  { name: "tall-portrait", width: 1080, height: 1920, orientation: "portrait" },
  { name: "digital-signage", width: 1200, height: 1920, orientation: "portrait" },
  { name: "rotated-4k-tv", width: 2160, height: 3840, orientation: "portrait" },
];

async function renderPoster(page, frame, theme, layout, orientation, variant = {}) {
  return page.evaluate(async ({ frame, theme, layout, orientation, variant }) => {
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
      heading: variant.heading || "Coming Soon",
      media: {
        key: "test-movie",
        type: "movie",
        title: variant.title || "Pirates of the Caribbean: Dead Man's Chest",
        subtitle: "Every night deserves a little magic",
        summary: variant.summary === undefined
          ? "A long summary verifies that the complete metadata area remains inside the decorative frame at every supported viewport size."
          : variant.summary,
        year: 2026,
        content_rating: "PG-13",
        duration_ms: 7_200_000,
        position_ms: 1_800_000,
        poster_url: variant.missingPoster ? null
          : "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='600' height='900'%3E%3Crect width='600' height='900' fill='%23321b16'/%3E%3C/svg%3E",
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
    if (frameElement.scrollWidth > frameElement.clientWidth + 1) {
      violations.push("frame content overflows horizontally");
    }
    if (frameElement.scrollHeight > frameElement.clientHeight + 1) {
      violations.push("frame content overflows vertically");
    }
    contained(".marquee", "marquee");
    contained(".poster", "poster");
    contained(".frame-plaque", "plaque");
    contained(".details", "details");
    contained(".marquee-divider-bulbs", "divider bulbs");
    contained("h1", "heading");
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
    if (heading.scrollWidth > heading.clientWidth + 1) {
      violations.push("heading text overflows horizontally");
    }
    const posterBox = element(".poster").getBoundingClientRect();
    if (innerWidth >= 720 && (posterBox.width < 100 || posterBox.height < 150)) {
      violations.push("poster becomes unreadably small");
    }
    return violations;
  }, { frame, theme, layout, orientation, variant });
}

for (const viewport of VIEWPORTS) {
  test(`all renderer combinations stay contained on ${viewport.name}`, async ({ page }) => {
    test.setTimeout(180_000);
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    await openHarness(page);
    const failures = [];
    for (const orientation of ["auto", "landscape", "portrait"]) {
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

for (const viewport of VIEWPORTS) {
  test(`Display Studio stays usable on ${viewport.name}`, async ({ page }) => {
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    await openHarness(page, "?studio=1");
    await page.evaluate(() => {
      const panel = document.createElement("movie-poster-panel");
      panel._settings = {
        source: "Movies::Coming Soon", player_id: "", user_id: "",
        grace_seconds: 30, rotation_seconds: 60, library_refresh_seconds: 900,
      };
      panel._choices = {
        sources: [{ value: "Movies::Coming Soon", label: "Movies — Coming Soon" }],
        players: [{ value: "", label: "Any active Plex player" }],
        users: [{ value: "", label: "Any active Plex user" }],
      };
      document.body.append(panel);
      panel._render();
    });
    for (const orientation of ["auto", "landscape", "portrait"]) {
      const result = await page.evaluate(async (orientation) => {
        const panel = document.querySelector("movie-poster-panel");
        panel._state.presentation.orientation = orientation;
        panel._renderIdentity = null;
        panel._render();
        await new Promise((resolve) => requestAnimationFrame(() =>
          requestAnimationFrame(resolve)));
        const root = panel.shadowRoot;
        const frame = root.querySelector(".marquee-frame");
        const studio = root.querySelector(".studio");
        const preview = root.querySelector(".studio-preview");
        const frameBox = frame.getBoundingClientRect();
        const studioBox = studio.getBoundingClientRect();
        const previewBox = preview.getBoundingClientRect();
        const failures = [];
        if (frameBox.left < -1 || frameBox.top < -1
          || frameBox.right > innerWidth + 1 || frameBox.bottom > innerHeight + 1) {
          failures.push("preview frame falls outside viewport");
        }
        if (studioBox.left < -1 || studioBox.top < -1
          || studioBox.right > innerWidth + 1 || studioBox.bottom > innerHeight + 1) {
          failures.push("Studio controls fall outside viewport");
        }
        if (studio.scrollWidth > studio.clientWidth + 1) {
          failures.push("Studio controls overflow horizontally");
        }
        if (innerWidth > 900) {
          if (frameBox.right > studioBox.left - 8) failures.push("preview overlaps controls");
        } else if (previewBox.bottom > studioBox.top + 1) {
          failures.push("stacked preview overlaps controls");
        }
        for (const control of studio.querySelectorAll("select, input, button")) {
          const box = control.getBoundingClientRect();
          if (box.left < studioBox.left - 1 || box.right > studioBox.right + 1) {
            failures.push("a Studio input overflows horizontally");
            break;
          }
        }
        studio.scrollTop = studio.scrollHeight;
        await new Promise((resolve) => requestAnimationFrame(resolve));
        const lastButton = studio.querySelector('[data-studio-action="save"]')
          .getBoundingClientRect();
        if (lastButton.bottom > studioBox.bottom + 1 || lastButton.top < studioBox.top - 1) {
          failures.push("Save action is not reachable by scrolling");
        }
        return failures;
      }, orientation);
      expect(result, orientation).toEqual([]);
    }
  });
}

for (const viewport of VIEWPORTS) {
  test(`content extremes stay usable on ${viewport.name}`, async ({ page }) => {
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    await openHarness(page);
    const variants = [
      {
        name: "custom heading and long episode title",
        value: {
          heading: "Tonight's Feature Presentation at Hays Manor Theater",
          title: "The One Where an Unexpectedly Long Television Episode Title Appears",
        },
      },
      {
        name: "missing artwork",
        value: { missingPoster: true, title: "No Artwork Available" },
      },
      {
        name: "sparse metadata",
        value: { title: "Up", summary: null },
      },
    ];
    const failures = [];
    for (const variant of variants) {
      for (const orientation of ["auto", "landscape", "portrait"]) {
        const violations = await renderPoster(
          page, "marquee", "classic", "cinematic", orientation, variant.value,
        );
        failures.push(...violations.map((violation) =>
          `${variant.name}/${orientation}: ${violation}`));
      }
    }
    expect(failures).toEqual([]);
  });
}

for (const viewport of VIEWPORTS) {
  test(`initialization and error states fit ${viewport.name}`, async ({ page }) => {
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    await openHarness(page);
    const failures = await page.evaluate(() => {
      const panel = document.createElement("movie-poster-panel");
      document.body.append(panel);
      const states = [
        () => { panel._state = null; panel._render(); },
        () => panel._renderError("Unable to connect to Movie Poster. Please retry."),
      ];
      const result = [];
      for (const render of states) {
        render();
        const empty = panel.shadowRoot.querySelector(".empty");
        const heading = panel.shadowRoot.querySelector("h1");
        const box = empty.getBoundingClientRect();
        if (box.left < -1 || box.top < -1
          || box.right > innerWidth + 1 || box.bottom > innerHeight + 1) {
          result.push("empty/error surface falls outside viewport");
        }
        if (heading.scrollWidth > heading.clientWidth + 1) {
          result.push("empty/error heading overflows");
        }
      }
      return result;
    });
    expect(failures).toEqual([]);
  });
}
