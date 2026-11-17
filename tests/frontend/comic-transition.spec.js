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
    state.presentation = { ...state.presentation, frame_theme: 'comic_hero', orientation, layout,
      enable_motion: motion, kiosk_mode: false,
      ...Object.fromEntries(['title', 'subtitle', 'year', 'rating', 'runtime', 'summary', 'session', 'progress'].map(key => [`show_${key}`, info])) };
    state.design_frame = catalog.frames.comic_hero;
    state.media = { key: 'first', type: 'movie', title: 'First movie', subtitle: 'First tagline',
      year: 2026, content_rating: 'PG', duration_ms: 7200000, position_ms: 10000,
      summary: 'Movie information stays behind the comic panels.', poster_url: null, backdrop_url: null };
    await panel._applyState(state);
    window.changeMovie = (key, title = key) => {
      const state = structuredClone(panel._state); state.media.key = key; state.media.title = title;
      return panel._applyState(state);
    };
  }, { catalog, orientation, layout, info, motion });
  await page.clock.pauseAt('2026-01-01T01:00:00Z');
}
const wipe = page => page.locator('movie-poster-panel').locator('.comic-page-transition');

for (const orientation of ['landscape', 'portrait', 'auto']) {
  for (const layout of ['cinematic', 'poster', 'split']) {
    for (const info of [false, true]) {
      test(`Comic page panels cover the movie, preserve the frame: ${orientation}/${layout}/info=${info}`, async ({ page }) => {
        await open(page, { orientation, layout, info });
        await expect(wipe(page)).toHaveCount(0);
        await page.evaluate(() => { window.rotation = window.changeMovie('second', 'Second movie'); });
        await expect(wipe(page)).toHaveClass(/comic-page-cover/);
        const closed = await page.evaluate(async () => {
          const root = document.querySelector('movie-poster-panel').shadowRoot;
          const wipe = root.querySelector('.comic-page-transition');
          for (const animation of wipe.getAnimations({ subtree: true })) {
            animation.pause(); await animation.ready;
            animation.currentTime = Number(animation.effect.getComputedTiming().endTime);
          }
          const stage = root.querySelector('.frame-stage').getBoundingClientRect();
          const box = wipe.getBoundingClientRect();
          const panels = [...wipe.querySelectorAll('.comic-page-panel')].map(panel => panel.getBoundingClientRect());
          const lights = [...root.querySelectorAll('.comic-motion i')];
          const emblem = wipe.querySelector('.comic-page-emblem');
          const badge = emblem.getBoundingClientRect();
          return {
            bounds: ['top', 'left', 'right', 'bottom'].map(key => Math.abs(box[key] - stage[key])),
            panelCount: panels.length,
            emblemCentered: Math.abs(badge.x+badge.width/2-(box.x+box.width/2)) < 2
              && Math.abs(badge.y+badge.height/2-(box.y+box.height/2)) < 2,
            emblemFits: badge.top >= panels[1].top && badge.bottom <= panels[1].bottom,
            emblemSize: Math.min(badge.width, badge.height),
            emblemRidesPanel: emblem.parentElement.classList.contains('comic-page-blue'),
            coversWidth: panels.every(panel => panel.left < box.left && panel.right > box.right),
            coversTop: panels[0].top <= box.top, coversBottom: panels[2].bottom >= box.bottom,
            seams: [panels[0].bottom-panels[1].top, panels[1].bottom-panels[2].top],
            effectsActive: lights.length > 0 && lights.every(light => getComputedStyle(light).animationName !== 'none'),
            art: getComputedStyle(root.querySelector('.marquee-frame'), '::after').backgroundImage,
            pointerEvents: getComputedStyle(wipe).pointerEvents, hidden: wipe.getAttribute('aria-hidden'),
            leaving: root.querySelector('.theater').classList.contains('media-leaving'),
          };
        });
        expect(Math.max(...closed.bounds)).toBeLessThan(1);
        expect(closed.panelCount).toBe(3);
        expect(closed.emblemCentered).toBe(true); expect(closed.emblemFits).toBe(true);
        expect(closed.emblemSize).toBeGreaterThan(30); expect(closed.emblemRidesPanel).toBe(true);
        expect(closed.coversWidth).toBe(true); expect(closed.coversTop).toBe(true); expect(closed.coversBottom).toBe(true);
        for (const overlap of closed.seams) expect(overlap).toBeGreaterThan(2);
        expect(closed.effectsActive).toBe(true); expect(closed.art).toContain('comic-hero-frame-');
        expect(closed.pointerEvents).toBe('none'); expect(closed.hidden).toBe('true');
        expect(closed.leaving).toBe(false);
        await page.clock.fastForward(699);
        if (info) await expect(page.locator('movie-poster-panel').locator('.details h2')).toHaveText('First movie');
        await expect(wipe(page)).toHaveClass(/comic-page-cover/);
        await page.clock.fastForward(1); await page.evaluate(() => window.rotation);
        await expect(wipe(page)).toHaveClass(/comic-page-reveal/);
        if (info) await expect(page.locator('movie-poster-panel').locator('.details h2')).toHaveText('Second movie');
        const opened = await page.evaluate(async () => {
          const wipe = document.querySelector('movie-poster-panel').shadowRoot.querySelector('.comic-page-transition');
          for (const animation of wipe.getAnimations({ subtree: true })) {
            animation.pause(); await animation.ready;
            animation.currentTime = Number(animation.effect.getComputedTiming().endTime);
          }
          const box = wipe.getBoundingClientRect();
          return { clear: [...wipe.querySelectorAll('.comic-page-panel')].every(panel => panel.getBoundingClientRect().right <= box.left),
            fold: getComputedStyle(wipe.querySelector('.comic-page-fold')).opacity };
        });
        expect(opened).toEqual({ clear: true, fold: '0' });
        await page.clock.fastForward(899); await expect(wipe(page)).toHaveCount(1);
        await page.clock.fastForward(1); await expect(wipe(page)).toHaveCount(0);
        await page.evaluate(() => window.changeMovie('second', 'Updated second title'));
        await expect(wipe(page)).toHaveCount(0);
      });
    }
  }
}

for (const configuration of [{ motion: false }, { reduced: true }]) {
  test(`Comic page transitions respect motion settings: ${JSON.stringify(configuration)}`, async ({ page }) => {
    if (configuration.reduced) await page.emulateMedia({ reducedMotion: 'reduce' });
    await open(page, configuration); await page.evaluate(() => window.changeMovie('second'));
    await expect(wipe(page)).toHaveCount(0);
  });
}

for (const target of ['third', 'first']) {
  test(`Rapid Comic Hero rotation to ${target} cancels obsolete panels`, async ({ page }) => {
    await open(page); await page.evaluate(() => { window.obsolete = window.changeMovie('second'); });
    await expect(wipe(page)).toHaveClass(/comic-page-cover/);
    await page.clock.fastForward(200);
    await page.evaluate(target => { window.latest = window.changeMovie(target, target === 'first' ? 'First movie' : 'Third movie'); }, target);
    await page.clock.fastForward(700); await page.evaluate(() => Promise.all([window.latest, window.obsolete]));
    await expect(page.locator('movie-poster-panel').locator('.details h2')).toHaveText(target === 'first' ? 'First movie' : 'Third movie');
    await page.clock.fastForward(900); await expect(wipe(page)).toHaveCount(0);
    await expect(page.locator('movie-poster-panel').locator('.theater')).not.toHaveClass(/media-leaving/);
  });
}
