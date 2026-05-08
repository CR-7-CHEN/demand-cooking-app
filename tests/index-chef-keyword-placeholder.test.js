const { readFileSync } = require('node:fs')
const { resolve } = require('node:path')
const test = require('node:test')
const assert = require('node:assert/strict')

const source = readFileSync(resolve(__dirname, '..', 'pages', 'index.vue'), 'utf8')

test('homepage chef keyword placeholder only mentions name and cuisine', () => {
  assert.match(source, /placeholder="搜索姓名、菜系"/)
  assert.doesNotMatch(source, /搜索姓名、菜系、区域/)
})
