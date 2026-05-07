const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const source = fs.readFileSync(path.join(__dirname, '..', 'pages', 'index.vue'), 'utf8');

test('chef workbench uses work reminder copy', () => {
  assert.match(source, /工作提醒/);
  assert.match(source, /暂无工作提醒/);
  assert.doesNotMatch(source, /异常提醒/);
  assert.doesNotMatch(source, /暂无异常提醒/);
});
