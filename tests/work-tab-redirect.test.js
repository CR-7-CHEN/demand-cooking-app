const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const vm = require('node:vm')

const pagePath = path.join(__dirname, '..', 'pages', 'work', 'index.vue')
const source = fs.readFileSync(pagePath, 'utf8')

function loadComponentOptions() {
  const match = source.match(/<script>([\s\S]*?)<\/script>/)
  assert.ok(match, 'expected work page to contain a script block')

  const script = match[1]
    .replace(/import\s+\{[\s\S]*?getWorkbenchAnnouncements[\s\S]*?\}\s+from\s+'@\/api\/cooking\/chef'/, "const getChefMy = () => Promise.resolve({})\nconst resignChef = () => Promise.resolve({})\nconst getChefOrderList = () => Promise.resolve({})\nconst getWorkbenchAnnouncements = () => Promise.resolve({})\n")
    .replace(/const chefStatus = require\('@\/utils\/chef-status'\)/, `const chefStatus = require(${JSON.stringify(path.join(__dirname, '..', 'utils', 'chef-status.js'))})`)
    .replace(/const orderStatus = require\('@\/utils\/order-status'\)/, "const orderStatus = { ORDER_STATUS: { WAITING_RESPONSE: '0', PRICE_OBJECTION: '2', WAITING_SERVICE: '3', WAITING_CONFIRM: '4', COMPLETED: '5' }, normalizeOrderStatus: value => String(value || ''), isCompletedOrder: value => String(value || '') === '5' }\n")
    .replace(/export default/, 'module.exports =')

  const sandbox = {
    module: { exports: {} },
    exports: {},
    require,
    console,
    Promise,
    uni: {
      showToast() {},
      switchTab() {}
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
  Object.defineProperty(ctx, 'isChefWorkbenchAvailable', {
    configurable: true,
    enumerable: true,
    get() {
      return component.computed.isChefWorkbenchAvailable.call(ctx)
    }
  })
  return ctx
}

test('work tab removes ordinary apply sections and redirects non-workbench chefs back to mine', async () => {
  assert.doesNotMatch(source, /v-if="needApply" class="empty-card"/)
  assert.doesNotMatch(source, /hasChefProfile && !isChefWorkbenchAvailable/)

  const component = loadComponentOptions()
  let redirected = 0
  let loadedOrders = 0
  let loadedAnnouncements = 0
  const ctx = createPageContext(component, {
    chef: {},
    loadChef() {
      this.chef = { chefId: '1', auditStatus: '0', chefStatus: '0' }
      return Promise.resolve()
    },
    redirectNonWorkbenchUser() {
      redirected += 1
    },
    loadOrders() {
      loadedOrders += 1
      return Promise.resolve()
    },
    loadAnnouncements() {
      loadedAnnouncements += 1
      return Promise.resolve()
    }
  })

  await component.methods.loadPage.call(ctx)

  assert.equal(redirected, 1)
  assert.equal(loadedOrders, 0)
  assert.equal(loadedAnnouncements, 0)
  assert.equal(Array.isArray(ctx.orders), true)
  assert.equal(Array.isArray(ctx.announcements), true)
  assert.equal(ctx.orders.length, 0)
  assert.equal(ctx.announcements.length, 0)
})
