const test = require('node:test')
const assert = require('node:assert/strict')
const { readFileSync } = require('node:fs')
const { resolve } = require('node:path')

const loginSource = readFileSync(resolve(__dirname, '..', 'api', 'login.js'), 'utf8')
const configSource = readFileSync(resolve(__dirname, '..', 'config.js'), 'utf8')

test('password login no longer sends tenantId or reads it from config', () => {
  assert.doesNotMatch(loginSource, /tenantId\s*:\s*appConfig\.tenantId/)
  assert.doesNotMatch(loginSource, /appConfig\.tenantId/)
})

test('wechat login no longer sends tenantId or reads it from config', () => {
  assert.doesNotMatch(loginSource, /tenantId\s*:\s*appConfig\.tenantId/)
  assert.doesNotMatch(loginSource, /appConfig\.tenantId/)
})

test('register no longer sends tenantId or reads it from config', () => {
  assert.doesNotMatch(loginSource, /tenantId\s*:\s*appConfig\.tenantId/)
  assert.doesNotMatch(loginSource, /appConfig\.tenantId/)
})

test('config no longer defines tenantId', () => {
  assert.doesNotMatch(configSource, /tenantId\s*:/)
})
