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
const FRAME_MOTIONS = {
  marquee: ["marquee_chase", 18, ".marquee-bulbs i", "marquee-bulbs"],
  cyber_noir: ["cyber_scan", 8, ".cyber-powered-node", "cyber-motion"],
  comic_hero: ["comic_energy", 6, ".comic-panel-pulse", "comic-motion"],
  theater_classic: ["theater_sconce", 4, ".theater-sconce", "theater-motion"],
  indie_nature: ["nature_dapple", 5, ".leaf-shadow", "nature-motion"],
  golden_age: ["golden_footlights", 12, ".golden-footlight", "golden-motion"],
  steampunk: ["steampunk_mechanical", 6, ".steam-gear", "steampunk-motion"],
};

const VIEWPORTS = [
  { name: "small-phone", width: 320, height: 568, orientation: "portrait" },
  { name: "phone-compact", width: 360, height: 640, orientation: "portrait" },
  { name: "phone", width: 390, height: 844, orientation: "portrait" },
  { name: "phone-large", width: 430, height: 932, orientation: "portrait" },
  { name: "tablet", width: 768, height: 1024, orientation: "portrait" },
  { name: "ipad-mini", width: 744, height: 1133, orientation: "portrait" },
  { name: "tablet-large", width: 1024, height: 1366, orientation: "portrait" },
  { name: "ipad-landscape", width: 1024, height: 768, orientation: "landscape" },
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

test("versioned Home Assistant element cannot be claimed by an older module", async ({ page }) => {
  await openHarness(page);
  const result = await page.evaluate(() => {
    const current = document.createElement("movie-poster-panel-v22");
    document.body.append(current);
    return {
      registered: current.localName,
      hasCurrentEditor: typeof current._closeEditor === "function",
      stableAlias: Boolean(customElements.get("movie-poster-panel")),
    };
  });
  expect(result).toEqual({
    registered: "movie-poster-panel-v22",
    hasCurrentEditor: true,
    stableAlias: true,
  });
});

async function rendererGeometry(page) {
  return page.evaluate(() => {
    const root = document.querySelector("movie-poster-panel").shadowRoot;
    const box = (selector) => {
      const rect = root.querySelector(selector).getBoundingClientRect();
      return [rect.x, rect.y, rect.width, rect.height].map((value) =>
        Math.round(value * 10) / 10);
    };
    return {
      frame: box(".marquee-frame"),
      marquee: box(".marquee"),
      content: box(".content"),
      poster: box(".poster"),
      plaque: box(".frame-plaque"),
      details: box(".details"),
    };
  });
}

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
        show_title: variant.showTitle ?? true,
        show_subtitle: variant.showSubtitle ?? true,
        show_year: variant.showYear ?? true,
        show_rating: variant.showRating ?? true,
        show_runtime: variant.showRuntime ?? true,
        show_summary: variant.showSummary ?? true,
        show_progress: variant.showProgress ?? true,
        show_session: true,
        enable_motion: variant.enableMotion ?? false,
        kiosk_mode: false,
        accent_color: "#f6cf70",
        background_color: "#090706",
        heading_font: "cinematic",
        body_font: "system",
        now_playing_text: "Now Playing",
        coming_soon_text: "Coming Soon",
        eyebrow_text: "Theater Presentation",
        logo_url: variant.logoPosition
          ? "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='80'%3E%3Crect width='200' height='80' fill='%23f6cf70'/%3E%3C/svg%3E"
          : "",
        logo_position: variant.logoPosition || "right",
      },
      design: variant.design,
      design_frame: variant.safeOpening || variant.layoutTuning
        || variant.frameLayers || variant.frameMotion ? {
        id: `builtin.frame.${frame}`,
        version: 1,
        safe_opening: variant.safeOpening,
        layout_tuning: variant.layoutTuning,
        layers: variant.frameLayers,
        motion: variant.frameMotion,
      } : undefined,
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
    await document.fonts?.ready;
    const posterImage = poster.shadowRoot.querySelector(".poster");
    if (posterImage && !posterImage.complete) {
      await Promise.race([
        posterImage.decode?.().catch(() => {}),
        new Promise((resolve) => setTimeout(resolve, 1_000)),
      ]);
    }
    // Frame artwork is absolutely positioned and cannot affect geometry.
    // Waiting for every high-resolution asset to decode made CI roughly five
    // times slower and still raced the final responsive layout. Instead wait
    // until the measured layout itself is stable for two animation frames.
    let priorGeometry = "";
    let stableFrames = 0;
    for (let attempt = 0; attempt < 20 && stableFrames < 2; attempt += 1) {
      await new Promise((resolve) => requestAnimationFrame(resolve));
      const renderedFrame = poster.shadowRoot.querySelector(".marquee-frame");
      if (renderedFrame) poster._layoutMarqueeBulbs(renderedFrame);
      const geometry = [
        ".marquee-frame", ".frame-stage", ".details", ".meta",
      ].map((selector) => {
        const box = poster.shadowRoot.querySelector(selector)
          ?.getBoundingClientRect();
        return box
          ? [box.x, box.y, box.width, box.height]
            .map((value) => Math.round(value * 10) / 10).join(",")
          : "missing";
      }).join("|");
      stableFrames = geometry === priorGeometry ? stableFrames + 1 : 0;
      priorGeometry = geometry;
    }

    const root = poster.shadowRoot;
    const element = (selector) => root.querySelector(selector);
    const visible = (value) => value && getComputedStyle(value).display !== "none";
    const frameElement = element(".marquee-frame");
    const frameBox = frameElement.getBoundingClientRect();
    const stageElement = element(".frame-stage");
    const stageBox = stageElement.getBoundingClientRect();
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
    contained("h1", "heading");
    contained(".brand-logo", "logo");
    contained(".brand-eyebrow", "brand label");
    const containedInStage = (selector, name) => {
      const value = element(selector);
      if (!visible(value) || stageBox.width < 1 || stageBox.height < 1) return;
      const box = value.getBoundingClientRect();
      if (box.left < stageBox.left - 1 || box.right > stageBox.right + 1
        || box.top < stageBox.top - 1 || box.bottom > stageBox.bottom + 1) {
        violations.push(`${name} falls outside frame safe area `
          + `(l:${Math.round(box.left - stageBox.left)},`
          + `t:${Math.round(box.top - stageBox.top)},`
          + `r:${Math.round(stageBox.right - box.right)},`
          + `b:${Math.round(stageBox.bottom - box.bottom)})`);
      }
    };
    containedInStage(".marquee", "marquee");
    containedInStage(".poster", "poster");
    containedInStage(".frame-plaque", "plaque");
    containedInStage(".details", "details");
    const overlaps = (first, second) => {
      const a = boxes.get(first);
      const b = boxes.get(second);
      if (!a || !b) return false;
      return Math.min(a.right, b.right) - Math.max(a.left, b.left) > 1
        && Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top) > 1;
    };
    if (overlaps("marquee", "poster")) violations.push("marquee overlaps poster");
    if (overlaps("marquee", "details")) violations.push("marquee overlaps details");
    if (overlaps("poster", "details")) {
      const posterBounds = boxes.get("poster");
      const detailsBounds = boxes.get("details");
      violations.push(`poster overlaps details `
        + `(poster-bottom:${Math.round(posterBounds.bottom)},`
        + ` details-top:${Math.round(detailsBounds.top)})`);
    }
    if (overlaps("plaque", "details")) violations.push("plaque overlaps details");
    if (overlaps("divider bulbs", "poster")) violations.push("divider overlaps poster");
    if (overlaps("logo", "heading")) violations.push("logo overlaps heading");
    if (overlaps("logo", "brand label")) violations.push("logo overlaps brand label");
    if (overlaps("brand label", "heading")) violations.push("brand label overlaps heading");
    const heading = element("h1");
    if (heading.scrollWidth > heading.clientWidth + 1) {
      violations.push("heading text overflows horizontally");
    }
    const posterBox = element(".poster").getBoundingClientRect();
    const missingPoster = element(".poster").classList.contains("poster-missing");
    if (!missingPoster && innerWidth >= 720
      && (posterBox.width < 100 || posterBox.height < 150)) {
      violations.push(`poster becomes unreadably small `
        + `(${Math.round(posterBox.width)}x${Math.round(posterBox.height)})`);
    }
    if (missingPoster && (posterBox.width < 48 || posterBox.height < 36)) {
      violations.push("missing-artwork placeholder becomes unreadably small");
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
    // Pairwise coverage keeps this visual matrix practical with photographic
    // assets. The dedicated Theme test below proves palette changes preserve
    // geometry, so repeating every Theme × Frame × Layout cross-product adds
    // decode cost without exercising another layout contract.
    const combinations = [
      ...FRAMES.flatMap((frame) => LAYOUTS.map((layout) =>
        ({ frame, theme: "classic", layout }))),
      ...THEMES.filter((theme) => theme !== "classic").map((theme) =>
        ({ frame: "marquee", theme, layout: "cinematic" })),
    ];
    for (const orientation of ["auto", "landscape", "portrait"]) {
      for (const { frame, theme, layout } of combinations) {
        const violations = await renderPoster(
          page, frame, theme, layout, orientation,
        );
        failures.push(...violations.map((violation) =>
          `${orientation}/${theme}/${frame}/${layout}: ${violation}`));
      }
    }
    expect(failures).toEqual([]);
  });
}

test("themes preserve frame and layout structure while restyling", async ({ page }) => {
  await page.setViewportSize({ width: 1366, height: 768 });
  await openHarness(page);
  const geometries = [];
  const palettes = [];
  for (const theme of THEMES) {
    expect(await renderPoster(
      page, "theater_classic", theme, "split", "landscape",
    )).toEqual([]);
    geometries.push(await rendererGeometry(page));
    palettes.push(await page.evaluate(() => {
      const root = document.querySelector("movie-poster-panel").shadowRoot;
      const theater = root.querySelector(".theater");
      const style = getComputedStyle(theater);
      return [style.color, style.backgroundImage, style.getPropertyValue("--gold")];
    }));
  }
  const structuralGeometry = ({ poster, ...geometry }) => geometry;
  for (const geometry of geometries.slice(1)) {
    // Theme typography can legitimately change the fitted poster by a few
    // pixels. The containment matrix verifies that fit independently; the
    // frame and layout-owned boxes must remain identical here.
    expect(structuralGeometry(geometry))
      .toEqual(structuralGeometry(geometries[0]));
  }
  expect(new Set(palettes.map((palette) => JSON.stringify(palette))).size)
    .toBe(THEMES.length);
});

test("every frame uses the same orientation safe region", async ({ page }) => {
  await openHarness(page);
  for (const configuration of [
    { width: 1280, height: 720, orientation: "landscape" },
    { width: 720, height: 1280, orientation: "portrait" },
  ]) {
    await page.setViewportSize(configuration);
    const regions = [];
    for (const frame of FRAMES) {
      expect(await renderPoster(
        page, frame, "classic", "cinematic", configuration.orientation,
      )).toEqual([]);
      regions.push(await page.evaluate(() => {
        const root = document.querySelector("movie-poster-panel").shadowRoot;
        const frameBox = root.querySelector(".marquee-frame").getBoundingClientRect();
        const stageBox = root.querySelector(".frame-stage").getBoundingClientRect();
        const normalized = (value, total) => Math.round(value / total * 10_000);
        return {
          top: normalized(stageBox.top - frameBox.top, frameBox.height),
          right: normalized(frameBox.right - stageBox.right, frameBox.width),
          bottom: normalized(frameBox.bottom - stageBox.bottom, frameBox.height),
          left: normalized(stageBox.left - frameBox.left, frameBox.width),
        };
      }));
    }
    expect(
      new Set(regions.map((region) => JSON.stringify(region))).size,
      `${configuration.orientation}: ${JSON.stringify(regions)}`,
    ).toBe(1);
  }
});

