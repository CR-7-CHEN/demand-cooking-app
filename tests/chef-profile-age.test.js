const { readFileSync } = require('node:fs')
const { resolve } = require('node:path')
const { describe, it } = require('node:test')
const assert = require('node:assert/strict')

const profile = readFileSync(resolve(__dirname, '..', 'pages', 'work', 'profile.vue'), 'utf8')

describe('chef profile age field', () => {
  it('shows age after phone, fills it, validates it, and submits it', () => {
    assert.ok(profile.indexOf('<text class="label">手机号</text>') < profile.indexOf('<text class="label">年龄</text>'))
    assert.match(profile, /v-model\.trim="form\.age"/)
    assert.match(profile, /type="number" maxlength="3" placeholder="请输入年龄"/)
    assert.match(profile, /age: ''/)
    assert.match(profile, /this\.form\.age = data\.age === undefined/)
    assert.match(profile, /age: Number\(this\.form\.age\)/)
    assert.match(profile, /if \(!this\.form\.age\) return '请填写年龄'/)
    assert.match(profile, /return '请填写有效年龄'/)
  })
})
