const { readFileSync } = require('node:fs');
const { resolve } = require('node:path');
const test = require('node:test');
const assert = require('node:assert/strict');

const pagePath = resolve(__dirname, '..', 'pages', 'user', 'chef-detail.vue');
const source = readFileSync(pagePath, 'utf8');

test('chef detail does not show service area fallback copy when area data is empty', () => {
  assert.doesNotMatch(source, /服务区域待完善/);
  assert.doesNotMatch(source, /服务区域：/);
  assert.match(source, /<view class="area">\{\{ chef\.serviceAreaText \}\}<\/view>/);
  assert.match(source, /serviceAreaText:\s*areas\.length \? areas\.join\('、'\) : ''/);
});