test("renderer consumes validated declarative safe geometry", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 720 });
  await openHarness(page);
  expect(await renderPoster(
    page, "marquee", "classic", "cinematic", "landscape",
    {
      safeOpening: {
        portrait: { x: 20, y: 15, width: 60, height: 70 },
        landscape: { x: 12, y: 14, width: 76, height: 72 },
      },
    },
  )).toEqual([]);
  const geometry = await page.evaluate(() => {
    const root = document.querySelector("movie-poster-panel").shadowRoot;
    const frame = root.querySelector(".marquee-frame").getBoundingClientRect();
    const stage = root.querySelector(".frame-stage").getBoundingClientRect();
    return {
      x: Math.round((stage.left - frame.left) / frame.width * 100),
      y: Math.round((stage.top - frame.top) / frame.height * 100),
      width: Math.round(stage.width / frame.width * 100),
      height: Math.round(stage.height / frame.height * 100),
    };
  });
  expect(geometry).toEqual({ x: 12, y: 14, width: 76, height: 72 });
});

test("renderer consumes declarative frame layout tuning", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 720 });
  await openHarness(page);
  expect(await renderPoster(
    page, "marquee", "classic", "cinematic", "landscape",
    {
      layoutTuning: {
        poster_share: 52,
        gap: 2,
        details_padding: 1.25,
      },
    },
  )).toEqual([]);
  const tuning = await page.evaluate(() => {
    const root = document.querySelector("movie-poster-panel").shadowRoot;
    const theater = root.querySelector(".theater");
    const style = getComputedStyle(theater);
    return {
      posterShare: style.getPropertyValue("--layout-poster-share").trim(),
      gap: style.getPropertyValue("--layout-gap").trim(),
      detailsPadding: style.getPropertyValue("--layout-details-pad").trim(),
    };
  });
  expect(tuning).toEqual({
    posterShare: "52%",
    gap: "clamp(8px,2cqw,24px)",
    detailsPadding: "clamp(4px,1.25cqw,16px)",
  });
});

test("enabled movie details remain readable in every frame and layout", async ({ page }) => {
  await openHarness(page);
  for (const configuration of [
    { width: 1280, height: 720, orientation: "landscape" },
    { width: 720, height: 1280, orientation: "portrait" },
  ]) {
    await page.setViewportSize(configuration);
    for (const frame of FRAMES) {
      for (const layout of LAYOUTS) {
        expect(await renderPoster(
          page, frame, "classic", layout, configuration.orientation,
        )).toEqual([]);
        const readability = await page.evaluate(() => {
          const root = document.querySelector("movie-poster-panel").shadowRoot;
          const details = root.querySelector(".details");
          const title = details.querySelector("h2");
          const meta = details.querySelector(".meta");
          const detailsBox = details.getBoundingClientRect();
          const titleBox = title.getBoundingClientRect();
          const metaBox = meta.getBoundingClientRect();
          return {
            detailsWidth: Math.round(detailsBox.width),
            detailsHeight: Math.round(detailsBox.height),
            titleVisible: getComputedStyle(title).display !== "none"
              && titleBox.width >= 60 && titleBox.height >= 12,
            titleSize: Math.round(parseFloat(getComputedStyle(title).fontSize)),
            metaVisible: getComputedStyle(meta).display !== "none"
              && metaBox.width >= 60 && metaBox.height >= 8,
            metaHeight: metaBox.height,
            metaFlexShrink: getComputedStyle(meta).flexShrink,
          };
        });
        expect(
          readability,
          `${configuration.orientation}/${frame}/${layout}`,
        ).toMatchObject({
          titleVisible: true,
          metaVisible: true,
        });
        if (configuration.orientation === "portrait") {
          expect(readability.metaFlexShrink).toBe("0");
        }
        expect(readability.metaHeight).toBeGreaterThanOrEqual(8);
        expect(readability.detailsWidth).toBeGreaterThanOrEqual(80);
        expect(readability.detailsHeight).toBeGreaterThanOrEqual(28);
        expect(readability.titleSize).toBeGreaterThanOrEqual(12);
      }
    }
  }
});

test("movie metadata is a styled panel with a two-line title contract", async ({ page }) => {
  await page.setViewportSize({ width: 720, height: 1280 });
  await openHarness(page);
  for (const frame of FRAMES) {
    expect(await renderPoster(
      page, frame, "classic", "cinematic", "portrait",
      {
        title: "Pirates of the Caribbean: The Extremely Long Final Adventure",
      },
    )).toEqual([]);
    const panel = await page.evaluate(() => {
      const root = document.querySelector("movie-poster-panel").shadowRoot;
      const content = root.querySelector(".content").getBoundingClientRect();
      const details = root.querySelector(".details");
      const detailsBox = details.getBoundingClientRect();
      const detailsStyle = getComputedStyle(details);
      const title = details.querySelector("h2");
      const titleStyle = getComputedStyle(title);
      const lineHeight = parseFloat(titleStyle.lineHeight)
        || parseFloat(titleStyle.fontSize) * 1.02;
      return {
        fillsPanel: detailsBox.width >= content.width * .95,
        borderWidth: parseFloat(detailsStyle.borderTopWidth),
        background: detailsStyle.backgroundImage,
        titleLines: Math.round(title.getBoundingClientRect().height / lineHeight),
        titleConstrained: title.scrollHeight <= lineHeight * 2 + 1
          || title.classList.contains("title-truncated"),
      };
    });
    expect(panel.fillsPanel, frame).toBe(true);
    expect(panel.borderWidth, frame).toBeGreaterThanOrEqual(1);
    expect(panel.background, frame).not.toBe("none");
    expect(panel.titleLines, frame).toBeLessThanOrEqual(2);
    expect(panel.titleConstrained, frame).toBe(true);
  }
});

test("portrait metadata uses compact and expanded density states", async ({ page }) => {
  await page.setViewportSize({ width: 720, height: 1280 });
  await openHarness(page);
  const measure = async (variant) => {
    expect(await renderPoster(
      page, "golden_age", "classic", "cinematic", "portrait", variant,
    )).toEqual([]);
    return page.evaluate(() => {
      const root = document.querySelector("movie-poster-panel").shadowRoot;
      const theater = root.querySelector(".theater");
      const content = root.querySelector(".content").getBoundingClientRect();
      const details = root.querySelector(".details").getBoundingClientRect();
      const posterWrap = root.querySelector(".poster-wrap").getBoundingClientRect();
      return {
        expanded: theater.classList.contains("details-expanded"),
        compact: theater.classList.contains("details-compact"),
        detailsShare: details.height / content.height,
        posterShare: posterWrap.height / content.height,
      };
    });
  };

  const compact = await measure({
    showSummary: false,
    showProgress: false,
  });
  const expanded = await measure({
    showSummary: true,
    showProgress: true,
  });

  expect(compact.compact).toBe(true);
  expect(compact.expanded).toBe(false);
  expect(compact.detailsShare).toBeGreaterThan(.28);
  expect(compact.detailsShare).toBeLessThan(.34);
  expect(compact.posterShare).toBeGreaterThan(.66);
  expect(expanded.expanded).toBe(true);
  expect(expanded.compact).toBe(false);
  expect(expanded.detailsShare).toBeGreaterThan(.39);
  expect(expanded.detailsShare).toBeLessThan(.44);
  expect(expanded.posterShare).toBeGreaterThan(.55);
  expect(expanded.detailsShare).toBeGreaterThan(compact.detailsShare);
});

test("production uses compatibility rendering and only the approved reference preset", async ({ page }) => {
  test.setTimeout(120_000);
  await page.setViewportSize({ width: 1280, height: 720 });
  await openHarness(page);
  expect(await renderPoster(
    page, "marquee", "classic", "cinematic", "landscape",
  )).toEqual([]);

  const result = await page.evaluate(() => {
    const root = document.querySelector("movie-poster-panel").shadowRoot;
    const theater = root.querySelector(".theater");
    const frame = root.querySelector(".marquee-frame");
    const box = frame.getBoundingClientRect();
    return {
      reference: theater.classList.contains("renderer-reference"),
      compatibility: theater.classList.contains("renderer-compatibility"),
      declarative: theater.classList.contains("renderer-declarative"),
      contained: box.left >= 0 && box.top >= 0
        && box.right <= innerWidth && box.bottom <= innerHeight,
      ratio: box.width / box.height,
    };
  });
  expect(result.reference).toBe(true);
  expect(result.compatibility).toBe(true);
  expect(result.declarative).toBe(false);
  expect(result.contained).toBe(true);
  expect(result.ratio).toBeCloseTo(4 / 3, 2);

  for (const frame of FRAMES) {
    for (const theme of THEMES) {
      for (const layout of LAYOUTS) {
        expect(await renderPoster(
          page, frame, theme, layout, "landscape",
        )).toEqual([]);
        const renderer = await page.evaluate(() => {
          const theater = document.querySelector("movie-poster-panel")
            .shadowRoot.querySelector(".theater");
          return {
            compatibility: theater.classList.contains("renderer-compatibility"),
            declarative: theater.classList.contains("renderer-declarative"),
            reference: theater.classList.contains("renderer-reference"),
          };
        });
        expect(renderer).toEqual({
          compatibility: true,
          declarative: false,
          reference: frame === "marquee"
            && theme === "classic" && layout === "cinematic",
        });
      }
    }
  }
});

test("production display has exactly one active rendering path", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 720 });
  await openHarness(page);
  expect(await renderPoster(
    page, "cyber_noir", "neon", "cinematic", "landscape",
    {
      design: {
        schema_version: 2,
        components: [{
          id: "title", type: "title", visible: true, z_index: 20,
          bounds: { x: 20, y: 20, width: 60, height: 12 },
        }],
      },
      frameLayers: [{
        id: "bezel", slot: "bezel", z_index: 80,
        asset: {
          portrait: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg'/%3E",
          landscape: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg'/%3E",
        },
      }],
      frameMotion: {
        preset: "cyber_scan", light_count: 8, speed: 1, intensity: 0.8,
      },
    },
  )).toEqual([]);
  const result = await page.evaluate(() => {
    const root = document.querySelector("movie-poster-panel").shadowRoot;
    const frame = root.querySelector(".marquee-frame");
    return {
      stageVisible: getComputedStyle(root.querySelector(".frame-stage")).display !== "none",
      declarativeFrameLayers: root.querySelectorAll(
        ".marquee-frame > .design-frame-layer",
      ).length,
      authoredCanvases: root.querySelectorAll(
        ".marquee-frame > .authored-presentation-canvas",
      ).length,
      nativeMotionScenes: root.querySelectorAll(".frame-motion-scene").length,
      legacyCyberVisible: getComputedStyle(
        root.querySelector(".cyber-frame-lights"),
      ).display !== "none",
      legacyFrameImage: getComputedStyle(frame, "::after").backgroundImage,
    };
  });
  expect(result.stageVisible).toBe(true);
  expect(result.declarativeFrameLayers).toBe(0);
  expect(result.authoredCanvases).toBe(0);
  expect(result.nativeMotionScenes).toBe(0);
  expect(result.legacyCyberVisible).toBe(true);
  expect(result.legacyFrameImage).not.toBe("none");
});

