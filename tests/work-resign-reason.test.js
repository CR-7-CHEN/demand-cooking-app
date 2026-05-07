const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')

const source = fs.readFileSync(path.join(__dirname, '..', 'pages', 'work', 'index.vue'), 'utf8')

test('work resignation uses a custom popup with smaller input text and requires a non-empty reason', () => {
  assert.match(source, /<uni-popup ref="resignPopup" type="dialog"/)
  assert.match(source, /class="resign-dialog__input"/)
  assert.match(source, /placeholder="请输入离职原因"/)
  assert.match(source, /resign-dialog__placeholder/)
  assert.match(source, /font-size:\s*24rpx;/)
  assert.match(source, /font-size:\s*22rpx;/)
  assert.match(source, /const resignReason = String\(this\.resignReasonInput \|\| ''\)\.trim\(\)/)
  assert.match(source, /resignChef\(\{\s*resignReason\s*\}\)/)
  assert.doesNotMatch(source, /editable\s*:\s*true/)
})
