const { test, expect } = require('@playwright/test');
const fs = require('node:fs');
const path = require('node:path');
const catalog = require('./presentation-catalog.json');

for (const [id, frame] of Object.entries(catalog.frames)) {
  if (id === 'blank') continue;
  for (const orientation of ['portrait', 'landscape']) {
    test(`${id}/${orientation} safe area clears every opaque artwork pixel`, async ({ page }) => {
      const asset = frame.layers.find((layer) => layer.slot === 'bezel').asset[orientation];
      const filename = path.resolve(__dirname, '../../custom_components/movie_poster/frontend',
        asset.replace('/movie_poster_static/', ''));
      const imageData = `data:image/png;base64,${fs.readFileSync(filename).toString('base64')}`;
      const result = await page.evaluate(async ({ imageData, bounds }) => {
        const image = new Image();
        image.src = imageData;
        await image.decode();
        const canvas = document.createElement('canvas');
        canvas.width = image.width;
        canvas.height = image.height;
        const context = canvas.getContext('2d');
        context.drawImage(image, 0, 0);
        const left = Math.floor(bounds.x / 100 * image.width);
        const top = Math.floor(bounds.y / 100 * image.height);
        const right = Math.ceil((bounds.x + bounds.width) / 100 * image.width);
        const bottom = Math.ceil((bounds.y + bounds.height) / 100 * image.height);
        const pixels = context.getImageData(left, top, right - left, bottom - top).data;
        let covered = 0;
        for (let index = 3; index < pixels.length; index += 4) if (pixels[index] > 8) covered++;
        return covered;
      }, { imageData, bounds: frame.safe_opening[orientation] });
      expect(result, 'Opaque frame pixels must not cover the content safe area').toBe(0);
    });
  }
}
