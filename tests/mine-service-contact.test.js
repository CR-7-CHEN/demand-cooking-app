const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const vm = require('node:vm')

const pagePath = path.join(__dirname, '..', 'pages', 'mine', 'service', 'index.vue')
const source = fs.readFileSync(pagePath, 'utf8')

function loadComponentOptions() {
  const match = source.match(/<script>([\s\S]*?)<\/script>/)
  assert.ok(match, 'expected service page to contain a script block')

  const script = match[1]
    .replace(/import\s+\{\s*listMyOrders\s*\}\s+from\s+'@\/api\/cooking\/user'\s*/, "const listMyOrders = globalThis.__testApi.listMyOrders\n")
    .replace(/export default/, 'module.exports =')

  const sandbox = {
    module: { exports: {} },
    exports: {},
    require,
    console,
    Promise,
    globalThis: {
      __testApi: {
        listMyOrders: () => Promise.resolve({ rows: [] })
      }
    },
    uni: {
      showToast() {}
    }
  }

  vm.runInNewContext(script, sandbox, { filename: pagePath })
  return sandbox.module.exports
}

function createPageContext(component, overrides = {}) {
  const ctx = {
    ...((component.data ? component.data() : {}))
  }
  Object.assign(ctx, component.methods)
  Object.assign(ctx, overrides)
  Object.entries(component.computed || {}).forEach(([name, getter]) => {
    Object.defineProperty(ctx, name, {
      configurable: true,
      enumerable: true,
      get() {
        return getter.call(ctx)
      }
    })
  })
  return ctx
}

test('service page exposes a native WeChat contact button entry', () => {
  assert.match(source, /open-type="contact"/)
  assert.match(source, /@contact="handleContact"/)
  assert.match(source, /:session-from="contactSessionFrom"/)
  assert.match(source, /:send-message-title="contactMessageTitle"/)
  assert.match(source, /:send-message-path="contactMessagePath"/)
  assert.match(source, /:show-message-card="true"/)
  assert.doesNotMatch(source, /智能客服/)
  assert.doesNotMatch(source, /快捷问题/)
  assert.doesNotMatch(source, /message-bubble/)
  assert.doesNotMatch(source, /askCustomerRobot/)
  assert.doesNotMatch(source, /listCustomerFaq/)
})

test('service page builds contact session context from the latest order', () => {
  const component = loadComponentOptions()
  const ctx = createPageContext(component, {
    orders: [{
      id: 12,
      orderId: 12,
      orderNo: 'OD202605120001',
      status: '3'
    }]
  })

  assert.equal(ctx.contactMessageTitle, '订单咨询｜OD202605120001')
  assert.equal(ctx.contactMessagePath, '/pages/user/order-detail?id=12')
  assert.match(ctx.contactSessionFrom, /scene=online-service/)
  assert.match(ctx.contactSessionFrom, /orderId=12/)
  assert.match(ctx.contactSessionFrom, /orderNo=OD202605120001/)
  assert.match(ctx.contactSessionFrom, /status=3/)
})

test('service page falls back to the current service page when no order exists', () => {
  const component = loadComponentOptions()
  const ctx = createPageContext(component, {
    orders: []
  })

  assert.equal(ctx.contactMessageTitle, '在线客服咨询')
  assert.equal(ctx.contactMessagePath, '/pages/mine/service/index')
  assert.match(ctx.contactSessionFrom, /hasOrder=0/)
})
