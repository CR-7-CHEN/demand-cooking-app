const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')

const source = fs.readFileSync(path.join(__dirname, '..', 'pages', 'user', 'order-detail.vue'), 'utf8')

test('user order detail removes the current action heading copy', () => {
  assert.doesNotMatch(source, /当前可操作/)
})

test('user order detail gives the cancel button a wider dedicated layout', () => {
  assert.match(source, /class="plain danger cancel-btn"/)
  assert.match(source, /\.cancel-btn\s*\{[\s\S]*grid-column:\s*1\s*\/\s*-1;/)
  assert.match(source, /\.cancel-btn\s*\{[\s\S]*width:\s*100%;/)
})

test('user order detail only shows pay action for waiting pay orders', () => {
  const start = source.indexOf('canPay()')
  const end = source.indexOf('canObjection()', start)
  const canPay = source.slice(start, end)

  assert.notEqual(start, -1)
  assert.notEqual(end, -1)
  assert.match(canPay, /ORDER_STATUS\.WAITING_PAY/)
  assert.doesNotMatch(canPay, /PRICE_OBJECTION/)
})
