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
    const css = getComputedStyle(el.querySelector('.cyber-core-glow'));
    return { duration: parseFloat(css.animationDuration), delay: css.animationDelay, name: css.animationName };
  }));
  expect(lights).toHaveLength(8);
  expect(lights.every(light => light.duration >= 8 && light.delay === '0s' && light.name === 'frameCyberFixture')).toBe(true);
});

for (const orientation of ['landscape', 'portrait']) {
  test(`Every Cyber glow dims with its tube in ${orientation}`, async ({ page }, testInfo) => {
    await open(page, { orientation });
    const bounds = await page.evaluate(async orientation => {
      const panel = document.querySelector('movie-poster-panel');
      const root = panel.shadowRoot;
      // The chat preview uses the full-color photograph. Test that stricter
      // case too: desaturating the base artwork must not conceal static glow.
      const style = document.createElement('style');
      style.textContent = '.frame-cyber_noir .marquee-frame::after { filter: none !important; }';
      root.append(style);
      const art = new Image();
      art.src = `/movie_poster_static/assets/cyber-noir-frame-${orientation}.png`;
      await art.decode();
      for (const animation of root.getAnimations()) {
        if (animation.effect.target.closest('.cyber-motion')) {
          animation.pause(); await animation.ready;
        } else animation.cancel();
      }
      await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
      return root.querySelector('.marquee-frame').getBoundingClientRect().toJSON();
    }, orientation);
    const capture = async phase => {
      await page.evaluate(async phase => {
        const root = document.querySelector('movie-poster-panel').shadowRoot;
        for (const animation of root.querySelector('.cyber-motion').getAnimations({ subtree: true })) {
          animation.currentTime = Number(animation.effect.getTiming().duration) * phase;
        }
        await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
      }, phase);
      const image = await page.screenshot();
      require('node:fs').writeFileSync(testInfo.outputPath(`glow-${phase}.png`), image);
      return image.toString('base64');
    };
    const dim = await capture(.5), bright = await capture(.25);
    const glow = await page.evaluate(async ({ dim, bright, bounds, orientation }) => {
      const decode = async data => {
        const image = new Image(); image.src = `data:image/png;base64,${data}`; await image.decode();
        const canvas = document.createElement('canvas'); canvas.width = image.width; canvas.height = image.height;
        const ctx = canvas.getContext('2d'); ctx.drawImage(image, 0, 0);
        return ctx.getImageData(0, 0, canvas.width, canvas.height);
      };
      const a = await decode(dim), b = await decode(bright);
      const regions = orientation === 'landscape' ? [
        [64.4, 7.1, 13.5, 3.6], [2.2, 23.7, 3.3, 11.2],
        [94.2, 58.6, 3.4, 9.8], [23, 90.6, 11.8, 3],
      ] : [
        [19.5, 6, 12.5, 1.2], [67.4, 5.7, 12.7, 1.5],
        [87.4, 20.6, 2.4, 17.5], [87.4, 66, 1.7, 16],
        [19.8, 92.8, 12.2, 1.2], [68, 92.8, 12.2, 1.8], [8.1, 43, 2.6, 4.1],
      ];
      const visibleCyan = (data, i) => Math.min(data[i+1], data[i+2]) > 90 && Math.min(data[i+1], data[i+2]) - data[i] > 35;
      return regions.map(([x, y, w, h]) => {
        let dim = 0, bright = 0;
        for (let py = Math.max(0, Math.floor(bounds.y + bounds.height*y/100)); py < Math.min(a.height, bounds.y + bounds.height*(y+h)/100); py++) {
          for (let px = Math.max(0, Math.floor(bounds.x + bounds.width*x/100)); px < Math.min(a.width, bounds.x + bounds.width*(x+w)/100); px++) {
            const i = (py*a.width+px)*4;
            if (visibleCyan(a.data, i)) dim++;
            if (visibleCyan(b.data, i)) bright++;
          }
        }
        return { dim, bright };
      });
    }, { dim, bright, bounds, orientation });
    require('node:fs').writeFileSync(testInfo.outputPath('glow-measurements.json'), JSON.stringify({ bounds, glow }));
    for (const [index, fixture] of glow.entries()) {
      expect(fixture.bright, `Fixture ${index+1} must have a visible cyan glow`).toBeGreaterThan(20);
      expect(fixture.dim, `Fixture ${index+1} glow stays on: ${JSON.stringify(fixture)}`).toBeLessThan(fixture.bright*.1);
    }
  });
}
