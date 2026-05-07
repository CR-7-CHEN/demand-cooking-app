const { readFileSync } = require('node:fs')
const { resolve } = require('node:path')
const { describe, it } = require('node:test')
const assert = require('node:assert/strict')

const profile = readFileSync(resolve(__dirname, '..', 'pages', 'work', 'profile.vue'), 'utf8')

describe('chef profile gender field', () => {
  it('shows visible gender choices, fills existing value, and submits gender', () => {
    assert.match(profile, /<text class="label">性别<\/text>/)
    assert.match(profile, /class="gender-options"/)
    assert.match(profile, /v-for="item in genderOptions"/)
    assert.match(profile, /<radio-group class="gender-options" @change="onGenderChange">/)
    assert.match(profile, /onGenderChange\(event\)/)
    assert.match(profile, /form\.gender === item\.value/)
    assert.match(profile, /genderOptions/)
    assert.match(profile, /const rawGender = data\.gender === undefined/)
    assert.match(profile, /this\.form\.gender = this\.normalizeGender\(rawGender\)/)
    assert.match(profile, /gender: this\.form\.gender/)
  })
})
