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
        show_summary: true,
        show_progress: true,
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
      requestAnimationFrame(() => requestAnimationFrame(resolve))));

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

test("reference renderer contains the complete Marquee canvas", async ({ page }) => {
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
      enabled: theater.classList.contains("renderer-reference"),
      contained: box.left >= 0 && box.top >= 0
        && box.right <= innerWidth && box.bottom <= innerHeight,
      ratio: box.width / box.height,
    };
  });
  expect(result.enabled).toBe(true);
  expect(result.contained).toBe(true);
  expect(result.ratio).toBeCloseTo(4 / 3, 2);

  expect(await renderPoster(
    page, "cyber_noir", "classic", "cinematic", "landscape",
  )).toEqual([]);
  expect(await page.evaluate(() => document
    .querySelector("movie-poster-panel").shadowRoot
    .querySelector(".theater").classList.contains("renderer-reference")))
    .toBe(false);
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

test("visible stacked summaries match the poster width and center their text", async ({ page }) => {
  await page.setViewportSize({ width: 1080, height: 1920 });
  await openHarness(page);
  for (const orientation of ["auto", "portrait"]) {
    expect(await renderPoster(
      page, "marquee", "classic", "cinematic", orientation,
    )).toEqual([]);
    const geometry = await page.evaluate(() => {
      const root = document.querySelector("movie-poster-panel").shadowRoot;
      const poster = root.querySelector(".poster").getBoundingClientRect();
      const summary = root.querySelector(".summary");
      const summaryStyle = getComputedStyle(summary);
      const summaryBox = summary.getBoundingClientRect();
      return {
        visible: summaryStyle.display !== "none" && summaryBox.width > 0,
        widthDifference: Math.abs(poster.width - summaryBox.width),
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
  expect(fit.fontSize).toBeGreaterThanOrEqual(fit.minimum);
  expect(fit.truncated).toBe(true);
});

test("display remains semantic, keyboard accessible, and reduced-motion safe", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await openHarness(page);
  expect(await renderPoster(
    page, "marquee", "classic", "cinematic", "landscape",
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
    return {
      live: heading.getAttribute("aria-live"),
      labelled: article.getAttribute("aria-labelledby") === "movie-poster-title",
      progressLabel: progress.getAttribute("aria-label"),
      controlsVisible: getComputedStyle(controls).opacity === "1",
      focusVisible: buttonStyle.outlineStyle !== "none"
        && parseFloat(buttonStyle.outlineWidth) >= 2,
      transitionMs: parseFloat(contentStyle.transitionDuration) * 1000,
    };
  });
  expect(result.live).toBe("polite");
  expect(result.labelled).toBe(true);
  expect(result.progressLabel).toBe("Playback progress");
  expect(result.controlsVisible).toBe(true);
  expect(result.focusVisible).toBe(true);
  expect(result.transitionMs).toBeLessThanOrEqual(1);
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
