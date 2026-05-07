const { readFileSync } = require('node:fs')
const { resolve } = require('node:path')
const test = require('node:test')
const assert = require('node:assert/strict')

const source = readFileSync(resolve(__dirname, '..', 'pages', 'index.vue'), 'utf8')

test('user homepage chef recommendations show readable gender and age text', () => {
  assert.match(source, /<text v-if="chef\.genderText">{{ chef\.genderText }}<\/text>/)
  assert.match(source, /<text v-if="chef\.ageText">{{ chef\.ageText }}<\/text>/)
  assert.match(source, /genderText:\s*this\.formatChefGender\(rawGender\)/)
  assert.match(source, /ageText:\s*this\.formatChefAge\(rawAge\)/)
  assert.match(source, /formatChefGender\(value\)/)
  assert.match(source, /formatChefAge\(value\)/)
  assert.match(source, /completedOrders/)
  assert.match(source, /isRecommendedChef\(\.\.\.values\)/)
})
