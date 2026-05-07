const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const source = fs.readFileSync(path.join(__dirname, '..', 'pages', 'index.vue'), 'utf8');

test('chef workbench trend bar precomputes style for uni-app template', () => {
  assert.doesNotMatch(source, /:style="getTrendStyle\(item\)"/);
  assert.match(source, /:style="item\._barStyle"/);
});
