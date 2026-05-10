const { readFileSync } = require('node:fs')
const { resolve } = require('node:path')
const test = require('node:test')
const assert = require('node:assert/strict')
const vm = require('node:vm')

const pagePath = resolve(__dirname, '..', 'pages', 'index.vue')
const source = readFileSync(pagePath, 'utf8')
const tabBarCalls = []

function loadComponentOptions() {
  const match = source.match(/<script>([\s\S]*?)<\/script>/)
  assert.ok(match, 'expected homepage to contain a script block')

  const script = match[1]
    .replace(/import\s+\{\s*getToken\s*\}\s+from\s+'@\/utils\/auth'\s*/, "const getToken = () => 'token'\n")
    .replace(/import\s+\{\s*listChefs\s*\}\s+from\s+'@\/api\/cooking\/user'\s*/, "const listChefs = () => Promise.resolve([])\n")
    .replace(/import\s+\{\s*getChefMy,\s*getChefWorkbench,\s*getChefTime,\s*pauseChef,\s*resumeChef\s*\}\s+from\s+'@\/api\/cooking\/chef'\s*/, "const getChefMy = () => Promise.resolve({ data: {} })\nconst getChefWorkbench = () => Promise.resolve({ data: {} })\nconst getChefTime = () => Promise.resolve({ data: [] })\nconst pauseChef = () => Promise.resolve({})\nconst resumeChef = () => Promise.resolve({})\n")
    .replace(/import\s+regionData\s+from\s+'@\/utils\/region-data'\s*/, 'const regionData = []\n')
    .replace(/const chefStatus = require\('@\/utils\/chef-status'\)/, `const chefStatus = require(${JSON.stringify(resolve(__dirname, '..', 'utils', 'chef-status.js'))})`)
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
      setTabBarItem(options) {
        tabBarCalls.push(options)
      }
    }
  }

  vm.runInNewContext(script, sandbox, { filename: pagePath })
  return sandbox.module.exports
}

function createPageContext(component, overrides = {}) {
  const ctx = {
    $modal: {
      msg() {}
    },
    $tab: {
      navigateTo() {}
    },
    ...((component.data ? component.data() : {}))
  }
  Object.assign(ctx, component.methods, overrides)
  Object.defineProperty(ctx, 'isCurrentChef', {
    configurable: true,
    enumerable: true,
    get() {
      return component.computed.isCurrentChef.call(ctx)
    }
  })
  return ctx
}

test('homepage removes ordinary quick actions and carries dynamic service-center tabBar logic', () => {
  assert.doesNotMatch(source, /class="quick-actions hero-actions"/)
  assert.match(source, /uni\.setTabBarItem\(/)
  assert.doesNotMatch(source, /<view class="quick-item" @click="goAddress">[\s\S]*?<text>地址管理<\/text>/)
})

test('homepage tabBar label switches between service center and workbench', () => {
  const component = loadComponentOptions()
  const ctx = createPageContext(component)

  tabBarCalls.length = 0
  ctx.chefProfile = {}
  component.methods.syncWorkTabBarLabel.call(ctx)
  ctx.chefProfile = { chefId: '1', auditStatus: '1', chefStatus: '0' }
  component.methods.syncWorkTabBarLabel.call(ctx)

  assert.deepEqual(tabBarCalls.map(item => item.text), ['服务中心', '工作台'])
  assert.ok(tabBarCalls.every(item => item.index === 1))
})
