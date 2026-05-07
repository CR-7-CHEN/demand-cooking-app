const { readFileSync } = require('node:fs')
const { resolve } = require('node:path')
const test = require('node:test')
const assert = require('node:assert/strict')

const source = readFileSync(resolve(__dirname, '..', 'pages', 'index.vue'), 'utf8')

test('user homepage chef search exposes breakfast lunch dinner options and passes mealPeriod to listChefs', () => {
  assert.match(source, /mealPeriodOptions/)
  assert.match(source, /label:\s*'早餐'/)
  assert.match(source, /label:\s*'午餐'/)
  assert.match(source, /label:\s*'晚餐'/)
  assert.match(source, /mealPeriod:\s*''/)
  assert.match(source, /listChefs\(\s*\{[\s\S]*mealPeriod:\s*this\.query\.mealPeriod[\s\S]*\}\s*\)/)
})
