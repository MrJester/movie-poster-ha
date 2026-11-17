const { test, expect } = require('@playwright/test');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const catalog = require('./presentation-catalog.json');

async function open(page, { orientation = 'landscape', layout = 'cinematic', info = true, motion = true } = {}) {
  await page.setViewportSize(orientation === 'landscape'
    ? { width: 1280, height: 720 } : { width: 720, height: 1280 });
  await page.clock.install({ time: '2026-01-01T00:00:00Z' });
  await page.goto(process.env.PLAYWRIGHT_FILE_MODE === '1'
    ? pathToFileURL(path.resolve(__dirname, 'harness.html')).href
    : '/tests/frontend/harness.html');
  await page.evaluate(async ({ catalog, orientation, layout, info, motion }) => {
    const panel = document.createElement('movie-poster-panel'); document.body.append(panel);
    const state = window.studioStateForTest();
    state.presentation = { ...state.presentation, frame_theme: 'marquee', orientation, layout,
      enable_motion: motion, kiosk_mode: false,
      ...Object.fromEntries(['title', 'subtitle', 'year', 'rating', 'runtime', 'summary', 'session', 'progress'].map(key => [`show_${key}`, info])) };
    state.design_frame = catalog.frames.marquee;
    state.media = { key: 'first', type: 'movie', title: 'First movie', subtitle: 'First tagline',
      year: 2026, content_rating: 'PG', duration_ms: 7200000, position_ms: 10000,
      summary: 'Movie information stays behind the velvet curtain.', poster_url: null, backdrop_url: null };
    await panel._applyState(state);
    window.changeMovie = (key, title = key) => {
      const state = structuredClone(panel._state); state.media.key = key; state.media.title = title;
      return panel._applyState(state);
    };
  }, { catalog, orientation, layout, info, motion });
  await page.clock.pauseAt('2026-01-01T01:00:00Z');
}
const curtain = page => page.locator('movie-poster-panel').locator('.marquee-curtain');

for (const orientation of ['landscape', 'portrait', 'auto']) {
  for (const layout of ['cinematic', 'poster', 'split']) {
    for (const info of [false, true]) {
      test(`Marquee curtain covers the movie, clears every bulb: ${orientation}/${layout}/info=${info}`, async ({ page }) => {
        await open(page, { orientation, layout, info });
        await expect(curtain(page)).toHaveCount(0);
        await page.evaluate(() => { window.rotation = window.changeMovie('second', 'Second movie'); });
        await expect(curtain(page)).toHaveClass(/marquee-curtain-cover/);
        const closed = await page.evaluate(async () => {
          const root = document.querySelector('movie-poster-panel').shadowRoot;
          const curtain = root.querySelector('.marquee-curtain');
          for (const animation of curtain.getAnimations({ subtree: true })) {
            animation.pause(); await animation.ready;
            animation.currentTime = Number(animation.effect.getTiming().duration);
          }
          const stage = root.querySelector('.frame-stage').getBoundingClientRect();
          const box = curtain.getBoundingClientRect();
          const left = curtain.querySelector('.curtain-left').getBoundingClientRect();
          const right = curtain.querySelector('.curtain-right').getBoundingClientRect();
          const bulbs = [...root.querySelectorAll('.marquee-bulbs i')];
          return {
            bounds: ['top', 'left', 'right', 'bottom'].map(key => Math.abs(box[key] - stage[key])),
            seam: left.right - right.left,
            coversLeft: Math.abs(left.left - box.left), coversRight: Math.abs(right.right - box.right),
            bulbCount: bulbs.length,
            bulbCovered: bulbs.some(bulb => { const b = bulb.getBoundingClientRect(); const x = b.x+b.width/2, y = b.y+b.height/2;
              return x > box.left && x < box.right && y > box.top && y < box.bottom; }),
            bulbAnimations: bulbs.every(bulb => getComputedStyle(bulb).animationName === 'bulbChase'),
            pointerEvents: getComputedStyle(curtain).pointerEvents, hidden: curtain.getAttribute('aria-hidden'),
            leaving: root.querySelector('.theater').classList.contains('media-leaving'),
          };
        });
        expect(Math.max(...closed.bounds)).toBeLessThan(1);
        expect(closed.seam).toBeGreaterThanOrEqual(2);
        expect(closed.coversLeft).toBeLessThan(1); expect(closed.coversRight).toBeLessThan(1);
        expect(closed.bulbCount).toBeGreaterThan(0);
        expect(closed.bulbCovered).toBe(false); expect(closed.bulbAnimations).toBe(true);
        expect(closed.pointerEvents).toBe('none'); expect(closed.hidden).toBe('true');
        expect(closed.leaving).toBe(false);
        await page.clock.fastForward(799);
        if (info) await expect(page.locator('movie-poster-panel').locator('.details h2')).toHaveText('First movie');
        await expect(curtain(page)).toHaveClass(/marquee-curtain-cover/);
        await page.clock.fastForward(1); await page.evaluate(() => window.rotation);
        await expect(curtain(page)).toHaveClass(/marquee-curtain-reveal/);
        if (info) await expect(page.locator('movie-poster-panel').locator('.details h2')).toHaveText('Second movie');
        const opened = await page.evaluate(async () => {
          const curtain = document.querySelector('movie-poster-panel').shadowRoot.querySelector('.marquee-curtain');
          for (const a of curtain.getAnimations({ subtree: true })) { a.pause(); await a.ready; a.currentTime = Number(a.effect.getTiming().duration); }
          const box = curtain.getBoundingClientRect();
          return { left: curtain.querySelector('.curtain-left').getBoundingClientRect().right <= box.left,
            right: curtain.querySelector('.curtain-right').getBoundingClientRect().left >= box.right,
            valance: getComputedStyle(curtain.querySelector('.marquee-curtain-valance')).opacity };
        });
        expect(opened).toEqual({ left: true, right: true, valance: '0' });
        await page.clock.fastForward(1049); await expect(curtain(page)).toHaveCount(1);
        await page.clock.fastForward(1); await expect(curtain(page)).toHaveCount(0);
        await page.evaluate(() => window.changeMovie('second', 'Updated second title'));
        await expect(curtain(page)).toHaveCount(0);
      });
    }
  }
}

for (const configuration of [{ motion: false }, { reduced: true }]) {
  test(`Marquee curtains respect motion settings: ${JSON.stringify(configuration)}`, async ({ page }) => {
    if (configuration.reduced) await page.emulateMedia({ reducedMotion: 'reduce' });
    await open(page, configuration); await page.evaluate(() => window.changeMovie('second'));
    await expect(curtain(page)).toHaveCount(0);
  });
}

for (const target of ['third', 'first']) {
  test(`Rapid Marquee rotation to ${target} cancels obsolete curtains`, async ({ page }) => {
    await open(page); await page.evaluate(() => { window.obsolete = window.changeMovie('second'); });
    await expect(curtain(page)).toHaveClass(/marquee-curtain-cover/);
    await page.clock.fastForward(200);
    await page.evaluate(target => { window.latest = window.changeMovie(target, target === 'first' ? 'First movie' : 'Third movie'); }, target);
    await page.clock.fastForward(800); await page.evaluate(() => Promise.all([window.latest, window.obsolete]));
    await expect(page.locator('movie-poster-panel').locator('.details h2')).toHaveText(target === 'first' ? 'First movie' : 'Third movie');
    await page.clock.fastForward(1050); await expect(curtain(page)).toHaveCount(0);
    await expect(page.locator('movie-poster-panel').locator('.theater')).not.toHaveClass(/media-leaving/);
  });
}
