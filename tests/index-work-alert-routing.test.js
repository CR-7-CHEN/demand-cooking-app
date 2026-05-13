const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const vm = require('node:vm')

const pagePath = path.join(__dirname, '..', 'pages', 'index.vue')
const source = fs.readFileSync(pagePath, 'utf8')

function loadComponentOptions(uniOverrides = {}) {
  const match = source.match(/<script>([\s\S]*?)<\/script>/)
  assert.ok(match, 'expected homepage to contain a script block')

  const script = match[1]
    .replace(/import\s+\{\s*getToken\s*\}\s+from\s+'@\/utils\/auth'\s*/, "const getToken = () => 'token'\n")
    .replace(/import\s+\{\s*listChefs\s*\}\s+from\s+'@\/api\/cooking\/user'\s*/, "const listChefs = () => Promise.resolve([])\n")
    .replace(/import\s+\{\s*getChefMy,\s*getChefWorkbench,\s*getChefTime,\s*pauseChef,\s*resumeChef\s*\}\s+from\s+'@\/api\/cooking\/chef'\s*/, "const getChefMy = () => Promise.resolve({ data: {} })\nconst getChefWorkbench = () => Promise.resolve({ data: {} })\nconst getChefTime = () => Promise.resolve({ data: [] })\nconst pauseChef = () => Promise.resolve({})\nconst resumeChef = () => Promise.resolve({})\n")
    .replace(/import\s+regionData\s+from\s+'@\/utils\/region-data'\s*/, 'const regionData = []\n')
    .replace(/import appConfig from '@\/config'\s*/, 'const appConfig = { baseUrl: "http://localhost:8080" }\n')
    .replace(/const chefStatus = require\('@\/utils\/chef-status'\)/, `const chefStatus = require(${JSON.stringify(path.join(__dirname, '..', 'utils', 'chef-status.js'))})`)
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
      showModal() {},
      setTabBarItem() {},
      setStorageSync() {},
      removeStorageSync() {}
      ,
      ...uniOverrides
    }
  }

  vm.runInNewContext(script, sandbox, { filename: pagePath })
  return sandbox.module.exports
}

function createContext(component, overrides = {}) {
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

test('chef homepage today-service alert routes to service orders tab', () => {
  assert.match(source, /today_service/)
  assert.match(source, /\/pages\/work\/orders\?tab=service&scope=today_service/)

  const component = loadComponentOptions()
  const ctx = createContext(component, {
    chefWorkbench: {
      alerts: [{
        key: 'today_service',
        title: '今日待服务',
        content: '今天有待上门服务订单，请留意时间安排。',
        tone: 'info',
        count: 2
      }]
    },
    expiredTimeCount: 0
  })

  const alerts = component.computed.limitedAlerts.call(ctx)
  assert.equal(alerts.length, 1)
  assert.equal(alerts[0].actionUrl, '/pages/work/orders?tab=service&scope=today_service')
})

test('chef homepage caches today-service scope before navigation as a fallback', () => {
  const storageCalls = []
  const component = loadComponentOptions({
    setStorageSync(key, value) {
      storageCalls.push([key, value])
    }
  })
  const ctx = createContext(component, {
    requireLogin(url) {
      this._navigatedUrl = url
    }
  })

  component.methods.openAlert.call(ctx, {
    key: 'today_service',
    actionUrl: '/pages/work/orders?tab=service&scope=today_service'
  })

  assert.deepEqual(storageCalls, [['work_orders_scope', 'today_service']])
  assert.equal(ctx._navigatedUrl, '/pages/work/orders?tab=service&scope=today_service')
})
