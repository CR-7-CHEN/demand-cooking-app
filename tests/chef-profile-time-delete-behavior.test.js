const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const vm = require('node:vm')

const pagePath = path.join(__dirname, '..', 'pages', 'work', 'profile-time.vue')
const source = fs.readFileSync(pagePath, 'utf8')

function loadComponentOptions(apiOverrides = {}) {
  const match = source.match(/<script>([\s\S]*?)<\/script>/)
  assert.ok(match, 'expected profile time page to contain a script block')

  const script = match[1]
    .replace(
      /import\s+\{\s*getChefTime,\s*deleteChefTime\s*\}\s+from\s+'@\/api\/cooking\/chef'\s*/,
      [
        'const getChefTime = globalThis.__testApi.getChefTime',
        'const deleteChefTime = globalThis.__testApi.deleteChefTime'
      ].join('\n') + '\n'
    )
    .replace(/export default/, 'module.exports =')

  const sandbox = {
    module: { exports: {} },
    exports: {},
    require,
    console,
    Promise,
    Date,
    Math,
    uni: {},
    globalThis: {
      __testApi: {
        getChefTime: () => Promise.resolve({ data: [] }),
        deleteChefTime: () => Promise.resolve({}),
        ...apiOverrides
      }
    }
  }

  vm.runInNewContext(script, sandbox, { filename: pagePath })
  return sandbox.module.exports
}

function createPageContext(component, overrides = {}) {
  const data = component.data ? component.data() : {}
  const ctx = { ...data, ...overrides }

  Object.assign(ctx, component.methods)

  if (component.computed && component.computed.isManageMode) {
    Object.defineProperty(ctx, 'isManageMode', {
      configurable: true,
      enumerable: true,
      get() {
        return component.computed.isManageMode.call(ctx)
      }
    })
  }

  return ctx
}

async function flushPromises() {
  await Promise.resolve()
  await Promise.resolve()
}

test('profile time delete action uses tap for mini-program compatibility', () => {
  assert.match(source, /class="time-actions"/)
  assert.match(source, /@tap\.stop="removeTime\(item\)"/)
  assert.doesNotMatch(source, /@click="removeTime\(item\)"/)
})

test('manage mode delete reloads server time list after deletion succeeds', async () => {
  const deletedIds = []
  const component = loadComponentOptions({
    deleteChefTime: id => {
      deletedIds.push(id)
      return Promise.resolve({})
    }
  })
  const ctx = createPageContext(component, {
    mode: 'manage',
    chefTimes: [
      {
        localId: 'expired_1',
        timeId: 1001,
        startTime: '2026-05-01 08:00:00',
        endTime: '2026-05-01 09:00:00',
        status: '0',
        remark: '早餐'
      }
    ],
    $modal: {
      confirm: () => Promise.resolve(true),
      showToast: () => {}
    }
  })

  let loadCount = 0
  ctx.loadManageTimes = () => {
    loadCount += 1
    return Promise.resolve()
  }

  await component.methods.removeTime.call(ctx, ctx.chefTimes[0])
  await flushPromises()

  assert.deepEqual(deletedIds, [1001])
  assert.equal(loadCount, 1)
  assert.deepEqual(ctx.chefTimes, [])
})

test('draft mode delete still removes local time item without calling api', async () => {
  let deleted = false
  const component = loadComponentOptions({
    deleteChefTime: () => {
      deleted = true
      return Promise.resolve({})
    }
  })
  const ctx = createPageContext(component, {
    mode: 'draft',
    chefTimes: [
      {
        localId: 'draft_1',
        timeId: null,
        startTime: '2026-05-11 10:00:00',
        endTime: '2026-05-11 11:00:00',
        status: '0',
        remark: '午餐'
      }
    ],
    $modal: {
      confirm: () => Promise.resolve(true),
      showToast: () => {}
    }
  })

  await component.methods.removeTime.call(ctx, ctx.chefTimes[0])
  await flushPromises()

  assert.equal(deleted, false)
  assert.deepEqual(ctx.chefTimes, [])
})
