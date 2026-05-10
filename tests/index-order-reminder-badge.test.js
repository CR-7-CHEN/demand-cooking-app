const { readFileSync } = require('node:fs')
const { resolve } = require('node:path')
const test = require('node:test')
const assert = require('node:assert/strict')
const vm = require('node:vm')

const pagePath = resolve(__dirname, '..', 'pages', 'index.vue')
const source = readFileSync(pagePath, 'utf8')

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
      setTabBarItem() {}
    }
  }

  vm.runInNewContext(script, sandbox, { filename: pagePath })
  return sandbox.module.exports
}

function createContext(component) {
  const ctx = {
    ...((component.data ? component.data() : {}))
  }
  Object.assign(ctx, component.methods)
  Object.defineProperty(ctx, 'revenueOverview', {
    configurable: true,
    enumerable: true,
    get() {
      return component.computed.revenueOverview.call(ctx)
    }
  })
  return ctx
}

test('chef homepage shows order reminder badge and caps large counts', () => {
  assert.match(source, /class="dashboard-link-wrap"/)
  assert.match(source, /v-if="orderReminderCount > 0"/)
  assert.match(source, /class="dashboard-badge"/)

  const component = loadComponentOptions()
  const ctx = createContext(component)

  ctx.chefWorkbench = {
    orderStats: {
      response: 2,
      service: 1,
      dispute: 0
    },
    orderTotalCount: 12,
    orderReminderCount: 3
  }
  assert.equal(component.computed.orderReminderCount.call(ctx), 3)

  Object.defineProperty(ctx, 'orderReminderCount', {
    configurable: true,
    enumerable: true,
    get() {
      return component.computed.orderReminderCount.call(ctx)
    }
  })

  assert.equal(component.computed.orderReminderBadgeText.call(ctx), '3')

  ctx.chefWorkbench = {
    orderStats: {
      response: 40,
      service: 50,
      dispute: 30
    }
  }
  assert.equal(component.computed.orderReminderBadgeText.call(ctx), '99+')

  ctx.chefWorkbench = { orderReminderCount: 18, orderTotalCount: 120 }
  assert.equal(component.computed.orderReminderCount.call(ctx), 18)

  ctx.chefWorkbench = {}
  assert.equal(component.computed.orderReminderCount.call(ctx), 0)
})

test('chef homepage order reminder count only sums waiting response service and dispute statuses', () => {
  const component = loadComponentOptions()
  const ctx = createContext(component)

  ctx.chefWorkbench = {
    orderStats: {
      waitingResponseCount: 2,
      waitingServiceCount: 3,
      disputeCount: 4,
      priceObjectionCount: 40
    }
  }

  assert.equal(component.computed.orderReminderCount.call(ctx), 9)
})

test('chef homepage refreshes workbench data when showing again', async () => {
  const component = loadComponentOptions()
  const ctx = createContext(component)
  let loadCalls = 0
  ctx.loadPage = () => {
    loadCalls += 1
    return Promise.resolve()
  }

  assert.equal(typeof component.onShow, 'function')

  await component.onShow.call(ctx)
  assert.equal(loadCalls, 1)
})

test('chef homepage payable card uses base salary plus gross commission for display', () => {
  const component = loadComponentOptions()
  const ctx = createContext(component)

  ctx.chefWorkbench = {
    revenueOverview: {
      monthBaseSalary: 3000,
      monthCommissionAmount: 560,
      monthPayableAmount: 4360,
      monthDeduction: 200,
      monthCompletedOrders: 8,
      todayIncome: 88
    }
  }

  const cards = component.computed.revenueCards.call(ctx)
  const payableCard = cards[cards.length - 1]

  assert.ok(payableCard)
  assert.match(payableCard.value, /3560\.00$/)
  assert.match(payableCard.extra, /3000\.00/)
  assert.match(payableCard.extra, /200\.00/)
})

test('chef homepage falls back to chef profile base salary when workbench omits base salary and payable amount', () => {
  const component = loadComponentOptions()
  const ctx = createContext(component)

  ctx.chefProfile = {
    baseSalary: '10000.00'
  }
  ctx.chefWorkbench = {
    revenueOverview: {
      monthCommissionAmount: '300.00',
      monthPayableAmount: '0',
      monthDeduction: '0',
      monthCompletedOrders: 3,
      todayIncome: '150.40'
    }
  }

  const cards = component.computed.revenueCards.call(ctx)
  const payableCard = cards[cards.length - 1]

  assert.ok(payableCard)
  assert.match(payableCard.value, /10300\.00$/)
  assert.match(payableCard.extra, /10000\.00/)
  assert.match(payableCard.extra, /0\.00/)
})

test('chef homepage revenue trend renders in descending date order', () => {
  const component = loadComponentOptions()
  const ctx = createContext(component)

  ctx.chefWorkbench = {
    revenueTrend: [
      { date: '2026-05-08', label: '05.08', amount: '70.40' },
      { date: '2026-05-10', label: '05.10', amount: '150.40' },
      { date: '2026-05-09', label: '05.09', amount: '79.20' }
    ]
  }

  const trend = component.computed.revenueTrend.call(ctx)

  assert.deepEqual(
    trend.map(item => item.date),
    ['2026-05-10', '2026-05-09', '2026-05-08']
  )
})

