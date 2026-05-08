const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const source = fs.readFileSync(path.join(__dirname, '..', 'pages', 'index.vue'), 'utf8');

test('chef workbench trend bar precomputes style for uni-app template', () => {
  assert.doesNotMatch(source, /:style="getTrendStyle\(item\)"/);
  assert.match(source, /:style="item\._barStyle"/);
});

test('chef workbench trend renders explicit date labels with stable flex layout', () => {
  assert.match(source, /<view class="trend-label">\s*\{\{\s*item\.label\s*\|\|\s*item\.date\s*\}\}\s*<\/view>/);
  assert.match(source, /\.trend-item\s*\{[\s\S]*display:\s*flex;/);
});
