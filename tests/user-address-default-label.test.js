const { readFileSync } = require('node:fs')
const { resolve } = require('node:path')
const test = require('node:test')
const assert = require('node:assert/strict')

const pagePath = resolve(__dirname, '..', 'pages', 'user', 'address.vue')
const source = readFileSync(pagePath, 'utf8')

test('common address page keeps blue styling on the default-address label and switch', () => {
  assert.match(source, /<text class="default-switch-label">[\s\S]*<\/text>/)
  assert.match(source, /\.default-switch-label\s*\{[\s\S]*color:\s*#2f7dff;/)
  assert.match(source, /<switch[\s\S]*class="blue"[\s\S]*:class="\{\s*checked:\s*form\.isDefault\s*\}"[\s\S]*:checked="form\.isDefault"[\s\S]*color="#2f7dff"[\s\S]*@change="changeDefault"[\s\S]*\/>/)
})
