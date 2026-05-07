const { readFileSync } = require('node:fs')
const { resolve } = require('node:path')
const { describe, it } = require('node:test')
const assert = require('node:assert/strict')

const source = readFileSync(resolve(__dirname, '..', 'pages', 'work', 'index.vue'), 'utf8')

describe('work profile entry copy', () => {
  it('uses the requested submitted audit profile copy', () => {
    const matches = source.match(/查看已提交的审核资料，可进行修改/g) || []
    assert.equal(matches.length, 2)
    assert.equal((source.match(/<view class="quick-icon dark">资料<\/view>/g) || []).length, 2)
    assert.doesNotMatch(source, /<view class="quick-icon dark">档<\/view>/)
    assert.doesNotMatch(source, /可继续编辑手机号、菜系、服务区域、健康证和作品图/)
    assert.doesNotMatch(source, /维护手机号、菜系、区域、健康证和作品图/)
  })
})