test("declarative development mode disables every legacy visual path", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 720 });
  await openHarness(page, "?renderer=declarative");
  await renderPoster(
    page, "cyber_noir", "neon", "cinematic", "landscape",
    {
      design: {
        schema_version: 2,
        components: [{
          id: "title", type: "title", visible: true, z_index: 20,
          bounds: { x: 20, y: 20, width: 60, height: 12 },
        }],
      },
      frameLayers: [{
        id: "bezel", slot: "bezel", z_index: 80,
        asset: {
          portrait: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg'/%3E",
          landscape: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg'/%3E",
        },
      }],
      frameMotion: {
        preset: "cyber_scan", light_count: 8, speed: 1, intensity: 0.8,
      },
    },
  );
  const result = await page.evaluate(() => {
    const root = document.querySelector("movie-poster-panel").shadowRoot;
    const theater = root.querySelector(".theater");
    const frame = root.querySelector(".marquee-frame");
    return {
      declarative: theater.classList.contains("renderer-declarative"),
      compatibility: theater.classList.contains("renderer-compatibility"),
      stageDisplay: getComputedStyle(root.querySelector(".frame-stage")).display,
      legacyCyberDisplay: getComputedStyle(
        root.querySelector(".cyber-frame-lights"),
      ).display,
      frameLayers: root.querySelectorAll(
        ".marquee-frame > .design-frame-layer",
      ).length,
      authoredCanvases: root.querySelectorAll(
        ".marquee-frame > .authored-presentation-canvas",
      ).length,
      motionScenes: root.querySelectorAll(".frame-motion-scene").length,
      legacyBefore: getComputedStyle(frame, "::before").content,
      legacyAfter: getComputedStyle(frame, "::after").content,
    };
  });
  expect(result).toEqual({
    declarative: true,
    compatibility: false,
    stageDisplay: "none",
    legacyCyberDisplay: "none",
    frameLayers: 1,
    authoredCanvases: 1,
    motionScenes: 1,
    legacyBefore: "none",
    legacyAfter: "none",
  });
});

test("Marquee keeps registered glow and individual chasing bulbs", async ({ page }) => {
  await page.setViewportSize({ width: 720, height: 1280 });
  await openHarness(page);
  expect(await renderPoster(
    page, "marquee", "classic", "cinematic", "portrait",
    { enableMotion: true },
  )).toEqual([]);
  const lighting = await page.evaluate(() => {
    const root = document.querySelector("movie-poster-panel").shadowRoot;
    const rail = root.querySelector(".marquee-bulbs");
    const bulbs = [...rail.querySelectorAll("i")];
    return {
      count: bulbs.length,
      railAnimation: getComputedStyle(rail).animationName,
      glowAnimation: getComputedStyle(rail, "::before").animationName,
      bulbAnimations: [...new Set(bulbs.map((bulb) =>
        getComputedStyle(bulb).animationName))],
      positioned: bulbs.every((bulb) =>
        parseFloat(bulb.style.left) > 0 && parseFloat(bulb.style.top) > 0),
      firstCenter: [
        Math.round(parseFloat(bulbs[0].style.left) / rail.clientWidth * 1000),
        Math.round(parseFloat(bulbs[0].style.top) / rail.clientHeight * 1000),
      ],
    };
  });
  expect(lighting.count).toBe(58);
  expect(lighting.railAnimation).toBe("none");
  expect(lighting.glowAnimation).toBe("marqueeRegisteredPulse");
  expect(lighting.bulbAnimations).toEqual(["bulbChase"]);
  expect(lighting.positioned).toBe(true);
  expect(lighting.firstCenter).toEqual([140, 142]);
});

test("visible stacked summaries fill the metadata panel and center their text", async ({ page }) => {
  await page.setViewportSize({ width: 1080, height: 1920 });
  await openHarness(page);
  for (const orientation of ["auto", "portrait"]) {
    expect(await renderPoster(
      page, "marquee", "classic", "cinematic", orientation,
    )).toEqual([]);
    const geometry = await page.evaluate(() => {
      const root = document.querySelector("movie-poster-panel").shadowRoot;
      const details = root.querySelector(".details");
      const detailsBox = details.getBoundingClientRect();
      const detailsStyle = getComputedStyle(details);
      const summary = root.querySelector(".summary");
      const summaryStyle = getComputedStyle(summary);
      const summaryBox = summary.getBoundingClientRect();
      return {
        visible: summaryStyle.display !== "none" && summaryBox.width > 0,
        widthDifference: Math.abs(
          detailsBox.width
            - parseFloat(detailsStyle.paddingLeft)
            - parseFloat(detailsStyle.paddingRight)
            - parseFloat(detailsStyle.borderLeftWidth)
            - parseFloat(detailsStyle.borderRightWidth)
            - summaryBox.width,
        ),
        textAlign: summaryStyle.textAlign,
      };
    });
    if (geometry.visible) {
      expect(
        geometry.widthDifference,
        `${orientation}: ${JSON.stringify(geometry)}`,
      ).toBeLessThanOrEqual(1);
      expect(geometry.textAlign).toBe("center");
    }
  }
});

test("Cyber Noir keeps posters readable in short stacked desktop layouts", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 720 });
  await openHarness(page);
  for (const theme of THEMES) {
    expect(await renderPoster(
      page, "cyber_noir", theme, "poster", "auto",
    )).toEqual([]);
    expect(await renderPoster(
      page, "cyber_noir", theme, "cinematic", "portrait",
    )).toEqual([]);
  }
});

test("Theater Classic keeps the movie title visible with portrait artwork", async ({ page }) => {
  await page.setViewportSize({ width: 720, height: 1280 });
  await openHarness(page);
  expect(await renderPoster(
    page, "theater_classic", "classic", "cinematic", "portrait",
    { title: "Pirates of the Caribbean: Dead Man's Chest" },
  )).toEqual([]);
  const title = await page.evaluate(() => {
    const root = document.querySelector("movie-poster-panel").shadowRoot;
    const stage = root.querySelector(".frame-stage").getBoundingClientRect();
    const heading = root.querySelector(".details h2");
    const box = heading.getBoundingClientRect();
    return {
      visible: getComputedStyle(heading).display !== "none"
        && box.width > 0 && box.height > 0,
      contained: box.left >= stage.left - 1
        && box.right <= stage.right + 1
        && box.top >= stage.top - 1
        && box.bottom <= stage.bottom + 1,
      text: heading.textContent,
    };
  });
  expect(title).toEqual({
    visible: true,
    contained: true,
    text: "Pirates of the Caribbean: Dead Man's Chest",
  });
});

test("Display Studio presents Frame, Theme, then Layout", async ({ page }) => {
  await openHarness(page, "?studio=1");
  const result = await page.evaluate(() => {
    const panel = document.createElement("movie-poster-panel");
    document.body.append(panel);
    panel._render();
    return {
      order: [...panel.shadowRoot.querySelectorAll("[data-studio]")]
        .map((control) => control.dataset.studio)
        .filter((name) => ["frame_theme", "theme", "layout"].includes(name)),
      frameLabels: [...panel.shadowRoot
        .querySelectorAll('[data-studio="frame_theme"] option')]
        .map((option) => option.textContent),
      themeLabels: [...panel.shadowRoot
        .querySelectorAll('[data-studio="theme"] option')]
        .map((option) => option.textContent),
    };
  });
  expect(result.order).toEqual(["frame_theme", "theme", "layout"]);
  expect(result.frameLabels).toEqual([
    "Marquee", "Cyber Noir", "Comic Hero", "Theater Classic",
    "Indie Nature", "Golden Age", "Steampunk",
  ]);
  expect(result.themeLabels).toEqual([
    "Classic", "Art Deco", "Neon", "Minimal", "OLED",
  ]);
});

test("Display Studio portrait preview shows enabled Summary and Progress", async ({ page }) => {
  await page.setViewportSize({ width: 720, height: 1280 });
  await openHarness(page, "?studio=1");
  const result = await page.evaluate(() => {
    const panel = document.createElement("movie-poster-panel");
    document.body.append(panel);
    panel._state.presentation.orientation = "portrait";
    panel._state.presentation.show_summary = true;
    panel._state.presentation.show_progress = true;
    panel._render();
    const root = panel.shadowRoot;
    const stage = root.querySelector(".frame-stage").getBoundingClientRect();
    const summary = root.querySelector(".summary");
    const progress = root.querySelector(".progress");
    const summaryBox = summary.getBoundingClientRect();
    const progressBox = progress.getBoundingClientRect();
    return {
      summaryVisible: getComputedStyle(summary).display !== "none"
        && summaryBox.height > 0,
      progressVisible: getComputedStyle(progress).display !== "none"
        && progressBox.height > 0,
      contained: summaryBox.bottom <= stage.bottom + 1
        && progressBox.bottom <= stage.bottom + 1,
      summaryChecked: root.querySelector('[data-studio="show_summary"]').checked,
      progressChecked: root.querySelector('[data-studio="show_progress"]').checked,
    };
  });
  expect(result).toEqual({
    summaryVisible: true,
    progressVisible: true,
    contained: true,
    summaryChecked: true,
    progressChecked: true,
  });
});

test("visual editor starts blank and adds normalized components", async ({ page }) => {
  await openHarness(page, "?studio=1");
  const result = await page.evaluate(async () => {
    const panel = document.createElement("movie-poster-panel");
    panel._state.entry_id = "editor-entry";
    panel._editorProfileId = "blank";
    panel._editorDocument = {
      version: 2,
      name: "Blank",
      description: "",
      author: "",
      presentation: { ...panel._state.presentation },
      design: {
        schema_version: 1,
        resources: {
          frame: { id: "builtin.frame.blank", version: 1 },
          theme: { id: "builtin.theme.classic", version: 1 },
          layout: { id: "builtin.layout.blank", version: 1 },
        },
        viewport: { fit: "contain", link_orientations: true },
        components: [],
        motion: { preset: "none", speed: 1, intensity: 0, stagger: 0 },
      },
    };
    document.body.append(panel);
    panel._render();
    panel.shadowRoot.querySelector("[data-editor-add-type]").value = "title";
    await panel._editorAction("add");
    clearTimeout(panel._editorSaveTimer);
    const component = panel._editorDocument.design.components[0];
    return {
      canvas: Boolean(panel.shadowRoot.querySelector(".visual-editor-canvas")),
      type: component.type,
      bounds: component.bounds,
      selected: panel._editorSelectedId,
    };
  });
  expect(result).toEqual({
    canvas: true,
    type: "title",
    bounds: { x: 30, y: 30, width: 40, height: 12 },
    selected: "title",
  });
});

test("frame assets are locked structural layers above live and editor content", async ({
  page,
}) => {
  await openHarness(page, "?studio=1");
  const result = await page.evaluate(async () => {
    const frameLayers = [
      {
        id: "frame_bezel",
        name: "Curtains and bezel",
        slot: "bezel",
        asset: {
          portrait: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg'/%3E",
          landscape: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg'/%3E",
        },
        z_index: 80,
        locked: true,
        opacity: 0.9,
        blend_mode: "normal",
      },
    ];
    const panel = document.createElement("movie-poster-panel");
    document.body.append(panel);
    panel._rendererMode = "declarative";
    panel._state.design_frame = {
      id: "builtin.frame.theater_classic",
      version: 1,
      layers: frameLayers,
    };
    panel._state.presentation.frame_theme = "theater_classic";
    panel._presentationCatalog = {
      frames: {
        theater_classic: {
          id: "builtin.frame.theater_classic",
          layers: frameLayers,
        },
      },
    };
    panel._render();
    const liveLayer = panel.shadowRoot.querySelector(
      ".marquee-frame > .design-frame-layer.frame-slot-bezel",
    );
    const liveImage = liveLayer.querySelector("img");
    const liveStage = panel.shadowRoot.querySelector(".frame-stage");
    const live = {
      followsStage: liveStage.compareDocumentPosition(liveLayer)
        & Node.DOCUMENT_POSITION_FOLLOWING,
      zIndex: liveLayer.style.zIndex,
      opacity: liveLayer.style.opacity,
      pointerEvents: getComputedStyle(liveLayer).pointerEvents,
      imageObjectFit: getComputedStyle(liveImage).objectFit,
    };

    panel._editorProfileId = "layered";
    panel._editorDocument = {
      version: 2,
      name: "Layered",
      description: "",
      author: "",
      presentation: { ...panel._state.presentation },
      design: {
        schema_version: 2,
        resources: {
          frame: { id: "builtin.frame.theater_classic", version: 1 },
          theme: { id: "builtin.theme.classic", version: 1 },
          layout: { id: "builtin.layout.blank", version: 1 },
        },
        viewport: { fit: "contain", link_orientations: true },
        components: [],
        motion: { preset: "none", speed: 1, intensity: 0, stagger: 0 },
      },
    };
    panel._render();
    const editorLayer = panel.shadowRoot.querySelector(
      ".visual-editor-canvas > .design-frame-layer.frame-slot-bezel",
    );
    return {
      live,
      editorLayer: Boolean(editorLayer),
      editorZIndex: editorLayer?.style.zIndex,
      structuralLabel: panel.shadowRoot.querySelector(
        ".editor-layer-row.structural-layer",
      )?.textContent.replace(/\s+/g, " ").trim(),
    };
  });
  expect(result).toEqual({
    live: {
      followsStage: 4,
      zIndex: "80",
      opacity: "0.9",
      pointerEvents: "none",
      imageObjectFit: "cover",
    },
    editorLayer: true,
    editorZIndex: "80",
    structuralLabel: "Curtains and bezel 80 Locked",
  });
});

