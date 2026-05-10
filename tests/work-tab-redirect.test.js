const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const vm = require('node:vm')

const pagePath = path.join(__dirname, '..', 'pages', 'work', 'index.vue')
const source = fs.readFileSync(pagePath, 'utf8')

function loadComponentOptions(uniOverrides = {}) {
  const match = source.match(/<script>([\s\S]*?)<\/script>/)
  assert.ok(match, 'expected work page to contain a script block')

  const script = match[1]
    .replace(/import\s+\{\s*getToken\s*\}\s+from\s+'@\/utils\/auth'\s*/, "const getToken = () => 'token'\n")
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
      showModal() {},
      switchTab() {},
      setTabBarItem() {},
      setNavigationBarTitle() {},
      ...uniOverrides
    }
  }

  vm.runInNewContext(script, sandbox, { filename: pagePath })
  return sandbox.module.exports
}

function createPageContext(component, overrides = {}) {
  const ctx = {
    $store: {
      state: {
        user: {
          name: '测试用户',
          avatar: ''
        }
      }
    },
    $tab: {
      navigateTo() {},
      switchTab() {}
    },
    $modal: {
      msg() {}
    },
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

test('work tab keeps ordinary users on the page and exposes service center actions', async () => {
  assert.match(source, /服务中心/)
  assert.match(source, /我的订单/)
  assert.match(source, /地址管理/)
  assert.match(source, /在线客服/)
  assert.match(source, /常见问题/)
  assert.match(source, /申请成为服务厨师/)
  assert.match(source, /uni\.setTabBarItem\(/)
  assert.match(source, /uni\.setNavigationBarTitle\(/)
  assert.match(source, /requiresLogin:\s*true/)

  const component = loadComponentOptions()
  let redirected = 0
  let loadedOrders = 0
  let loadedAnnouncements = 0
  const labelCalls = []
  const ctx = createPageContext(component, {
    chef: {},
    loadChef() {
      this.chef = { chefId: '1', auditStatus: '0', chefStatus: '0' }
      return Promise.resolve()
    },
    loadOrders() {
      loadedOrders += 1
      return Promise.resolve()
    },
    loadAnnouncements() {
      loadedAnnouncements += 1
      return Promise.resolve()
    },
    $tab: {
      navigateTo() {},
      switchTab() {
        redirected += 1
      }
    },
    syncPageLabels() {
      labelCalls.push(this.isChefWorkbenchAvailable ? '工作台' : '服务中心')
    }
  })

  await component.methods.loadPage.call(ctx)

  assert.equal(redirected, 0)
  assert.equal(loadedOrders, 0)
  assert.equal(loadedAnnouncements, 0)
  assert.equal(Array.isArray(ctx.orders), true)
  assert.equal(Array.isArray(ctx.announcements), true)
  assert.equal(ctx.orders.length, 0)
  assert.equal(ctx.announcements.length, 0)
  assert.deepEqual(labelCalls, ['服务中心'])
})

test('work tab service center apply action confirms before opening the chef profile form', () => {
  const modalCalls = []
  const component = loadComponentOptions({
    showModal(options) {
      modalCalls.push(options)
      options.success({ confirm: false, cancel: true })
    }
  })
  const calls = []
  const ctx = createPageContext(component, {
    chef: {},
    $tab: {
      navigateTo(url) {
        calls.push(url)
      },
      switchTab() {}
    }
  })

  const serviceCenterActions = component.computed.serviceCenterActions.call(ctx)
  const applyEntry = serviceCenterActions.find(item => item.title === '申请成为服务厨师')
  assert.ok(applyEntry, 'expected apply entry to exist')

  component.methods.handleServiceCenterAction.call(ctx, applyEntry)

  assert.equal(modalCalls.length, 1)
  assert.equal(modalCalls[0].title, '申请入驻')
  assert.equal(modalCalls[0].content, '是否申请入驻成为服务厨师?')
  assert.equal(modalCalls[0].confirmText, '是')
  assert.equal(modalCalls[0].cancelText, '否')
  assert.deepEqual(calls, [])

  modalCalls[0].success({ confirm: true, cancel: false })

  assert.deepEqual(calls, ['/pages/work/profile'])
})

test('work tab protected service-center actions reuse login gating', () => {
  const component = loadComponentOptions()
  const calls = []
  const ctx = createPageContext(component, {
    requireLogin(url) {
      calls.push(url)
    }
  })

  const serviceCenterActions = component.computed.serviceCenterActions.call(ctx)
  const orderEntry = serviceCenterActions.find(item => item.url === '/pages/user/orders')
  assert.ok(orderEntry && orderEntry.requiresLogin, 'expected order entry to require login')

  component.methods.handleServiceCenterAction.call(ctx, orderEntry)

  assert.deepEqual(calls, ['/pages/user/orders'])
})
