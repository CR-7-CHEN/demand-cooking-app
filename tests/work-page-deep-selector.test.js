const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const source = fs.readFileSync(path.join(__dirname, '..', 'pages', 'work', 'index.vue'), 'utf8');

test('work page avoids scoped :deep selectors that break wxss compilation', () => {
  assert.doesNotMatch(source, /:deep\(/);
  assert.match(source, /::v-deep/);
});