test("locked editor components resist changes and can be unlocked", async ({ page }) => {
  await openHarness(page, "?studio=1");
  const result = await page.evaluate(async () => {
    const panel = document.createElement("movie-poster-panel");
    document.body.append(panel);
    panel._editorProfileId = "locked";
    const component = panel._defaultEditorComponent("title", "title");
    component.locked = true;
    panel._editorDocument = {
      version: 2,
      name: "Locked",
      description: "",
      author: "",
      presentation: { ...panel._state.presentation },
      design: {
        schema_version: 2,
        resources: {
          frame: { id: "builtin.frame.blank", version: 1 },
          theme: { id: "builtin.theme.classic", version: 1 },
          layout: { id: "builtin.layout.blank", version: 1 },
        },
        viewport: { fit: "contain", link_orientations: true },
        components: [component],
        motion: { preset: "none", speed: 1, intensity: 0, stagger: 0 },
      },
    };
    panel._editorSelectedId = "title";
    panel._editorSelectedIds = ["title"];
    panel._editorSettingsOpenId = "title";
    panel._render();
    panel._handleEditorKeydown(new KeyboardEvent("keydown", {
      key: "ArrowLeft",
    }));
    await panel._editorAction("delete-component");
    const lockedResult = {
      count: panel._editorDocument.design.components.length,
      x: component.bounds.x,
    };
    const lockControl = panel.shadowRoot.querySelector("[data-editor-locked]");
    lockControl.checked = false;
    lockControl.dispatchEvent(new Event("change"));
    clearTimeout(panel._editorSaveTimer);
    panel._handleEditorKeydown(new KeyboardEvent("keydown", {
      key: "ArrowLeft",
    }));
    return {
      lockedResult,
      locked: component.locked,
      xAfterUnlock: component.bounds.x,
    };
  });
  expect(result).toEqual({
    lockedResult: { count: 1, x: 30 },
    locked: false,
    xAfterUnlock: 29,
  });
});

test("published custom profiles render authored geometry instead of legacy layout", async ({
  page,
}) => {
  await openHarness(page, "?studio=1&renderer=declarative");
  const result = await page.evaluate(async () => {
    const panel = document.createElement("movie-poster-panel");
    document.body.append(panel);
    panel._state.profile_id = "custom-cinema";
    panel._state.design_assets = {
      "assets/user/overlay.png": "/api/signed-overlay.png",
    };
    panel._state.design = {
      schema_version: 2,
      resources: {
        frame: { id: "builtin.frame.marquee", version: 1 },
        theme: { id: "builtin.theme.classic", version: 1 },
        layout: { id: "builtin.layout.blank", version: 1 },
      },
      viewport: { fit: "contain", link_orientations: true },
      components: [
        {
          id: "poster",
          name: "Poster",
          type: "poster",
          bounds: { x: 5, y: 10, width: 40, height: 80 },
          z_index: 10,
          visible: true,
          locked: false,
          blend_mode: "normal",
          clip: "safe_opening",
          style_ref: "surface",
          style: {},
          constraints: {
            max_lines: 0, min_font_size: 0.8, preserve_aspect: true,
          },
          text: "",
          orientation_overrides: {},
        },
        {
          id: "title",
          name: "Title",
          type: "title",
          bounds: { x: 50, y: 20, width: 45, height: 20 },
          z_index: 20,
          visible: true,
          locked: false,
          blend_mode: "normal",
          clip: "safe_opening",
          style_ref: "text_heading",
          style: { font_size: 4, text_align: "left" },
          constraints: {
            max_lines: 2, min_font_size: 0.8, preserve_aspect: false,
          },
          text: "",
          orientation_overrides: {},
        },
        {
          id: "overlay",
          name: "Overlay",
          type: "custom_image",
          bounds: { x: 0, y: 0, width: 100, height: 100 },
          z_index: 30,
          visible: true,
          locked: false,
          blend_mode: "screen",
          clip: "safe_opening",
          style_ref: "surface",
          style: { opacity: 0.6 },
          constraints: {
            max_lines: 0, min_font_size: 0.8, preserve_aspect: true,
          },
          text: "",
          asset_ref: "assets/user/overlay.png",
          orientation_overrides: {},
        },
      ],
      motion: { preset: "none", speed: 1, intensity: 0, stagger: 0 },
    };
    panel._render();
    await new Promise((resolve) => requestAnimationFrame(resolve));
    const root = panel.shadowRoot;
    const surface = root.querySelector(".authored-component-surface");
    const poster = root.querySelector('[data-authored-component="poster"]');
    const title = root.querySelector('[data-authored-component="title"]');
    const surfaceBox = surface.getBoundingClientRect();
    const posterBox = poster.getBoundingClientRect();
    return {
      authored: Boolean(root.querySelector(".authored-presentation-canvas")),
      legacyHidden: getComputedStyle(root.querySelector(".frame-stage")).display,
      title: title.textContent.trim(),
      titleAlign: getComputedStyle(title).textAlign,
      titleLines: getComputedStyle(
        title.querySelector(".authored-component-content"),
      ).webkitLineClamp,
      overlayUrl: root.querySelector(
        '[data-authored-component="overlay"] img',
      )?.getAttribute("src"),
      posterGeometry: {
        x: Math.round((posterBox.left - surfaceBox.left) / surfaceBox.width * 100),
        y: Math.round((posterBox.top - surfaceBox.top) / surfaceBox.height * 100),
        width: Math.round(posterBox.width / surfaceBox.width * 100),
        height: Math.round(posterBox.height / surfaceBox.height * 100),
      },
    };
  });
  expect(result).toEqual({
    authored: true,
    legacyHidden: "none",
    title: "The Grand Premiere",
    titleAlign: "left",
    titleLines: "2",
    overlayUrl: "/api/signed-overlay.png",
    posterGeometry: { x: 5, y: 10, width: 40, height: 80 },
  });
});

test("packaged image assets become movable canvas layers", async ({ page }) => {
  await openHarness(page, "?studio=1");
  const result = await page.evaluate(() => {
    const panel = document.createElement("movie-poster-panel");
    document.body.append(panel);
    panel._editorProfileId = "assets";
    panel._presentationLibrary = {
      profiles: {
        assets: {
          draft: null,
          published: [],
          active_revision: null,
          assets: {
            "assets/user/curtain.png": "iVBORw0KGgo=",
          },
        },
      },
    };
    panel._editorDocument = {
      version: 2,
      name: "Assets",
      description: "",
      author: "",
      presentation: { ...panel._state.presentation },
      design: {
        schema_version: 2,
        resources: {
          frame: { id: "builtin.frame.blank", version: 1 },
          theme: { id: "builtin.theme.classic", version: 1 },
          layout: { id: "builtin.layout.blank", version: 1 },
        },
        viewport: { fit: "contain", link_orientations: true },
        components: [],
        motion: { preset: "none", speed: 1, intensity: 0, stagger: 0 },
      },
    };
    panel._addEditorAssetLayer("assets/user/curtain.png");
    panel._editorSettingsOpenId = panel._editorSelectedId;
    panel._render();
    clearTimeout(panel._editorSaveTimer);
    const component = panel._editorDocument.design.components[0];
    const image = panel.shadowRoot.querySelector(
      '[data-editor-component="custom-image"] img',
    );
    const fitControl = panel.shadowRoot.querySelector(
      '[data-editor-style="image_fit"]',
    );
    const aspectControl = panel.shadowRoot.querySelector(
      "[data-editor-preserve-aspect]",
    );
    fitControl.value = "cover";
    fitControl.dispatchEvent(new Event("change"));
    clearTimeout(panel._editorSaveTimer);
    const renderedImage = panel.shadowRoot.querySelector(
      '[data-editor-component="custom-image"] img',
    );
    return {
      type: component.type,
      name: component.name,
      assetRef: component.asset_ref,
      bounds: component.bounds,
      imageUrl: image?.getAttribute("src"),
      imageFit: getComputedStyle(renderedImage).objectFit,
      preserveAspect: aspectControl.checked,
    };
  });
  expect(result).toEqual({
    type: "custom_image",
    name: "curtain.png",
    assetRef: "assets/user/curtain.png",
    bounds: { x: 25, y: 20, width: 50, height: 50 },
    imageUrl: "data:image/png;base64,iVBORw0KGgo=",
    imageFit: "cover",
    preserveAspect: true,
  });
});

test("editor clip policies control authored layer overflow", async ({ page }) => {
  await openHarness(page, "?studio=1&renderer=declarative");
  const result = await page.evaluate(() => {
    const panel = document.createElement("movie-poster-panel");
    document.body.append(panel);
    panel._state.profile_id = "clip-test";
    const component = panel._defaultEditorComponent("custom_image", "overlay");
    panel._state.design = {
      schema_version: 2,
      resources: {
        frame: { id: "builtin.frame.blank", version: 1 },
        theme: { id: "builtin.theme.classic", version: 1 },
        layout: { id: "builtin.layout.blank", version: 1 },
      },
      viewport: { fit: "contain", link_orientations: true },
      components: [structuredClone(component)],
      motion: { preset: "none", speed: 1, intensity: 0, stagger: 0 },
    };
    panel._editorProfileId = "clip-test";
    panel._editorDocument = {
      version: 2,
      name: "Clip test",
      description: "",
      author: "",
      presentation: { ...panel._state.presentation },
      design: {
        ...structuredClone(panel._state.design),
        components: [component],
      },
    };
    panel._editorSelectedId = component.id;
    panel._editorSelectedIds = [component.id];
    panel._editorSettingsOpenId = component.id;
    panel._render();
    const select = panel.shadowRoot.querySelector("[data-editor-clip]");
    const options = [...select.options].map((option) => ({
      value: option.value,
      label: option.textContent.trim(),
    }));
    select.value = "canvas";
    select.dispatchEvent(new Event("change"));
    clearTimeout(panel._editorSaveTimer);
    const editorLayer = panel.shadowRoot.querySelector(
      '[data-editor-component="overlay"]',
    );
    const editorPolicy = editorLayer.dataset.componentClip;
    const editorOverflow = getComputedStyle(editorLayer).overflow;

    panel._state.design.components[0].clip = "none";
    panel._editorDocument = null;
    panel._render();
    const authoredLayer = panel.shadowRoot.querySelector(
      '[data-authored-component="overlay"]',
    );
    return {
      options,
      savedPolicy: component.clip,
      editorPolicy,
      editorOverflow,
      authoredPolicy: authoredLayer.dataset.componentClip,
      authoredOverflow: getComputedStyle(authoredLayer).overflow,
    };
  });
  expect(result).toEqual({
    options: [
      { value: "safe_opening", label: "Frame opening" },
      { value: "canvas", label: "Full canvas" },
      { value: "none", label: "No clipping" },
    ],
    savedPolicy: "canvas",
    editorPolicy: "canvas",
    editorOverflow: "visible",
    authoredPolicy: "none",
    authoredOverflow: "visible",
  });
});

