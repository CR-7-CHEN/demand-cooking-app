const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')

const source = fs.readFileSync(path.join(__dirname, '..', 'pages', 'work', 'orders.vue'), 'utf8')

test('chef orders page uses stable key for card click item lookup', () => {
  assert.match(source, /v-for="order in filteredOrders"/)
  assert.match(source, /:key="order\.orderId"/)
  assert.doesNotMatch(source, /:key="order\.id\s*\|\|\s*order\.orderId"/)
})
