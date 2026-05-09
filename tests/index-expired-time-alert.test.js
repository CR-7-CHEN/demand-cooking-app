const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')

const source = fs.readFileSync(path.join(__dirname, '..', 'pages', 'index.vue'), 'utf8')

test('chef homepage prepends expired time reminder and routes to manage mode', () => {
  assert.match(source, /getChefTime/)
  assert.match(source, /buildExpiredTimeAlert\(\)/)
  assert.match(source, /this\.buildExpiredTimeAlert\(\),\s*\.\.\.alerts/)
  assert.match(source, /@click="openAlert\(item\)"/)
  assert.match(source, /:class="\[item\._toneClass,\s*\{\s*clickable:\s*!!item\.actionUrl\s*\}\]"/)
  assert.match(source, /const url = item && item\.actionUrl/)
  assert.match(source, /\/pages\/work\/profile-time\?mode=manage&focus=expired/)
  assert.match(source, /loadExpiredTimeCount\(\)/)
})