test("Profile motion controls animate authored layers with stagger", async ({ page }) => {
  await openHarness(page, "?studio=1&renderer=declarative");
  const result = await page.evaluate(() => {
    const panel = document.createElement("movie-poster-panel");
    document.body.append(panel);
    const title = panel._defaultEditorComponent("title", "title");
    const overlay = panel._defaultEditorComponent("custom_image", "overlay");
    panel._editorProfileId = "motion-test";
    panel._editorDocument = {
      version: 2,
      name: "Motion test",
      description: "",
      author: "",
      presentation: { ...panel._state.presentation },
      design: {
        schema_version: 2,
        resources: {
          frame: { id: "builtin.frame.blank", version: 1 },
          theme: { id: "builtin.theme.classic", version: 1 },
          layout: { id: "builtin.layout.blank", version: 1 },
        },
        viewport: { fit: "contain", link_orientations: true },
        components: [title, overlay],
        motion: { preset: "none", speed: 1, intensity: 0, stagger: 0 },
      },
    };
    panel._render();
    const changeMotion = (field, value) => {
      const control = panel.shadowRoot.querySelector(
        `[data-editor-motion="${field}"]`,
      );
      control.value = String(value);
      control.dispatchEvent(new Event("change"));
      clearTimeout(panel._editorSaveTimer);
    };
    changeMotion("preset", "pulse");
    changeMotion("speed", 2);
    changeMotion("intensity", 0.8);
    changeMotion("stagger", 0.25);
    const storedMotion = structuredClone(panel._editorDocument.design.motion);

    panel._state.profile_id = "motion-test";
    panel._state.design = structuredClone(panel._editorDocument.design);
    panel._state.presentation.enable_motion = true;
    panel._editorDocument = null;
    panel._render();
    const canvas = panel.shadowRoot.querySelector(
      ".authored-presentation-canvas",
    );
    const secondLayer = panel.shadowRoot.querySelector(
      '[data-authored-component="overlay"]',
    );
    const computed = getComputedStyle(secondLayer);
    return {
      storedMotion,
      canvasClass: canvas.className,
      duration: computed.animationDuration,
      delay: computed.animationDelay,
      animationName: computed.animationName,
      opacityFloor: canvas.style.getPropertyValue(
        "--authored-motion-opacity",
      ).trim(),
    };
  });
  expect(result).toEqual({
    storedMotion: {
      preset: "pulse", speed: 2, intensity: 0.8, stagger: 0.25,
    },
    canvasClass: "authored-presentation-canvas authored-motion-pulse",
    duration: "2s",
    delay: "0.25s",
    animationName: "authoredPulse",
    opacityFloor: "0.72",
  });
});

test("editor authors Frame practical-light motion independently", async ({ page }) => {
  await openHarness(page, "?studio=1&renderer=declarative");
  const result = await page.evaluate(() => {
    const panel = document.createElement("movie-poster-panel");
    document.body.append(panel);
    panel._editorProfileId = "frame-motion-test";
    panel._editorDocument = {
      version: 2,
      name: "Frame motion test",
      description: "",
      author: "",
      presentation: { ...panel._state.presentation },
      design: {
        schema_version: 2,
        resources: {
          frame: { id: "builtin.frame.blank", version: 1 },
          theme: { id: "builtin.theme.classic", version: 1 },
          layout: { id: "builtin.layout.blank", version: 1 },
        },
        viewport: { fit: "contain", link_orientations: true },
        components: [],
        motion: { preset: "none", speed: 1, intensity: 0, stagger: 0 },
      },
    };
    panel._render();
    const change = (field, value) => {
      const control = panel.shadowRoot.querySelector(
        `[data-editor-frame-motion="${field}"]`,
      );
      control.value = String(value);
      control.dispatchEvent(new Event("change"));
      clearTimeout(panel._editorSaveTimer);
    };
    change("preset", "theater_sconce");
    change("speed", 0.6);
    change("intensity", 0.7);
    change("light_count", 4);
    const lights = panel.shadowRoot.querySelectorAll(".theater-sconce");
    return {
      stored: structuredClone(panel._editorDocument.design.frame_motion),
      className: [...panel.shadowRoot.querySelector(".theater").classList]
        .find((name) => name.startsWith("frame-motion-")),
      lights: lights.length,
      animation: getComputedStyle(lights[0]).animationName,
    };
  });
  expect(result).toEqual({
    stored: {
      preset: "theater_sconce", speed: 0.6, intensity: 0.7, light_count: 4,
    },
    className: "frame-motion-theater_sconce",
    lights: 4,
    animation: "frameSconceBreathe",
  });
});

test("typography inspector preserves theme colors and readable minimums", async ({
  page,
}) => {
  await openHarness(page, "?studio=1");
  const result = await page.evaluate(() => {
    const panel = document.createElement("movie-poster-panel");
    document.body.append(panel);
    const title = panel._defaultEditorComponent("title", "title");
    panel._editorProfileId = "typography-test";
    panel._editorSelectedId = "title";
    panel._editorSelectedIds = ["title"];
    panel._editorDocument = {
      version: 2,
      name: "Typography test",
      description: "",
      author: "",
      presentation: { ...panel._state.presentation },
      design: {
        schema_version: 2,
        resources: {
          frame: { id: "builtin.frame.blank", version: 1 },
          theme: { id: "builtin.theme.classic", version: 1 },
          layout: { id: "builtin.layout.blank", version: 1 },
        },
        viewport: { fit: "contain", link_orientations: true },
        components: [title],
        motion: { preset: "none", speed: 1, intensity: 0, stagger: 0 },
      },
    };
    panel._editorSettingsOpenId = "title";
    panel._render();
    const change = (selector, value, checked = null) => {
      const control = panel.shadowRoot.querySelector(selector);
      if (checked !== null) control.checked = checked;
      else control.value = String(value);
      control.dispatchEvent(new Event("change"));
      clearTimeout(panel._editorSaveTimer);
    };
    change("[data-editor-style-ref]", "accent_secondary");
    change("[data-editor-text-color-override]", null, true);
    const overrideAdded = title.style.text_color;
    change("[data-editor-text-color-override]", null, false);
    change("[data-editor-min-font]", 2.2);
    change('[data-editor-style="glow"]', 0.75);
    change('[data-editor-style="font_family"]', "serif");
    const editorTitle = panel.shadowRoot.querySelector(
      '[data-editor-component="title"]',
    );
    const inlineStyle = editorTitle.getAttribute("style");
    return {
      styleRef: title.style_ref,
      overrideAdded,
      overrideRemoved: !Object.hasOwn(title.style, "text_color"),
      minFont: title.constraints.min_font_size,
      glow: title.style.glow,
      fontFamily: title.style.font_family,
      usesReadableClamp: inlineStyle.includes(
        "font-size:clamp(2.2cqw,3cqw,20cqw)",
      ),
      usesThemeToken: inlineStyle.includes(
        "color:var(--mp-accent-secondary,#ffffff)",
      ),
      glowRadius: inlineStyle.includes("text-shadow:0 0 18px"),
      usesComponentFont: inlineStyle.includes(
        "font-family:Georgia, 'Times New Roman', serif",
      ),
    };
  });
  expect(result).toEqual({
    styleRef: "accent_secondary",
    overrideAdded: "#ffffff",
    overrideRemoved: true,
    minFont: 2.2,
    glow: 0.75,
    fontFamily: "serif",
    usesReadableClamp: true,
    usesThemeToken: true,
    glowRadius: true,
    usesComponentFont: true,
  });
});

test("component settings use a contextual progressive-disclosure inspector", async ({
  page,
}) => {
  await openHarness(page, "?studio=1");
  const result = await page.evaluate(() => {
    const panel = document.createElement("movie-poster-panel");
    document.body.append(panel);
    const title = panel._defaultEditorComponent("title", "title");
    const poster = panel._defaultEditorComponent("poster", "poster");
    panel._editorProfileId = "contextual-settings";
    panel._editorSelectedId = "title";
    panel._editorSelectedIds = ["title"];
    panel._editorDocument = {
      version: 2,
      name: "Contextual settings",
      description: "",
      author: "",
      presentation: { ...panel._state.presentation },
      design: {
        schema_version: 2,
        resources: {
          frame: { id: "builtin.frame.blank", version: 1 },
          theme: { id: "builtin.theme.classic", version: 1 },
          layout: { id: "builtin.layout.blank", version: 1 },
        },
        viewport: { fit: "contain", link_orientations: true },
        components: [poster, title],
        motion: { preset: "none", speed: 1, intensity: 0, stagger: 0 },
      },
    };
    panel._render();
    const root = panel.shadowRoot;
    const toolbarInsideSurface = Boolean(
      root.querySelector(".editor-component-surface > .editor-context-toolbar"),
    );
    const closedInitially = !root.querySelector(".editor-context-popover");
    root.querySelector('[data-editor-context="settings"]').click();
    const titleHasFont = Boolean(
      root.querySelector('[data-editor-style="font_family"]'),
    );
    const titleHasRotation = Boolean(
      root.querySelector('[data-editor-style="rotation"]'),
    );
    const titleHasNoImageFit = !root.querySelector(
      '[data-editor-style="image_fit"]',
    );
    const advancedClosed = !root.querySelector(".editor-advanced").open;
    panel._selectEditorComponent("poster");
    panel._render();
    root.querySelector('[data-editor-context="settings"]').click();
    const posterHasImageFit = Boolean(
      root.querySelector('[data-editor-style="image_fit"]'),
    );
    const posterHasNoFont = !root.querySelector(
      '[data-editor-style="font_family"]',
    );
    window.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
    const escapeClosed = !root.querySelector(".editor-context-popover");
    return {
      toolbarInsideSurface,
      closedInitially,
      titleHasFont,
      titleHasRotation,
      titleHasNoImageFit,
      advancedClosed,
      posterHasImageFit,
      posterHasNoFont,
      escapeClosed,
    };
  });
  expect(result).toEqual({
    toolbarInsideSurface: true,
    closedInitially: true,
    titleHasFont: true,
    titleHasRotation: true,
    titleHasNoImageFit: true,
    advancedClosed: true,
    posterHasImageFit: true,
    posterHasNoFont: true,
    escapeClosed: true,
  });
});

test("editor canvas provides guides, rulers, zoom, pan, and fit reset", async ({
  page,
}) => {
  await openHarness(page, "?studio=1");
  const result = await page.evaluate(async () => {
    const panel = document.createElement("movie-poster-panel");
    document.body.append(panel);
    panel._editorProfileId = "viewport-tools";
    panel._editorDocument = {
      version: 2,
      name: "Viewport tools",
      description: "",
      author: "",
      presentation: { ...panel._state.presentation },
      design: {
        schema_version: 2,
        resources: {
          frame: { id: "builtin.frame.marquee", version: 1 },
          theme: { id: "builtin.theme.classic", version: 1 },
          layout: { id: "builtin.layout.blank", version: 1 },
        },
        viewport: { fit: "contain", link_orientations: true },
        components: [panel._defaultEditorComponent("poster", "poster")],
        motion: { preset: "none", speed: 1, intensity: 0, stagger: 0 },
      },
    };
    panel._render();
    const root = panel.shadowRoot;
    const viewportBefore = root.querySelector(
      ".visual-editor-viewport",
    ).getBoundingClientRect();
    root.querySelector('[data-editor-viewport="zoom"]').value = "1.25";
    root.querySelector('[data-editor-viewport="zoom"]').dispatchEvent(
      new Event("input", { bubbles: true }),
    );
    panel._editorPanX = 12;
    panel._editorPanY = -8;
    panel._render();
    const viewportAfter = panel.shadowRoot.querySelector(
      ".visual-editor-viewport",
    ).getBoundingClientRect();
    const transformed = getComputedStyle(
      panel.shadowRoot.querySelector(".visual-editor-canvas"),
    ).transform !== "none";
    const guideCount = panel.shadowRoot.querySelectorAll(
      ".editor-design-guides .editor-guide, .editor-design-guides .editor-ruler",
    ).length;
    await panel._editorAction("reset-view");
    return {
      transformed,
      viewportStable: ["x", "y", "width", "height"].every(
        (key) => Math.abs(viewportBefore[key] - viewportAfter[key]) < 0.5,
      ),
      guideCount,
      guidesEnabled: panel.shadowRoot.querySelector(
        ".visual-editor-canvas",
      ).classList.contains("guides-enabled"),
      zoom: panel._editorZoom,
      panX: panel._editorPanX,
      panY: panel._editorPanY,
    };
  });
  expect(result).toEqual({
    transformed: true,
    viewportStable: true,
    guideCount: 5,
    guidesEnabled: true,
    zoom: 1,
    panX: 0,
    panY: 0,
  });
});

