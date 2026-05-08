const { readFileSync } = require('node:fs')
const { resolve } = require('node:path')
const test = require('node:test')
const assert = require('node:assert/strict')

const source = readFileSync(resolve(__dirname, '..', 'pages', 'index.vue'), 'utf8')

test('homepage places the filter button on the same row as the keyword search input', () => {
  const searchRow = source.match(/<view class="search-row">([\s\S]*?)<\/view>\s*<view class="filter-row">/)
  assert.ok(searchRow, 'expected a search row before the filter row')
  assert.match(searchRow[1], /placeholder="搜索姓名、菜系"/)
  assert.match(searchRow[1], /<button class="search-button" @click="loadChefs">筛选<\/button>/)

  const filterRow = source.match(/<view class="filter-row">([\s\S]*?)<\/view>\s*<view class="meal-period-row">/)
  assert.ok(filterRow, 'expected a filter row before meal period options')
  assert.doesNotMatch(filterRow[1], /<button/)
})
