const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')

const source = fs.readFileSync(path.join(__dirname, '..', 'pages', 'index.vue'), 'utf8')

test('chef homepage alert list uses stable key for click item lookup', () => {
  assert.match(source, /v-for="item in limitedAlerts"/)
  assert.match(source, /:key="item\.key"/)
  assert.doesNotMatch(source, /:key="item\.key\s*\|\|\s*item\.title"/)
})
