const { test, expect } = require('@playwright/test');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const catalog = require('./presentation-catalog.json');

async function open(page, { orientation = 'landscape', info = true, motion = true, frame = 'cyber_noir' } = {}) {
  await page.setViewportSize(orientation === 'landscape'
    ? { width: 1280, height: 720 } : { width: 720, height: 1280 });
  await page.goto(process.env.PLAYWRIGHT_FILE_MODE === '1'
    ? pathToFileURL(path.resolve(__dirname, 'harness.html')).href
    : '/tests/frontend/harness.html');
  await page.evaluate(async ({ catalog, orientation, info, motion, frame }) => {
    const panel = document.createElement('movie-poster-panel');
    document.body.append(panel);
    const state = window.studioStateForTest();
    state.presentation = { ...state.presentation, frame_theme: frame, orientation,
      enable_motion: motion, kiosk_mode: false,
      ...Object.fromEntries(['title', 'subtitle', 'year', 'rating', 'runtime', 'summary', 'session', 'progress'].map(key => [`show_${key}`, info])) };
    state.design_frame = catalog.frames[frame];
    state.media = { key: 'first', type: 'movie', title: 'First movie', subtitle: 'First tagline',
      year: 2026, content_rating: 'PG', duration_ms: 7200000, position_ms: 10000,
      summary: 'Selected movie information remains beneath the transition.', poster_url: null, backdrop_url: null };
    await panel._applyState(state);
    window.changeMovie = (key, title = key) => {
      const state = structuredClone(panel._state);
      state.media.key = key; state.media.title = title;
      return panel._applyState(state);
    };
  }, { catalog, orientation, info, motion, frame });
}
const rain = page => page.locator('movie-poster-panel').locator('.cyber-rain');

for (const orientation of ['landscape', 'portrait', 'auto']) {
  for (const info of [false, true]) {
    test(`Cyber binary waterfall covers only the inner screen: ${orientation}, info=${info}`, async ({ page }, testInfo) => {
      await open(page, { orientation, info });
      await expect(rain(page)).toHaveCount(0);
      await page.evaluate(() => { window.rotation = window.changeMovie('second', 'Second movie'); });
      await expect(rain(page)).toHaveClass(/cyber-rain-cover/);
      const details = await page.evaluate(() => {
        const root = document.querySelector('movie-poster-panel').shadowRoot;
        const rain = root.querySelector('.cyber-rain');
        const stage = root.querySelector('.frame-stage').getBoundingClientRect();
        const box = rain.getBoundingClientRect();
        return {
          bounds: ['left', 'right', 'top', 'bottom'].map(key => Math.abs(stage[key] - box[key])),
          aria: rain.getAttribute('aria-hidden'), pointerEvents: getComputedStyle(rain).pointerEvents,
          binary: [...rain.querySelectorAll('i')].every(el => /^[01\s]+$/.test(el.textContent)),
          columns: rain.querySelectorAll('i').length,
          title: root.querySelector('.details h2')?.textContent,
        };
      });
      expect(Math.max(...details.bounds)).toBeLessThan(1);
      expect(details.aria).toBe('true');
      expect(details.pointerEvents).toBe('none');
      expect(details.binary).toBe(true);
      expect(details.columns).toBe(40);
      if (info) expect(details.title).toBe('First movie');
      await page.evaluate(() => window.rotation);
      await expect(rain(page)).toHaveClass(/cyber-rain-reveal/);
      if (info) await expect(page.locator('movie-poster-panel').locator('.details h2')).toHaveText('Second movie');
      await page.screenshot({ path: testInfo.outputPath('binary-reveal.png') });
      await expect(rain(page)).toHaveCount(0, { timeout: 2500 });
      // An update to the same movie must not retrigger the waterfall.
      await page.evaluate(async () => {
        const panel = document.querySelector('movie-poster-panel');
        const state = structuredClone(panel._state); state.media.position_ms += 1000;
        await panel._applyState(state);
      });
      await expect(rain(page)).toHaveCount(0);
    });
  }
}

for (const configuration of [{ motion: false }, { reduced: true }, { frame: 'comic_hero' }]) {
  test(`Binary transitions respect motion and frame selection: ${JSON.stringify(configuration)}`, async ({ page }) => {
    if (configuration.reduced) await page.emulateMedia({ reducedMotion: 'reduce' });
    await open(page, configuration);
    await page.evaluate(() => window.changeMovie('second'));
    await expect(rain(page)).toHaveCount(0);
  });
}

for (const target of ['third', 'first']) {
  test(`A rapid movie change to ${target} cancels the obsolete waterfall`, async ({ page }) => {
    await open(page);
    await page.evaluate(() => { window.obsolete = window.changeMovie('second'); });
    await expect(rain(page)).toHaveClass(/cyber-rain-cover/);
    await page.evaluate(async target => {
      await window.changeMovie(target, target === 'first' ? 'First movie' : 'Third movie');
      await window.obsolete;
    }, target);
    await expect(page.locator('movie-poster-panel').locator('.details h2')).toHaveText(target === 'first' ? 'First movie' : 'Third movie');
    await expect(rain(page)).toHaveCount(0, { timeout: 2500 });
    await expect(page.locator('movie-poster-panel').locator('.theater')).not.toHaveClass(/media-leaving/);
  });
}

test('Cyber lamps share a slow heartbeat rather than a chase', async ({ page }) => {
  await open(page);
  const lights = await page.evaluate(() => [...document.querySelector('movie-poster-panel').shadowRoot.querySelectorAll('.cyber-fixture-glow')].map(el => {
    const css = getComputedStyle(el);
    return { duration: parseFloat(css.animationDuration), delay: css.animationDelay, name: css.animationName };
  }));
  expect(lights).toHaveLength(8);
  expect(lights.every(light => light.duration >= 8 && light.delay === '0s' && light.name === 'frameCyberFixture')).toBe(true);
});
