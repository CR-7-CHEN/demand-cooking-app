const { readFileSync } = require('node:fs')
const { resolve } = require('node:path')
const test = require('node:test')
const assert = require('node:assert/strict')

const indexSource = readFileSync(resolve(__dirname, '..', 'pages', 'index.vue'), 'utf8')
const detailSource = readFileSync(resolve(__dirname, '..', 'pages', 'user', 'chef-detail.vue'), 'utf8')

test('chef rating keeps zero values instead of falling back to 5.0', () => {
  assert.match(indexSource, /pickChefRating\(item\)/)
  assert.match(indexSource, /if \(rating !== undefined && rating !== null && rating !== ''\) return rating/)
  assert.match(indexSource, /if \(score !== undefined && score !== null && score !== ''\) return score/)
  assert.match(indexSource, /formatChefRating\(value\)/)
  assert.match(indexSource, /rating:\s*this\.formatChefRating\(this\.pickChefRating\(item\)\)/)

  assert.match(detailSource, /pickChefRating\(item\)/)
  assert.match(detailSource, /if \(rating !== undefined && rating !== null && rating !== ''\) return rating/)
  assert.match(detailSource, /if \(score !== undefined && score !== null && score !== ''\) return score/)
  assert.match(detailSource, /rating:\s*this\.pickChefRating\(item\)/)
})
