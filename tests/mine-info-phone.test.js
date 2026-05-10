const { readFileSync } = require('node:fs')
const { resolve } = require('node:path')
const { describe, it } = require('node:test')
const assert = require('node:assert/strict')

const source = readFileSync(resolve(__dirname, '..', 'pages', 'mine', 'info', 'edit.vue'), 'utf8')

describe('mine info phone maintenance', () => {
  it('lets normal users edit and submit phone number from profile edit page', () => {
    assert.match(source, /<uni-forms-item label="手机号码" name="phonenumber">/)
    assert.match(source, /v-model="user\.phonenumber"/)
    assert.match(source, /placeholder="请输入手机号"/)
    assert.match(source, /phonenumber:\s*data\.phonenumber/)
    assert.match(source, /phonenumber:\s*this\.user\.phonenumber/)
    assert.match(source, /请输入正确的手机号/)
  })
})
