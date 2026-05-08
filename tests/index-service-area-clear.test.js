const { readFileSync } = require('node:fs')
const { resolve } = require('node:path')
const test = require('node:test')
const assert = require('node:assert/strict')

const source = readFileSync(resolve(__dirname, '..', 'pages', 'index.vue'), 'utf8')

test('homepage service area filter exposes a clear action after selection and reloads chefs immediately', () => {
  assert.match(source, /<view v-if="query\.serviceArea" class="region-clear" @tap\.stop="clearServiceArea">/)
  assert.match(source, /<uni-icons type="clear" size="14" color="#8a8f98"><\/uni-icons>/)
  assert.match(source, /<uni-icons v-else :type="regionPickerOpen \? 'top' : 'bottom'" size="14" color="#8a8f98"><\/uni-icons>/)
  assert.match(source, /clearServiceArea\(\)\s*\{[\s\S]*this\.regionPickerOpen = false[\s\S]*this\.serviceAreaLabel = ''[\s\S]*this\.query\.serviceArea = ''[\s\S]*this\.loadChefs\(\)[\s\S]*\}/)
})
