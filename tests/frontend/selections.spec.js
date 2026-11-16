const { test, expect } = require('@playwright/test');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const catalog = require('./presentation-catalog.json');
const fields = ['show_title', 'show_subtitle', 'show_year', 'show_rating',
  'show_runtime', 'show_summary', 'show_progress', 'show_session'];

// Spread expensive photographic frames across runners instead of putting
// most Cyber Noir cases in the same contiguous Playwright shard.
const shardCount = Number(process.env.SELECTION_MATRIX_SHARD_COUNT || 1);
const shardIndex = Number(process.env.SELECTION_MATRIX_SHARD || 0);
if (!Number.isInteger(shardCount) || shardCount < 1 || !Number.isInteger(shardIndex)
  || shardIndex < 0 || shardIndex >= shardCount) throw new Error('Invalid selection matrix shard');
let combinationIndex = 0;

// This catalog is exported from builtin_catalog(), rather than replacing the
// backend's typography and geometry with browser fallback values.
for (const frame of Object.keys(catalog.frames).filter((id) => id !== 'blank')) {
  for (const theme of Object.keys(catalog.themes).filter((id) => process.env.SELECTION_AUTO !== '1' || id === 'classic')) {
    for (const layout of Object.keys(catalog.layouts).filter((id) => id !== 'blank')) {
      for (const orientation of (process.env.SELECTION_AUTO === '1' ? ['auto-portrait', 'auto-landscape'] : ['portrait', 'landscape'])) {
        if (combinationIndex++ % shardCount !== shardIndex) continue;
        test(`all 256 selections ${frame}/${theme}/${layout}/${orientation} @selection-matrix`, async ({ page }, testInfo) => {
          test.setTimeout(180_000);
          const scale = process.env.SELECTION_4K === '1' ? 2 : 1;
          await page.setViewportSize(orientation.endsWith('portrait')
            ? { width: 1080 * scale, height: 1920 * scale } : { width: 1920 * scale, height: 1080 * scale });
          const harness = process.env.PLAYWRIGHT_FILE_MODE === '1'
            ? pathToFileURL(path.resolve(__dirname, 'harness.html')).href
            : '/tests/frontend/harness.html';
          await page.goto(harness);
          const result = await page.evaluate(async ({ catalog, fields, frame, theme, layout, orientation, paintEveryCase }) => {
            const panel = document.createElement('movie-poster-panel');
            document.body.append(panel);
            const sample = {
              ...window.studioStateForTest(),
              mode: 'now_playing', heading: 'Now Playing',
              media: {
                key: 'movie', type: 'movie', title: 'Mission: Impossible III',
                subtitle: 'The mission begins.',
                summary: 'Ethan Hunt comes face to face with a dangerous arms dealer while trying to protect the people he loves.',
                year: 2006, content_rating: 'PG-13', duration_ms: 7200000,
                position_ms: 1800000, backdrop_url: null,
                poster_url: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='600' height='900'%3E%3Crect width='600' height='900' fill='%23321b16'/%3E%3C/svg%3E",
              },
              session: { user: 'Movie Fan', player: 'Home Theater', state: 'playing' },
            };
            const frameResource = catalog.frames[frame];
            const themeResource = catalog.themes[theme];
            const failures = [];
            const contains = (outer, inner) => inner.width > 0 && inner.height > 0
              && inner.top >= outer.top - 1 && inner.bottom <= outer.bottom + 1
              && inner.left >= outer.left - 1 && inner.right <= outer.right + 1;
            for (let mask = 0; mask < 256; mask++) {
              const selection = Object.fromEntries(fields.map((field, index) => [field, Boolean(mask & (1 << index))]));
              const presentation = { ...sample.presentation, ...selection,
                theme, frame_theme: frame, layout, orientation, kiosk_mode: false,
                enable_motion: false };
              const override = catalog.frame_layout_overrides[`${frame}:${layout}`];
              const components = structuredClone(override?.components || catalog.layouts[layout].components);
              const visibility = { title: selection.show_title, subtitle: selection.show_subtitle,
                year: selection.show_year, content_rating: selection.show_rating,
                runtime: selection.show_runtime, summary: selection.show_summary,
                progress: selection.show_progress, active_user: selection.show_session,
                player_name: selection.show_session, session_separator: selection.show_session,
                logo: false, metadata_surface: mask !== 0 };
              for (const component of components) {
                if (Object.hasOwn(visibility, component.id)) component.visible = visibility[component.id];
              }
              const state = { ...sample, presentation, presentation_revision: mask,
                design: { schema_version: catalog.schema_version, components,
                  resources: { frame: { id: frameResource.id }, theme: { id: themeResource.id },
                    layout: { id: catalog.layouts[layout].id } } },
                design_frame: frameResource,
                design_style: { colors: themeResource.tokens, typography: themeResource.typography,
                  effects: themeResource.effects },
              };
              await panel._applyState(state);
              await document.fonts.ready;
              // Every mask forces layout through the real renderer below.
              // Batch raster paints; repainting a complete photographic
              // bezel 256 times does not strengthen the geometry/alpha checks.
              if (paintEveryCase || mask % 16 === 0 || mask === 255) {
                await new Promise((resolve) => requestAnimationFrame(resolve));
              }
              const root = panel.shadowRoot;
              panel._layoutMarqueeBulbs(root.querySelector('.marquee-frame'));
              const details = root.querySelector('.details');
              const stage = root.querySelector('.frame-stage').getBoundingClientRect();
              const viewport = { top: 0, left: 0, right: innerWidth, bottom: innerHeight };
              const problems = [];
              const frameBox = root.querySelector('.marquee-frame').getBoundingClientRect();
              const resolvedOrientation = orientation === 'auto'
                ? (innerHeight > innerWidth ? 'portrait' : 'landscape') : orientation;
              const expectedOpening = frameResource.safe_opening[resolvedOrientation];
              const actualOpening = { x: (stage.left - frameBox.left) / frameBox.width * 100,
                y: (stage.top - frameBox.top) / frameBox.height * 100,
                width: stage.width / frameBox.width * 100, height: stage.height / frameBox.height * 100 };
              if (Object.keys(expectedOpening).some((key) => Math.abs(expectedOpening[key] - actualOpening[key]) > .1)) {
                problems.push('backend safe area was not applied to the live display');
              }
              const inline = root.querySelector('.theater').style;
              if (inline.getPropertyValue('--heading-font') !== themeResource.typography.heading) {
                problems.push('backend typography was not applied to the live display');
              }
              for (const [field, selector] of [
                ['show_title', 'h2'], ['show_subtitle', '.subtitle'],
                ['show_summary', '.summary'], ['show_progress', '.progress'], ['show_session', '.session'],
              ]) {
                const element = details.querySelector(selector);
                if (!selection[field]) {
                  if (element) problems.push(`${field} present while disabled`);
                  continue;
                }
                if (!element) { problems.push(`${field} absent`); continue; }
                const box = element.getBoundingClientRect();
                if (getComputedStyle(element).display === 'none' || !contains(details.getBoundingClientRect(), box)
                  || !contains(stage, box) || !contains(viewport, box)) problems.push(`${field} hidden or clipped`);
              }
              const meta = details.querySelector('.meta');
              for (const [field, value] of [['show_year', '2006'], ['show_rating', 'PG-13'], ['show_runtime', '2h']]) {
                if ((meta?.textContent.includes(value) || false) !== selection[field]) problems.push(`${field} incorrect`);
                if (selection[field] && (!contains(details.getBoundingClientRect(), meta.getBoundingClientRect())
                  || !contains(stage, meta.getBoundingClientRect()) || !contains(viewport, meta.getBoundingClientRect()))) problems.push(`${field} clipped`);
              }
              if (mask && details.scrollHeight > details.clientHeight + 1) problems.push('metadata content clipped');
              if (problems.length) failures.push({ mask, selection, problems,
                geometry: failures.length ? undefined : { details: details.getBoundingClientRect().toJSON(), stage: stage.toJSON(),
                  content: root.querySelector('.content').getBoundingClientRect().toJSON(),
                  poster: root.querySelector('.poster').getBoundingClientRect().toJSON() } });
            }
            return { cases: 256, failures };
          }, { catalog, fields, frame, theme, layout, orientation: orientation.startsWith('auto-') ? 'auto' : orientation, paintEveryCase: process.env.SELECTION_PAINT_EVERY_CASE === '1' });
          if (result.failures.length) await testInfo.attach('selection-failures', {
            body: JSON.stringify(result, null, 2), contentType: 'application/json',
          });
          if (result.failures.length || process.env.SELECTION_SCREENSHOTS === '1') await page.screenshot({ path: testInfo.outputPath('live-display.png') });
          expect({ failedCases: result.failures.length, firstFailures: result.failures.slice(0, 3) }).toEqual({ failedCases: 0, firstFailures: [] });
        });
      }
    }
  }
}