test("preserve aspect keeps image proportions during pointer resize", async ({
  page,
}) => {
  await openHarness(page, "?studio=1");
  await page.evaluate(() => {
    const panel = document.createElement("movie-poster-panel");
    document.body.append(panel);
    panel._editorProfileId = "aspect";
    const image = panel._defaultEditorComponent("custom_image", "image");
    panel._editorDocument = {
      version: 2,
      name: "Aspect",
      description: "",
      author: "",
      presentation: { ...panel._state.presentation },
      design: {
        schema_version: 2,
        resources: {
          frame: { id: "builtin.frame.blank", version: 1 },
          theme: { id: "builtin.theme.classic", version: 1 },
          layout: { id: "builtin.layout.blank", version: 1 },
        },
        viewport: { fit: "contain", link_orientations: true },
        components: [image],
        motion: { preset: "none", speed: 1, intensity: 0, stagger: 0 },
      },
    };
    panel._editorSelectedId = "image";
    panel._editorSelectedIds = ["image"];
    panel._render();
  });
  const component = page.locator('[data-editor-component="image"]');
  const handle = component.locator("[data-editor-resize]");
  const before = await component.boundingBox();
  const handleBox = await handle.boundingBox();
  await page.mouse.move(
    handleBox.x + handleBox.width / 2,
    handleBox.y + handleBox.height / 2,
  );
  await page.mouse.down();
  await page.mouse.move(
    handleBox.x + handleBox.width / 2 + 35,
    handleBox.y + handleBox.height / 2,
  );
  await page.mouse.up();
  const after = await component.boundingBox();
  expect(after.width).toBeGreaterThan(before.width);
  expect(after.width / after.height).toBeCloseTo(before.width / before.height, 1);
});

test("visual editor supports bounded undo and redo history", async ({ page }) => {
  await openHarness(page, "?studio=1");
  const result = await page.evaluate(async () => {
    const panel = document.createElement("movie-poster-panel");
    panel._state.entry_id = "editor-entry";
    panel._editorProfileId = "history";
    panel._editorDocument = {
      version: 2,
      name: "History",
      description: "",
      author: "",
      presentation: { ...panel._state.presentation },
      design: {
        schema_version: 1,
        resources: {
          frame: { id: "builtin.frame.blank", version: 1 },
          theme: { id: "builtin.theme.classic", version: 1 },
          layout: { id: "builtin.layout.blank", version: 1 },
        },
        viewport: { fit: "contain", link_orientations: true },
        components: [],
        motion: { preset: "none", speed: 1, intensity: 0, stagger: 0 },
      },
    };
    document.body.append(panel);
    panel._render();
    panel.shadowRoot.querySelector("[data-editor-add-type]").value = "title";
    await panel._editorAction("add");
    await panel._editorAction("undo");
    const afterUndo = panel._editorDocument.design.components.length;
    await panel._editorAction("redo");
    const afterRedo = panel._editorDocument.design.components.map(
      (component) => component.id,
    );
    panel._alignEditorComponent("right");
    const afterAlign = panel._editorDocument.design.components[0].bounds.x;
    panel._handleEditorKeydown(new KeyboardEvent("keydown", {
      key: "ArrowLeft",
    }));
    const afterKeyboardMove = panel._editorDocument.design.components[0].bounds.x;
    const title = panel._editorDocument.design.components[0];
    title.bounds = { x: 0, y: 10, width: 10, height: 10 };
    panel._editorDocument.design.components.push(
      {
        ...structuredClone(title),
        id: "subtitle",
        type: "subtitle",
        bounds: { x: 20, y: 30, width: 10, height: 10 },
      },
      {
        ...structuredClone(title),
        id: "year",
        type: "year",
        bounds: { x: 90, y: 50, width: 10, height: 10 },
      },
    );
    panel._editorSelectedIds = ["title", "subtitle", "year"];
    panel._editorSelectedId = "year";
    panel._distributeEditorComponents("horizontal");
    panel._alignEditorComponent("top");
    const distributed = panel._editorDocument.design.components.map(
      (component) => ({ x: component.bounds.x, y: component.bounds.y }),
    );
    panel._editorSelectedIds = ["title"];
    panel._editorSelectedId = "title";
    await panel._editorAction("duplicate-component");
    const duplicateId = panel._editorSelectedId;
    await panel._editorAction("reset-component");
    panel._editorDevicePreset = "television";
    const libraryRequests = [];
    panel._presentationLibrary = {
      profiles: {
        history: {
          active_revision: 1,
          draft: panel._editorDocument,
          assets: {},
          published: [
            { revision: 1, profile: structuredClone(panel._editorDocument) },
            { revision: 2, profile: structuredClone(panel._editorDocument) },
          ],
        },
      },
    };
    panel._callLibrary = async (action, fields) => {
      libraryRequests.push({ action, fields });
      if (action === "put_asset") {
        panel._presentationLibrary.profiles.history.assets[
          fields.asset_path
        ] = fields.asset;
        return {
          asset_path: fields.asset_path,
          library: panel._presentationLibrary,
        };
      }
      if (action === "delete_asset") {
        delete panel._presentationLibrary.profiles.history.assets[
          fields.asset_path
        ];
      }
      return { library: panel._presentationLibrary };
    };
    panel._render();
    panel.shadowRoot.querySelector("[data-editor-revision]").value = "2";
    await panel._editorAction("rollback");
    await panel._uploadEditorAsset(new File(
      [new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10])],
      "frame.png",
      { type: "image/png" },
    ));
    await panel._deleteEditorAsset("assets/user/frame.png");
    clearTimeout(panel._editorSaveTimer);
    return {
      afterUndo,
      afterRedo,
      afterAlign,
      afterKeyboardMove,
      selectedCount: 3,
      distributed,
      duplicateId,
      resetBounds: panel._selectedEditorComponent().bounds,
      devicePreview: panel.shadowRoot.querySelector(
        ".visual-editor-canvas.device-preview",
      )?.style.getPropertyValue("--editor-preview-ratio"),
      warnings: panel._editorWarnings(),
      libraryRequests: libraryRequests.map(({ action, fields }) => ({
        action,
        profile_id: fields.profile_id,
        revision: fields.revision,
        asset_path: fields.asset_path,
      })),
      undoDepth: panel._editorUndoStack.length,
      redoDepth: panel._editorRedoStack.length,
    };
  });
  expect(result).toEqual({
    afterUndo: 0,
    afterRedo: ["title"],
    afterAlign: 60,
    afterKeyboardMove: 59,
    selectedCount: 3,
    distributed: [
      { x: 0, y: 10 },
      { x: 45, y: 10 },
      { x: 90, y: 10 },
    ],
    duplicateId: "title-copy",
    resetBounds: { x: 30, y: 30, width: 40, height: 12 },
    devicePreview: String(16 / 9),
    warnings: ["No visible poster component."],
    libraryRequests: [
      {
        action: "rollback", profile_id: "history", revision: 2,
        asset_path: undefined,
      },
      {
        action: "put_asset", profile_id: "history", revision: undefined,
        asset_path: "assets/user/frame.png",
      },
      {
        action: "delete_asset", profile_id: "history", revision: undefined,
        asset_path: "assets/user/frame.png",
      },
    ],
    undoDepth: 7,
    redoDepth: 0,
  });
});

test("editor workflow creates, autosaves, publishes, rolls back, packages, and supports keyboard editing", async ({
  page,
}) => {
  await openHarness(page, "?studio=1");
  const result = await page.evaluate(async () => {
    const panel = document.createElement("movie-poster-panel");
    panel._state.entry_id = "editor-workflow";
    panel._state.presentation.orientation = "portrait";
    document.body.append(panel);

    const requests = [];
    let sequence = 0;
    const library = { profiles: {} };
    const documentFor = (name, blank) => ({
      version: 2,
      name,
      description: "",
      author: "",
      presentation: { ...panel._state.presentation },
      design: {
        schema_version: 2,
        resources: {
          frame: { id: "builtin.frame.marquee", version: 1 },
          theme: { id: "builtin.theme.classic", version: 1 },
          layout: { id: "builtin.layout.blank", version: 1 },
        },
        viewport: { fit: "contain", link_orientations: true },
        components: blank ? [] : [
          panel._defaultEditorComponent("poster", "poster"),
          panel._defaultEditorComponent("title", "title"),
        ],
        motion: { preset: "none", speed: 1, intensity: 0, stagger: 0 },
      },
    });
    panel._callLibrary = async (action, fields = {}) => {
      requests.push({ action, ...fields });
      if (action === "create") {
        const profileId = `profile-${++sequence}`;
        library.profiles[profileId] = {
          active_revision: null,
          draft: documentFor(fields.name, fields.blank),
          published: [],
          assets: {},
        };
        return { profile_id: profileId, library };
      }
      if (action === "update") {
        library.profiles[fields.profile_id].draft =
          structuredClone(fields.document);
        return { library };
      }
      if (action === "publish") {
        const item = library.profiles[fields.profile_id];
        const revision = item.published.length + 1;
        item.published.push({
          revision,
          profile: structuredClone(item.draft),
        });
        item.active_revision = revision;
        item.draft = null;
        return { revision, library };
      }
      if (action === "rollback") {
        library.profiles[fields.profile_id].active_revision = fields.revision;
        return { library };
      }
      if (action === "export") {
        return { package: btoa("movieposter") };
      }
      if (action === "import") {
        const profileId = `profile-${++sequence}`;
        library.profiles[profileId] = {
          active_revision: null,
          draft: documentFor("Imported", false),
          published: [],
          assets: {},
        };
        return { profile_id: profileId, library };
      }
      throw new Error(`Unexpected library action: ${action}`);
    };

    const prompts = ["Customized", "Blank"];
    window.prompt = () => prompts.shift();
    await panel._editorAction("new-preset");
    const customizedId = panel._editorProfileId;
    const customizedComponentCount =
      panel._editorDocument.design.components.length;

    panel._editorSelectedId = "title";
    panel._editorSelectedIds = ["title"];
    panel._editorDocument.design.components.find(
      (component) => component.id === "title",
    ).style = {
      text_color: "#777777",
      background_color: "#808080",
    };
    panel._editorSettingsOpenId = "title";
    panel._render();
    const override = panel.shadowRoot.querySelector(
      "[data-editor-orientation-override]",
    );
    override.checked = true;
    override.dispatchEvent(new Event("change", { bubbles: true }));
    const linkedOverride = structuredClone(
      panel._selectedEditorComponent().orientation_overrides.portrait.bounds,
    );
    const warnings = panel._editorWarnings();

    panel._handleEditorKeydown(new KeyboardEvent("keydown", {
      key: "d", ctrlKey: true,
    }));
    const duplicateId = panel._editorSelectedId;
    panel._handleEditorKeydown(new KeyboardEvent("keydown", {
      key: "Delete",
    }));
    const deletedWithKeyboard = !panel._editorDocument.design.components.some(
      (component) => component.id === duplicateId,
    );

    await panel._flushEditorSave();
    await panel._editorAction("publish");
    const closedAfterPublish = panel._editorDocument === null;

    panel._presentationLibrary = library;
    panel._render();
    const originalCreateObjectUrl = URL.createObjectURL;
    const originalRevokeObjectUrl = URL.revokeObjectURL;
    const originalClick = HTMLAnchorElement.prototype.click;
    let downloadClicks = 0;
    URL.createObjectURL = () => "blob:movieposter";
    URL.revokeObjectURL = () => {};
    HTMLAnchorElement.prototype.click = function click() {
      downloadClicks += 1;
    };
    panel.shadowRoot.querySelector("[data-editor-library-select]").value =
      customizedId;
    await panel._editorAction("export-package");
    URL.createObjectURL = originalCreateObjectUrl;
    URL.revokeObjectURL = originalRevokeObjectUrl;
    HTMLAnchorElement.prototype.click = originalClick;

    const published = library.profiles[customizedId].published[0].profile;
    library.profiles[customizedId].draft = structuredClone(published);
    panel._openEditor(customizedId, library);
    panel._presentationLibrary.profiles[customizedId].published.push({
      revision: 2,
      profile: structuredClone(published),
    });
    panel._render();
    panel.shadowRoot.querySelector("[data-editor-revision]").value = "1";
    await panel._editorAction("rollback");

    await panel._importPresentationPackage(new File(
      [new TextEncoder().encode("movieposter")],
      "shared.movieposter",
      { type: "application/zip" },
    ));
    const importedName = panel._editorDocument.name;
    await panel._editorAction("close");
    await panel._editorAction("new-blank");

    clearTimeout(panel._editorSaveTimer);
    return {
      customizedComponentCount,
      linkedOverride,
      contrastWarning: warnings.includes(
        "title text contrast is below 4.5:1.",
      ),
      duplicateId,
      deletedWithKeyboard,
      closedAfterPublish,
      publishedRevision: library.profiles[customizedId].active_revision,
      downloadClicks,
      importedName,
      blankComponentCount: panel._editorDocument.design.components.length,
      createModes: requests.filter((request) => request.action === "create")
        .map((request) => request.blank),
      actions: requests.map((request) => request.action),
    };
  });
  expect(result).toMatchObject({
    customizedComponentCount: 2,
    linkedOverride: { x: 30, y: 30, width: 40, height: 12 },
    contrastWarning: true,
    duplicateId: "title-copy",
    deletedWithKeyboard: true,
    closedAfterPublish: true,
    publishedRevision: 1,
    downloadClicks: 1,
    importedName: "Imported",
    blankComponentCount: 0,
    createModes: [false, true],
  });
  expect(result.actions).toEqual([
    "create",
    "update",
    "update",
    "publish",
    "export",
    "rollback",
    "import",
    "create",
  ]);
});

