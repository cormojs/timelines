const test = require('node:test');
const assert = require('node:assert');

test('colorToHex normalizes supported CSS color input for color controls', async () => {
  const { colorToHex } = await import('../src/utils/colorUtils.ts');

  assert.strictEqual(colorToHex('#AbC'), '#aabbcc');
  assert.strictEqual(colorToHex('#123456'), '#123456');
  assert.strictEqual(colorToHex('rgb(300, 1.4, -1)'), '#ff0100');
  assert.strictEqual(colorToHex('rgba(12, 34, 56, 0.5)'), '#0c2238');
  assert.strictEqual(colorToHex('blue'), null);
});

test('color helpers preserve their existing fallback and blending behavior', async () => {
  const { blendColors, normalizeColor, withAlpha } = await import('../src/utils/colorUtils.ts');

  assert.strictEqual(withAlpha('#abc', 0.5), 'rgba(170, 187, 204, 0.5)');
  assert.strictEqual(blendColors('#000000', '#ffffff'), '#808080');
  assert.strictEqual(normalizeColor(' #12 34 56 '), '#123456');
  assert.strictEqual(normalizeColor('#abc'), '#808080');
});
