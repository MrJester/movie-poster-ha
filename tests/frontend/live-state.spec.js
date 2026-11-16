const { test, expect } = require('@playwright/test');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const catalog = require('./presentation-catalog.json');

async function openLivePanel(page) {
  await page.setViewportSize({ width: 1080, height: 1920 });
  await page.goto(process.env.PLAYWRIGHT_FILE_MODE === '1'
    ? pathToFileURL(path.resolve(__dirname, 'harness.html')).href
    : '/tests/frontend/harness.html');
  await page.evaluate(async (catalog) => {
    const panel = document.createElement('movie-poster-panel');
    document.body.append(panel);
    const state = window.studioStateForTest();
    state.presentation = { ...state.presentation, frame_theme: 'theater_classic',
      orientation: 'portrait', kiosk_mode: false };
    state.media = { key: 'same-movie', type: 'movie', title: 'Mission: Impossible III',
      subtitle: null, summary: null, year: null, content_rating: null,
      duration_ms: null, position_ms: null, poster_url: null, backdrop_url: null };
    state.design_frame = catalog.frames.theater_classic;
    state.design_style = { colors: catalog.themes.classic.tokens,
      typography: catalog.themes.classic.typography, effects: catalog.themes.classic.effects };
    await panel._applyState(state);
  }, catalog);
}

test('live display renders metadata arriving later for the same movie', async ({ page }) => {
  await openLivePanel(page);
  const result = await page.evaluate(async () => {
    const panel = document.querySelector('movie-poster-panel');
    const state = structuredClone(panel._state);
    Object.assign(state.media, { subtitle: 'The mission begins.', summary: 'Ethan Hunt returns.',
      year: 2006, content_rating: 'PG-13', duration_ms: 7200000, position_ms: 1000 });
    await panel._applyState(state);
    return {
      subtitle: panel.shadowRoot.querySelector('.details .subtitle')?.textContent,
      summary: panel.shadowRoot.querySelector('.details .summary')?.textContent,
      meta: panel.shadowRoot.querySelector('.details .meta')?.textContent,
      progress: Boolean(panel.shadowRoot.querySelector('.progress')),
    };
  });
  expect(result).toMatchObject({ subtitle: 'The mission begins.', summary: 'Ethan Hunt returns.', progress: true });
  expect(result.meta).toContain('2006');
  expect(result.meta).toContain('PG-13');
  expect(result.meta).toContain('2h');
});

test('live display removes metadata that becomes unavailable without changing movie key', async ({ page }) => {
  await openLivePanel(page);
  const result = await page.evaluate(async () => {
    const panel = document.querySelector('movie-poster-panel');
    let state = structuredClone(panel._state);
    state.media.summary = 'Ethan Hunt returns.';
    state.presentation_revision++;
    await panel._applyState(state);
    state = structuredClone(panel._state);
    state.media.summary = null;
    await panel._applyState(state);
    return Boolean(panel.shadowRoot.querySelector('.details .summary'));
  });
  expect(result).toBe(false);
});

test('live display applies changed information selections without a new revision', async ({ page }) => {
  await openLivePanel(page);
  const result = await page.evaluate(async () => {
    const panel = document.querySelector('movie-poster-panel');
    const state = structuredClone(panel._state);
    state.presentation.show_title = false;
    await panel._applyState(state);
    return Boolean(panel.shadowRoot.querySelector('.details h2'));
  });
  expect(result).toBe(false);
});

test('playback position updates preserve the rendered movie', async ({ page }) => {
  await openLivePanel(page);
  const result = await page.evaluate(async () => {
    const panel = document.querySelector('movie-poster-panel');
    let state = structuredClone(panel._state);
    Object.assign(state.media, { duration_ms: 7200000, position_ms: 1000 });
    await panel._applyState(state);
    const title = panel.shadowRoot.querySelector('.details h2');
    state = structuredClone(panel._state);
    state.media.position_ms = 3600000;
    await panel._applyState(state);
    return { sameTitle: title === panel.shadowRoot.querySelector('.details h2'),
      progress: panel.shadowRoot.querySelector('.progress').getAttribute('aria-valuenow') };
  });
  expect(result).toEqual({ sameTitle: true, progress: '50' });
});
