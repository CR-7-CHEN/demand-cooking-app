const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const vm = require('node:vm')

const pagePath = path.join(__dirname, '..', 'pages', 'work', 'orders.vue')
const source = fs.readFileSync(pagePath, 'utf8')

function loadComponentOptions(uniOverrides = {}) {
  const match = source.match(/<script>([\s\S]*?)<\/script>/)
  assert.ok(match, 'expected work orders page to contain a script block')

  const script = match[1]
    .replace(
      /import\s+\{[\s\S]*?\}\s+from\s+'@\/api\/cooking\/chef'\s*/,
      "const getChefOrderList = () => Promise.resolve({ data: { rows: [] } })\nconst getChefWorkbench = () => Promise.resolve({ data: {} })\n"
    )
    .replace(
      /const orderStatus = require\('@\/utils\/order-status'\)/,
      `const orderStatus = require(${JSON.stringify(path.join(__dirname, '..', 'utils', 'order-status.js'))})`
    )
    .replace(/export default/, 'module.exports =')

  const sandbox = {
    module: { exports: {} },
    exports: {},
    require,
    console,
    Promise,
    setTimeout,
    clearTimeout,
    uni: {
      stopPullDownRefresh() {},
      getStorageSync() {
        return ''
      },
      removeStorageSync() {},
      ...uniOverrides
    }
  }

  vm.runInNewContext(script, sandbox, { filename: pagePath })
  return sandbox.module.exports
}

test('chef work orders page accepts tab query and defaults to service tab for work alerts', () => {
  assert.match(source, /onLoad\(option\)/)
  assert.match(source, /option\.tab/)
  assert.match(source, /this\.activeTab = option\.tab/)
  assert.match(source, /option\.scope/)

  const component = loadComponentOptions()
  const ctx = component.data ? component.data() : {}

  component.onLoad.call(ctx, { tab: 'service', scope: 'today_service' })
  assert.equal(ctx.activeTab, 'service')
  assert.equal(ctx.listScope, 'today_service')

  component.onLoad.call(ctx, { tab: 'unknown' })
  assert.equal(ctx.activeTab, 'service')
})

test('chef work orders page falls back to cached today-service scope when query scope is missing', () => {
  assert.match(source, /getStorageSync/)

  const removedKeys = []
  const component = loadComponentOptions({
    getStorageSync(key) {
      return key === 'work_orders_scope' ? 'today_service' : ''
    },
    removeStorageSync(key) {
      removedKeys.push(key)
    }
  })
  const ctx = component.data ? component.data() : {}

  component.onLoad.call(ctx, { tab: 'service' })

  assert.equal(ctx.activeTab, 'service')
  assert.equal(ctx.listScope, 'today_service')
  assert.deepEqual(removedKeys, ['work_orders_scope'])
})

test('chef work orders page filters today-service alert list to today waiting-service orders only', () => {
  assert.match(source, /listScope/)
  assert.match(source, /today_service/)

  const component = loadComponentOptions()
  const ctx = component.data ? component.data() : {}
  Object.assign(ctx, component.methods)
  Object.entries(component.computed || {}).forEach(([name, getter]) => {
    Object.defineProperty(ctx, name, {
      configurable: true,
      enumerable: true,
      get() {
        return getter.call(ctx)
      }
    })
  })

  const now = new Date()
  const pad = value => String(value).padStart(2, '0')
  const current = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`
  const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000)
  const nextDay = `${tomorrow.getFullYear()}-${pad(tomorrow.getMonth() + 1)}-${pad(tomorrow.getDate())}`

  ctx.orders = [
    { id: 1, status: 'WAITING_SERVICE', serviceStartTime: `${current} 10:00:00` },
    { id: 2, status: 'WAITING_SERVICE', serviceStartTime: `${nextDay} 10:00:00` },
    { id: 3, status: 'WAITING_CONFIRM', serviceStartTime: `${current} 11:00:00` }
  ]
  ctx.activeTab = 'service'
  ctx.listScope = 'today_service'

  assert.deepEqual(
    JSON.parse(JSON.stringify(ctx.filteredOrders)).map(order => order.id),
    [1]
  )
})