test("Cyber Noir themes recolor its powered system without changing its frame", async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 1080, height: 1920 });
  await openHarness(page);
  const materials = [];
  for (const theme of THEMES) {
    expect(await renderPoster(
      page, "cyber_noir", theme, "cinematic", "portrait",
    )).toEqual([]);
    materials.push(await page.evaluate((selectedTheme) => {
      const root = document.querySelector("movie-poster-panel").shadowRoot;
      const frame = root.querySelector(".marquee-frame");
      const heading = root.querySelector("h1");
      const poster = root.querySelector(".poster");
      const overlay = getComputedStyle(frame, "::after");
      const poweredRail = getComputedStyle(frame, "::before");
      return {
        theme: selectedTheme,
        cyan: getComputedStyle(frame).getPropertyValue("--cyber-cyan").trim(),
        overlayImage: overlay.backgroundImage,
        overlaySize: overlay.backgroundSize,
        railAnimation: poweredRail.animationName,
        railGlow: poweredRail.filter,
        frameBorder: getComputedStyle(frame).borderTopWidth,
        frameRadius: getComputedStyle(frame).borderTopLeftRadius,
        headingColor: getComputedStyle(heading).color,
        headingShadow: getComputedStyle(heading).textShadow,
        posterBorder: getComputedStyle(poster).borderTopColor,
        posterRadius: getComputedStyle(poster).borderTopLeftRadius,
      };
    }, theme));
  }
  expect(materials.map(({ cyan }) => cyan)).toEqual([
    "#f6cf70", "#d8c17c", "#29f2ff", "#f2f2f2", "#fff",
  ]);
  expect(new Set(materials.map(({ headingColor }) => headingColor)).size).toBe(5);
  expect(new Set(materials.map(({ posterBorder }) => posterBorder)).size).toBe(5);
  for (const material of materials) {
    expect(material.overlayImage).toContain("cyber-noir-frame-portrait.png");
    expect(material.overlaySize).toBe("100% 100%");
    expect(material.railAnimation).toBe("none");
    expect(material.railGlow).toContain("drop-shadow");
    expect(material.frameBorder).toBe("0px");
    expect(material.frameRadius).toBe("0px");
    expect(material.headingShadow).not.toBe("none");
    expect(material.posterBorder).not.toBe("rgba(0, 0, 0, 0)");
    expect(material.posterRadius).toBe("0px");
  }
  if (testInfo.project.name === "chromium") {
    expect(await renderPoster(
      page, "cyber_noir", "classic", "cinematic", "portrait",
      { enableMotion: true },
    )).toEqual([]);
    const poweredAnimation = await page.evaluate(() => {
      const root = document.querySelector("movie-poster-panel").shadowRoot;
      return {
        rail: getComputedStyle(
          root.querySelector(".marquee-frame"), "::before",
        ).animationName,
        fixtures: getComputedStyle(
          root.querySelector(".cyber-frame-lights"),
        ).animationName,
      };
    });
    expect(poweredAnimation.rail).toBe("cyberChase, cyberPulse");
    expect(poweredAnimation.fixtures).toBe("cyberRegisteredPulse");
  } else {
    const styleText = await page.evaluate(() =>
      document.querySelector("movie-poster-panel").shadowRoot
        .querySelector("style").textContent);
    expect(styleText).toContain("@keyframes cyberChase");
    expect(styleText).toContain("@keyframes cyberPulse");
    expect(styleText).toContain("@keyframes cyberRegisteredPulse");
  }
});

test("display resubscribes after a presentation revision changes", async ({ page }) => {
  await openHarness(page);
  const initial = await page.evaluate(() => {
    const subscriptions = [];
    let unsubscribeCount = 0;
    const panel = document.createElement("movie-poster-panel");
    document.body.append(panel);
    panel.hass = {
      connection: {
        subscribeMessage: (callback, request) => {
          subscriptions.push({ callback, request });
          return Promise.resolve(() => { unsubscribeCount += 1; });
        },
      },
    };
    window.__subscriptionTest = {
      subscriptions,
      unsubscribeCount: () => unsubscribeCount,
    };
    return {
      count: subscriptions.length,
      request: subscriptions[0]?.request,
    };
  });
  expect(initial.count).toBe(1);
  expect(initial.request).toEqual({
    type: "movie_poster/subscribe",
    profile_id: "default",
  });

  await page.evaluate(async () => {
    const { subscriptions } = window.__subscriptionTest;
    const state = (revision) => ({
      ...window.studioStateForTest(),
      presentation_revision: revision,
    });
    subscriptions[0].callback(state(1));
    await new Promise((resolve) => requestAnimationFrame(resolve));
    subscriptions[0].callback(state(2));
  });
  await expect.poll(() => page.evaluate(() =>
    window.__subscriptionTest.subscriptions.length), { timeout: 4_000 }).toBe(2);
  expect(await page.evaluate(() =>
    window.__subscriptionTest.unsubscribeCount())).toBe(1);
});

test("Display Studio preserves subscribed Frame motion in its sample preview", async ({ page }) => {
  await openHarness(page, "?studio=1&renderer=declarative");
  const result = await page.evaluate(async () => {
    const subscriptions = [];
    const panel = document.createElement("movie-poster-panel");
    document.body.append(panel);
    panel.hass = {
      connection: {
        subscribeMessage: (callback) => {
          subscriptions.push(callback);
          return Promise.resolve(() => {});
        },
      },
      callWS: async (request) => request.type === "movie_poster/get_settings"
        ? {
          settings: { profile_id: "default", player_id: "", user_id: "" },
          choices: { players: [], users: [], player_ids_by_user: {} },
          profiles: {},
          presentation_catalog: { frames: {} },
        }
        : { library: { profiles: {} }, catalog: { frames: {} } },
    };
    subscriptions[0]({
      ...window.studioStateForTest(),
      presentation: {
        ...window.studioStateForTest().presentation,
        frame_theme: "theater_classic",
        orientation: "portrait",
        enable_motion: true,
      },
      design_frame: {
        id: "builtin.frame.theater_classic",
        version: 1,
        layers: [],
        safe_opening: {},
        layout_tuning: {},
        motion: {
          preset: "theater_sconce", speed: 0.55,
          intensity: 0.65, light_count: 4,
        },
      },
    });
    await new Promise((resolve) => requestAnimationFrame(resolve));
    const theater = panel.shadowRoot.querySelector(".theater");
    return {
      motionClass: [...theater.classList].find((name) =>
        name.startsWith("frame-motion-")),
      lightCount: panel.shadowRoot.querySelectorAll(".theater-sconce").length,
    };
  });
  expect(result).toEqual({
    motionClass: "frame-motion-theater_sconce",
    lightCount: 4,
  });
});

test("Display Studio previews the selected Frame artwork and motion before saving", async ({ page }) => {
  await openHarness(page, "?studio=1");
  const result = await page.evaluate(async () => {
    const layer = (id, asset) => ({
      id,
      name: id,
      slot: "bezel",
      asset: {
        portrait: `${asset}-portrait.png`,
        landscape: `${asset}-landscape.png`,
      },
      z_index: 80,
      locked: true,
      opacity: 1,
      blend_mode: "normal",
    });
    const theaterLayer = layer("theater_bezel", "/theater-frame");
    const cyberLayer = layer("cyber_bezel", "/cyber-frame");
    const panel = document.createElement("movie-poster-panel");
    document.body.append(panel);
    panel._state = {
      ...window.studioStateForTest(),
      presentation: {
        ...window.studioStateForTest().presentation,
        frame_theme: "theater_classic",
        orientation: "portrait",
        enable_motion: true,
      },
      design_frame: {
        id: "builtin.frame.theater_classic",
        version: 1,
        layers: [theaterLayer],
        motion: {
          preset: "theater_sconce", speed: 0.55,
          intensity: 0.65, light_count: 4,
        },
      },
    };
    panel._presentationCatalog = {
      frames: {
        theater_classic: {
          id: "builtin.frame.theater_classic",
          layers: [theaterLayer],
          safe_opening: {
            portrait: { x: 18, y: 15, width: 64, height: 70 },
          },
          layout_tuning: { poster_share: 44, gap: 1.2 },
          motion: {
            preset: "theater_sconce", speed: 0.55,
            intensity: 0.65, light_count: 4,
          },
        },
        cyber_noir: {
          id: "builtin.frame.cyber_noir",
          layers: [cyberLayer],
          safe_opening: {
            portrait: { x: 20, y: 17, width: 60, height: 66 },
          },
          layout_tuning: { poster_share: 41, gap: 1.6 },
          motion: {
            preset: "cyber_scan", speed: 0.9,
            intensity: 0.8, light_count: 3,
          },
        },
      },
    };
    const initial = panel._resolvedFrameResource();
    // This is the local state mutation performed by the Studio Frame select;
    // design_frame intentionally remains the last server-saved snapshot.
    panel._state.presentation.frame_theme = "cyber_noir";
    const selected = panel._resolvedFrameResource();
    const selectedMotion = panel._resolvedFrameMotion();
    return {
      initialId: initial.id,
      initialAsset: initial.layers[0].asset.portrait,
      selectedId: selected.id,
      selectedAsset: panel._resolvedFrameLayers()[0].asset.portrait,
      selectedMotion: selectedMotion.preset,
      selectedSafeOpening: selected.safe_opening.portrait,
      selectedLayoutTuning: selected.layout_tuning,
      selectedMarkup: panel._frameCompositeMarkup(),
      cyberMotion: panel._frameMotionMarkup(
        selectedMotion.preset,
        selectedMotion.light_count,
      ).includes("cyber-motion"),
    };
  });
  expect(result).toEqual({
    initialId: "builtin.frame.theater_classic",
    initialAsset: "/theater-frame-portrait.png",
    selectedId: "builtin.frame.cyber_noir",
    selectedAsset: "/cyber-frame-portrait.png",
    selectedMotion: "cyber_scan",
    selectedSafeOpening: { x: 20, y: 17, width: 60, height: 66 },
    selectedLayoutTuning: { poster_share: 41, gap: 1.6 },
    cyberMotion: true,
    selectedMarkup: expect.stringContaining(
      'src="/cyber-frame-portrait.png"',
    ),
  });
  expect(result.selectedMarkup).not.toContain("cyber-frame-landscape.png");
  expect(result.selectedMarkup).not.toContain("<source");
});

