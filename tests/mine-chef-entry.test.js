const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const vm = require('node:vm')

const pagePath = path.join(__dirname, '..', 'pages', 'mine', 'index.vue')
const source = fs.readFileSync(pagePath, 'utf8')
const uniMock = {
  showModal() {},
  getSystemInfoSync() {
    return { windowHeight: 800 }
  }
}

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
    uni: uniMock
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

test('mine page hides the chef apply card for ordinary users', () => {
  assert.doesNotMatch(source, /v-if="chefEntry" class="list-cell/)
  assert.match(source, /v-if="chefAction" class="chef-action-card"/)
  assert.match(source, /uni\.showModal\(/)

  const component = loadComponentOptions()
  const ctx = createPageContext(component)

  const pendingEntry = component.methods.resolveChefAction.call(ctx, { chefId: '1', auditStatus: '0' })
  const rejectedEntry = component.methods.resolveChefAction.call(ctx, { chefId: '1', auditStatus: '2' })
  const newEntry = component.methods.resolveChefAction.call(ctx, {})
  const activeEntry = component.methods.resolveChefAction.call(ctx, { chefId: '1', auditStatus: '1', chefStatus: '0' })
  const profileEntry = component.methods.resolveChefAction.call(ctx, { chefId: '1', auditStatus: '1', chefStatus: '2' })

  assert.equal(newEntry, null)
  assert.equal(pendingEntry.buttonText, '查看进度')
  assert.equal(rejectedEntry.buttonText, '完善资料')
  assert.equal(profileEntry.title, '查看入驻资料')
  assert.doesNotMatch(profileEntry.description, /工作台/)
  assert.equal(activeEntry, null)
})

test('mine page ordinary user action does not open the apply flow', () => {
  const component = loadComponentOptions()
  const calls = []
  uniMock.showModal = options => {
    calls.push(['showModal', options.title, options.content])
    options.success({ confirm: true })
  }
  const ctx = createPageContext(component, {
    chef: {},
    $tab: {
      navigateTo(url) {
        calls.push(['navigateTo', url])
      },
      reLaunch() {}
    }
  })

  component.methods.handleChefAction.call(ctx)

  assert.deepEqual(calls, [])
})
