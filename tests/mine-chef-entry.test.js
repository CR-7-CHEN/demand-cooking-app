const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const vm = require('node:vm')

const pagePath = path.join(__dirname, '..', 'pages', 'mine', 'index.vue')
const source = fs.readFileSync(pagePath, 'utf8')

function loadComponentOptions() {
  const match = source.match(/<script>([\s\S]*?)<\/script>/)
  assert.ok(match, 'expected mine page to contain a script block')

  const script = match[1]
    .replace(/import\s+\{\s*getAppProfile\s*\}\s+from\s+"@\/api\/system\/user"/, "const getAppProfile = () => Promise.resolve({ data: {} })\n")
    .replace(/import\s+\{\s*getChefMy\s*\}\s+from\s+"@\/api\/cooking\/chef"/, "const getChefMy = () => Promise.resolve({ data: {} })\n")
    .replace(/const chefStatus = require\('@\/utils\/chef-status'\)/, `const chefStatus = require(${JSON.stringify(path.join(__dirname, '..', 'utils', 'chef-status.js'))})`)
    .replace(/export default/, 'module.exports =')

  const sandbox = {
    module: { exports: {} },
    exports: {},
    require,
    console,
    Promise,
    uni: {
      getSystemInfoSync() {
        return { windowHeight: 800 }
      }
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
          avatar: '',
          token: 'token'
        }
      }
    },
    $tab: {
      navigateTo() {},
      reLaunch() {}
    },
    $modal: {
      showToast() {}
    },
    ...overrides
  }
  const data = component.data ? component.data.call(ctx) : {}
  Object.assign(ctx, data, component.methods)
  return ctx
}

test('mine page resolves chef entry copy from chef status and hides it for active workbench chefs', () => {
  const component = loadComponentOptions()
  const ctx = createPageContext(component)

  const pendingEntry = component.methods.resolveChefEntry.call(ctx, { chefId: '1', auditStatus: '0' })
  const rejectedEntry = component.methods.resolveChefEntry.call(ctx, { chefId: '1', auditStatus: '2' })
  const newEntry = component.methods.resolveChefEntry.call(ctx, {})
  const activeEntry = component.methods.resolveChefEntry.call(ctx, { chefId: '1', auditStatus: '1', chefStatus: '0' })

  assert.equal(newEntry.title, '申请成为做饭人员')
  assert.equal(pendingEntry.title, '查看申请进度')
  assert.equal(rejectedEntry.title, '完善做饭人员资料')
  assert.equal(activeEntry, null)
})
