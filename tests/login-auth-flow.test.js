const test = require('node:test')
const assert = require('node:assert/strict')
const { readFileSync } = require('node:fs')
const { resolve } = require('node:path')

const loginPageSource = readFileSync(resolve(__dirname, '..', 'pages', 'login.vue'), 'utf8')

function getSection(startMarker, endMarker) {
  const start = loginPageSource.indexOf(startMarker)
  const end = loginPageSource.indexOf(endMarker)
  assert.notEqual(start, -1, `missing start marker: ${startMarker}`)
  assert.notEqual(end, -1, `missing end marker: ${endMarker}`)
  return loginPageSource.slice(start, end)
}

test('password login should not abort when mini program code is unavailable', () => {
  const pwdLoginSection = getSection('async pwdLogin() {', 'getPasswordLoginInfo() {')
  const passwordLoginInfoSection = getSection('getPasswordLoginInfo() {', 'handleWxLogin() {')

  assert.doesNotMatch(pwdLoginSection, /catch\s*\([^)]*\)\s*\{[\s\S]*return/)
  assert.doesNotMatch(passwordLoginInfoSection, /reject\s*\(/)
  assert.match(passwordLoginInfoSection, /resolve\(\{\}\)/)
})

test('wechat quick login should still require a valid mini program code', () => {
  const wxLoginSection = getSection('handleWxLogin() {', 'getMiniProgramAppId() {')

  assert.match(wxLoginSection, /if\s*\(!code\)\s*\{/)
  assert.match(wxLoginSection, /msgError\(['"][^'"]*凭证[^'"]*['"]\)/)
  assert.match(wxLoginSection, /fail:\s*\(\)\s*=>\s*\{/)
})