test("Display Studio saves edited behavior and presentation settings", async ({ page }) => {
  await openHarness(page, "?studio=1");
  await page.evaluate(() => {
    const calls = [];
    const panel = document.createElement("movie-poster-panel");
    panel._state.entry_id = "studio-entry";
    panel._settings = {
      profile_id: "default",
      source: "Movies::Coming Soon",
      player_id: "",
      user_id: "",
      grace_seconds: 30,
      rotation_seconds: 60,
      library_refresh_seconds: 900,
    };
    panel._choices = {
      profiles: [{ value: "default", label: "Default" }],
      sources: [{ value: "Movies::Coming Soon", label: "Movies — Coming Soon" }],
      players: [{ value: "", label: "Any active Plex player" }],
      users: [{ value: "", label: "Any active Plex user" }],
      owner_user_id: "",
      player_ids_by_user: {},
    };
    panel._hass = {
      callWS: async (request) => {
        calls.push(request);
        return {};
      },
    };
    panel._returnToSettings = () => { window.__studioReturned = true; };
    window.__studioCalls = calls;
    document.body.append(panel);
    panel._render();
  });

  const root = page.locator("movie-poster-panel");
  await root.evaluate((panel) => {
    const field = panel.shadowRoot.querySelector('[data-setting="rotation_seconds"]');
    field.value = "45";
    field.dispatchEvent(new Event("change", { bubbles: true }));
    const theme = panel.shadowRoot.querySelector('[data-studio="theme"]');
    theme.value = "neon";
    theme.dispatchEvent(new Event("change", { bubbles: true }));
    for (const name of ["show_title", "show_rating", "show_progress"]) {
      const control = panel.shadowRoot.querySelector(`[data-studio="${name}"]`);
      control.checked = false;
      control.dispatchEvent(new Event("change", { bubbles: true }));
    }
    panel.shadowRoot.querySelector('[data-studio-action="save"]').click();
  });

  await expect.poll(() => page.evaluate(() => window.__studioCalls.length)).toBe(1);
  const request = await page.evaluate(() => window.__studioCalls[0]);
  expect(request).toMatchObject({
    type: "movie_poster/update_settings",
    entry_id: "studio-entry",
    profile_id: "default",
    source: "Movies::Coming Soon",
    rotation_seconds: 45,
    theme: "neon",
    show_title: false,
    show_rating: false,
    show_progress: false,
  });
  await expect.poll(() => root.evaluate((panel) =>
    panel.shadowRoot.querySelector(".studio-status").textContent))
    .toContain("Saved.");
  await expect.poll(() => page.evaluate(() => window.__studioReturned)).toBe(true);
});

test("movie detail controls apply consistently to every frame", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 720 });
  await openHarness(page);
  for (const frame of FRAMES) {
    expect(await renderPoster(
      page, frame, "classic", "cinematic", "landscape",
    )).toEqual([]);
    const visible = await page.evaluate(() => {
      const root = document.querySelector("movie-poster-panel").shadowRoot;
      return {
        title: root.querySelector(".details h2")?.textContent,
        subtitle: root.querySelector(".details .subtitle")?.textContent,
        meta: root.querySelector(".details .meta")?.textContent,
      };
    });
    expect(visible.title).toContain("Pirates of the Caribbean");
    expect(visible.subtitle).toContain("Every night");
    expect(visible.meta).toContain("2026");
    expect(visible.meta).toContain("PG-13");
    expect(visible.meta).toContain("2h");

    expect(await renderPoster(
      page, frame, "classic", "cinematic", "landscape", {
        showTitle: false,
        showSubtitle: false,
        showYear: false,
        showRating: false,
        showRuntime: false,
      },
    )).toEqual([]);
    const hidden = await page.evaluate(() => {
      const root = document.querySelector("movie-poster-panel").shadowRoot;
      return {
        title: root.querySelector(".details h2"),
        subtitle: root.querySelector(".details .subtitle"),
        meta: root.querySelector(".details .meta"),
      };
    });
    expect(hidden).toEqual({ title: null, subtitle: null, meta: null });
  }
});

test("long movie titles fit two lines before truncating at a safe minimum", async ({ page }) => {
  await page.setViewportSize({ width: 768, height: 1024 });
  await openHarness(page);
  expect(await renderPoster(
    page, "theater_classic", "classic", "cinematic", "landscape", {
      title: "The Impossibly Long Motion Picture Title ".repeat(12),
    },
  )).toEqual([]);
  const fit = await page.evaluate(() => {
    const root = document.querySelector("movie-poster-panel").shadowRoot;
    const title = root.querySelector(".details h2");
    const style = getComputedStyle(title);
    const lineHeight = parseFloat(style.lineHeight)
      || parseFloat(style.fontSize) * 1.05;
    return {
      lines: title.clientHeight / lineHeight,
      fontSize: parseFloat(style.fontSize),
      minimum: parseFloat(title.style.getPropertyValue("--title-min-size")),
      truncated: title.classList.contains("title-truncated"),
    };
  });
  expect(fit.lines).toBeLessThanOrEqual(2.05);
  // Browser engines round computed font sizes to different sub-pixel
  // precision. A hundredth of a pixel still enforces the authored floor.
  expect(fit.fontSize + 0.01).toBeGreaterThanOrEqual(fit.minimum);
  expect(fit.truncated).toBe(true);
});

for (const frame of FRAMES) {
  test(`${frame} renders its declarative practical-light motion`, async ({ page }) => {
    const [preset, lightCount, lightSelector, sceneClass] = FRAME_MOTIONS[frame];
    await page.setViewportSize({ width: 1280, height: 720 });
    await openHarness(page, "?renderer=declarative");
    await renderPoster(
      page, frame, "neon", "cinematic", "landscape",
      {
        enableMotion: true,
        frameMotion: {
          preset, light_count: lightCount, speed: 1, intensity: 0.8,
        },
      },
    );
    const result = await page.evaluate(({ selector, expectedScene }) => {
      const root = document.querySelector("movie-poster-panel").shadowRoot;
      const theater = root.querySelector(".theater");
      const lights = root.querySelectorAll(selector);
      return {
        className: [...theater.classList].find((name) =>
          name.startsWith("frame-motion-")),
        scenePresent: Boolean(root.querySelector(`.${expectedScene}`)),
        lightCount: lights.length,
        animationName: lights.length
          ? getComputedStyle(lights[0]).animationName : "none",
      };
    }, { selector: lightSelector, expectedScene: sceneClass });
    expect(result.className).toBe(`frame-motion-${preset}`);
    expect(result.scenePresent).toBe(true);
    expect(result.lightCount).toBeGreaterThan(0);
    expect(result.animationName).not.toMatch(/^none$/);
  });
}

test("display remains semantic, keyboard accessible, and reduced-motion safe", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await openHarness(page);
  expect(await renderPoster(
    page, "marquee", "classic", "cinematic", "landscape", {
      enableMotion: true,
      frameMotion: {
        preset: "marquee_chase", light_count: 18, speed: 1, intensity: 0.8,
      },
    },
  )).toEqual([]);
  const result = await page.evaluate(async () => {
    const root = document.querySelector("movie-poster-panel").shadowRoot;
    const heading = root.querySelector("h1");
    const article = root.querySelector(".details");
    const progress = root.querySelector('[role="progressbar"]');
    const button = root.querySelector('[data-display-action="exit"]');
    root.querySelector(".theater").dispatchEvent(new PointerEvent("pointermove", {
      bubbles: true,
    }));
    button.focus();
    await new Promise((resolve) => requestAnimationFrame(() =>
      requestAnimationFrame(resolve)));
    const controls = root.querySelector(".display-controls");
    const buttonStyle = getComputedStyle(button);
    const contentStyle = getComputedStyle(root.querySelector(".content"));
    const frameLightStyle = getComputedStyle(
      root.querySelector(".marquee-bulbs i"),
    );
    return {
      live: heading.getAttribute("aria-live"),
      labelled: article.getAttribute("aria-labelledby") === "movie-poster-title",
      progressLabel: progress.getAttribute("aria-label"),
      controlsVisible: getComputedStyle(controls).opacity === "1",
      focusVisible: buttonStyle.outlineStyle !== "none"
        && parseFloat(buttonStyle.outlineWidth) >= 2,
      transitionMs: parseFloat(contentStyle.transitionDuration) * 1000,
      frameLightAnimation: frameLightStyle.animationName,
    };
  });
  expect(result.live).toBe("polite");
  expect(result.labelled).toBe(true);
  expect(result.progressLabel).toBe("Playback progress");
  expect(result.controlsVisible).toBe(true);
  expect(result.focusVisible).toBe(true);
  expect(result.transitionMs).toBeLessThanOrEqual(1);
  expect(result.frameLightAnimation).toBe("none");
});

test("turning display motion off freezes declarative frame lights", async ({ page }) => {
  await openHarness(page);
  expect(await renderPoster(
    page, "marquee", "classic", "cinematic", "portrait", {
      enableMotion: false,
      frameMotion: {
        preset: "marquee_chase", light_count: 18, speed: 1, intensity: 0.8,
      },
    },
  )).toEqual([]);
  const result = await page.evaluate(() => {
    const root = document.querySelector("movie-poster-panel").shadowRoot;
    return {
      motionOff: root.querySelector(".theater").classList.contains("motion-off"),
      animationName: getComputedStyle(
        root.querySelector(".marquee-bulbs i"),
      ).animationName,
    };
  });
  expect(result).toEqual({ motionOff: true, animationName: "none" });
});

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
        for (const child of studio.querySelectorAll(":scope > *")) {
          if (child.getClientRects().length === 0) continue;
          const box = child.getBoundingClientRect();
          if (box.left < studioBox.left - 1 || box.right > studioBox.right + 1) {
            const identity = child.className || child.tagName.toLowerCase();
            failures.push(`Studio content ${identity} overflows horizontally`);
            break;
          }
        }
        if (innerWidth > 900) {
          if (frameBox.right > studioBox.left - 8) failures.push("preview overlaps controls");
        } else if (previewBox.bottom > studioBox.top + 1) {
          failures.push("stacked preview overlaps controls");
        }
        for (const control of studio.querySelectorAll("select, input, button")) {
          if (control.getClientRects().length === 0) continue;
          const box = control.getBoundingClientRect();
          if (box.left < studioBox.left - 1 || box.right > studioBox.right + 1) {
            const identity = control.dataset.studio
              || control.dataset.setting || control.dataset.studioAction
              || control.type || control.tagName.toLowerCase();
            failures.push(`Studio control ${identity} overflows horizontally`);
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
      ...["left", "center", "right"].map((logoPosition) => ({
        name: `logo at ${logoPosition}`,
        value: { logoPosition },
      })),
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
