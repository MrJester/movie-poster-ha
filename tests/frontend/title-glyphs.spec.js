const { test, expect } = require('@playwright/test');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const catalog = require('./presentation-catalog.json');

for (const frame of Object.keys(catalog.frames).filter((id) => id !== 'blank')) {
  for (const theme of Object.keys(catalog.themes)) {
    for (const lines of [1, 2]) {
      test(`${frame}/${theme} preserves title descenders on ${lines} lines`, async ({ page }) => {
        await page.setViewportSize({ width: 1920, height: 1080 });
        await page.goto(process.env.PLAYWRIGHT_FILE_MODE === '1'
          ? pathToFileURL(path.resolve(__dirname, 'harness.html')).href
          : '/tests/frontend/harness.html');
        const clip = await page.evaluate(async ({ catalog, frame, theme, lines }) => {
          const panel = document.createElement('movie-poster-panel');
          document.body.append(panel);
          const state = window.studioStateForTest();
          state.presentation = { ...state.presentation, frame_theme: frame, theme,
            layout: 'cinematic', orientation: 'landscape', kiosk_mode: false,
            show_subtitle: false, show_year: false, show_rating: false,
            show_runtime: false, show_summary: false, show_progress: false, show_session: false };
          state.design_frame = catalog.frames[frame];
          state.design_style = { colors: catalog.themes[theme].tokens,
            typography: catalog.themes[theme].typography, effects: catalog.themes[theme].effects };
          state.media = { key: 'glyph-test', type: 'movie', title: 'Goldfinger',
            poster_url: null, backdrop_url: null };
          await panel._applyState(state);
          await document.fonts.ready;
          const title = panel.shadowRoot.querySelector('.details h2');
          // A controlled line break exercises the last line of the real clamp.
          if (lines === 2) title.innerHTML = 'Typography<br>gjpqy';
          // Compare glyph ink, excluding the intentionally clipped glow/shadow.
          title.style.textShadow = 'none';
          await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
          panel._layoutMarqueeBulbs(panel.shadowRoot.querySelector('.marquee-frame'));
          const box = title.getBoundingClientRect();
          return { x: Math.floor(box.left), y: Math.floor(box.top),
            width: Math.ceil(box.right) - Math.floor(box.left),
            height: Math.ceil(box.bottom) - Math.floor(box.top) + 12,
            bottom: Math.floor(box.bottom) - Math.floor(box.top) };
        }, { catalog, frame, theme, lines });
        const region = { x: clip.x, y: clip.y, width: clip.width, height: clip.height };
        const actual = await page.screenshot({ clip: region });
        await page.evaluate(() => document.querySelector('movie-poster-panel').shadowRoot
          .querySelector('.details h2').style.setProperty('overflow', 'visible', 'important'));
        const reference = await page.screenshot({ clip: region });
        const lostInk = await page.evaluate(async ({ actual, reference, bottom }) => {
          const decode = async (data) => {
            const image = new Image(); image.src = `data:image/png;base64,${data}`;
            await image.decode();
            const canvas = document.createElement('canvas');
            canvas.width = image.width; canvas.height = image.height;
            const context = canvas.getContext('2d'); context.drawImage(image, 0, 0);
            return { pixels: context.getImageData(0, 0, canvas.width, canvas.height).data,
              width: canvas.width, height: canvas.height };
          };
          const a = await decode(actual); const r = await decode(reference);
          let count = 0;
          for (let y = bottom; y < a.height; y++) {
            for (let x = 0; x < a.width; x++) {
              const i = (y * a.width + x) * 4;
              if (Math.max(Math.abs(r.pixels[i] - a.pixels[i]),
                Math.abs(r.pixels[i + 1] - a.pixels[i + 1]),
                Math.abs(r.pixels[i + 2] - a.pixels[i + 2])) > 24) count++;
            }
          }
          return count;
        }, { actual: actual.toString('base64'), reference: reference.toString('base64'), bottom: clip.bottom });
        expect(lostInk, 'Title ink below the line box must remain visible').toBe(0);
      });
    }
  }
}
