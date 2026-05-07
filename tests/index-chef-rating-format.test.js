const { readFileSync } = require('node:fs')
const { resolve } = require('node:path')
const test = require('node:test')
const assert = require('node:assert/strict')

const indexSource = readFileSync(resolve(__dirname, '..', 'pages', 'index.vue'), 'utf8')

test('homepage recommended chef ratings keep one decimal place', () => {
  assert.match(indexSource, /formatChefRating\(value\)/)
  assert.match(indexSource, /return rating\.toFixed\(1\)/)
  assert.match(indexSource, /rating:\s*this\.formatChefRating\(this\.pickChefRating\(item\)\)/)
})
