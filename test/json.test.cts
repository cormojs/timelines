const test = require('node:test');
const assert = require('node:assert/strict');
const { parseAppSettingsJson, parseTimelineJson, parseTimelinePackageManifestJson } = require('../src/utils/json.ts');

test('parseTimelineJson preserves unknown timeline fields while requiring elements', () => {
  const timeline = parseTimelineJson(JSON.stringify({ elements: [], file: { title: 'Example' }, futureField: true }));

  assert.equal(timeline.futureField, true);
  assert.equal(timeline.file?.title, 'Example');
  assert.throws(() => parseTimelineJson(JSON.stringify({ file: {} })));
});

test('JSON schemas reject invalid settings and package manifests', () => {
  assert.throws(() => parseAppSettingsJson(JSON.stringify({ startMaximized: 'yes' })));
  assert.throws(() => parseTimelinePackageManifestJson(JSON.stringify({ format: 'other', version: 1 })));
});
