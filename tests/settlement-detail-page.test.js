const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const vm = require('node:vm')

const apiSource = fs.readFileSync(path.join(__dirname, '..', 'api', 'cooking', 'chef.js'), 'utf8')
const pagesSource = fs.readFileSync(path.join(__dirname, '..', 'pages.json'), 'utf8')
const detailPagePath = path.join(__dirname, '..', 'pages', 'work', 'settlement-detail.vue')
const detailPageSource = fs.readFileSync(detailPagePath, 'utf8')

function loadComponentOptions() {
  const match = detailPageSource.match(/<script>([\s\S]*?)<\/script>/)
  assert.ok(match, 'expected settlement detail page to contain a script block')

  const script = match[1]
    .replace(
      /import\s+\{[\s\S]*?\}\s+from\s+'@\/api\/cooking\/chef'\s*/,
      [
        'const getChefSettlementDetail = globalThis.__testApi.getChefSettlementDetail',
        'const getChefOrderList = globalThis.__testApi.getChefOrderList',
        'const submitChefSettlementReview = globalThis.__testApi.submitChefSettlementReview',
        'const confirmChefSettlement = globalThis.__testApi.confirmChefSettlement'
      ].join('\n') + '\n'
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
    globalThis: {
      __testApi: {
        getChefSettlementDetail: () => Promise.resolve({}),
        getChefOrderList: () => Promise.resolve({}),
        submitChefSettlementReview: () => Promise.resolve({}),
        confirmChefSettlement: () => Promise.resolve({})
      }
    }
  }

  vm.runInNewContext(script, sandbox, { filename: detailPagePath })
  return sandbox.module.exports
}

function createPageContext(component, overrides = {}) {
  const data = component.data ? component.data() : {}
  const ctx = { ...data, ...overrides }

  Object.assign(ctx, component.methods)

  const computedNames = [
    'displayMonth',
    'settlementStatusKey',
    'canConfirmSettlement',
    'canRequestReview',
    'isReviewingSettlement',
    'reviewReasonLabel',
    'reviewRemarkText'
  ]

  computedNames.forEach(name => {
    if (!component.computed[name]) return
    Object.defineProperty(ctx, name, {
      configurable: true,
      enumerable: true,
      get() {
        return component.computed[name].call(ctx)
      }
    })
  })

  return ctx
}

test('settlement detail api and route are wired for a dedicated detail page', () => {
  assert.match(apiSource, /export function getChefSettlementDetail\(id\) \{/)
  assert.match(apiSource, /export function submitChefSettlementReview\(data\) \{/)
  assert.match(apiSource, /url: '\/cooking\/settlement\/chef\/review'/)
  assert.match(apiSource, /export function confirmChefSettlement\(data\) \{/)
  assert.match(apiSource, /url: '\/cooking\/settlement\/chef\/confirm'/)
  assert.match(apiSource, /url: `\/cooking\/settlement\/\$\{id\}`/)
  assert.match(pagesSource, /"path": "pages\/work\/settlement-detail"/)
  assert.match(pagesSource, /"navigationBarTitleText": "结算详情"/)
  assert.ok(fs.existsSync(detailPagePath))
})

test('settlement detail page loads settlement, orders, and settlement action apis from the chef api module', () => {
  const source = detailPageSource

  assert.match(
    source,
    /import \{[\s\S]*getChefSettlementDetail[\s\S]*getChefOrderList[\s\S]*submitChefSettlementReview[\s\S]*confirmChefSettlement[\s\S]*\} from '@\/api\/cooking\/chef'/
  )
  assert.match(source, /onLoad\(options\)/)
  assert.match(source, /this\.settlementId\s*=\s*options\.id/)
  assert.match(source, /this\.queryMonth\s*=\s*this\.formatMonth\(options\.month \|\| options\.settlementMonth \|\| ''\)/)
  assert.match(source, /getChefSettlementDetail\(this\.settlementId\)/)
  assert.match(source, /getChefOrderList\(\{[\s\S]*settlementId: this\.settlementId[\s\S]*month: this\.queryMonth/)
  assert.match(source, /submitChefSettlementReview\(/)
  assert.match(source, /confirmChefSettlement\(/)
  assert.match(source, /申请复核/)
  assert.match(source, /确认无异议/)
  assert.match(source, /复核中/)
})

test('settlement detail page waits for settlement detail month before loading fallback orders', async () => {
  const component = loadComponentOptions()
  const ctx = createPageContext(component, {
    queryMonth: '',
    settlementId: 'SET-2026-04'
  })

  const observedMonths = []

  ctx.loadSettlement = () => Promise.resolve().then(() => {
    ctx.queryMonth = '2026-04'
  })
  ctx.loadOrders = () => {
    observedMonths.push(ctx.queryMonth)
    return Promise.resolve()
  }

  await component.methods.load.call(ctx)

  assert.deepEqual(observedMonths, ['2026-04'])
})

test('settlement detail page filters fallback orders to the active settlement scope', () => {
  const component = loadComponentOptions()
  const ctx = createPageContext(component, {
    settlementId: 'SET-2026-04',
    queryMonth: '2026-04',
    settlement: {
      id: 'SET-2026-04',
      settlementMonth: '2026-04'
    },
    orders: [
      {
        id: 'keep-by-settlement-id',
        settlementId: 'SET-2026-04',
        orderNo: 'A-001',
        status: 'FINISHED',
        serviceStartTime: '2026-04-08 12:00:00'
      },
      {
        id: 'drop-wrong-month',
        settlementMonth: '2026-03',
        orderNo: 'A-002',
        status: 'FINISHED',
        serviceStartTime: '2026-03-30 12:00:00'
      },
      {
        id: 'drop-wrong-settlement',
        settlementId: 'SET-2026-05',
        settlementMonth: '2026-04',
        orderNo: 'A-003',
        status: 'FINISHED',
        serviceStartTime: '2026-04-09 18:00:00'
      },
      {
        id: 'drop-unsettled-status',
        settlementId: 'SET-2026-04',
        orderNo: 'A-004',
        status: 'WAITING',
        serviceStartTime: '2026-04-10 18:00:00'
      }
    ]
  })

  const orders = component.computed.settlementOrders.call(ctx)

  assert.deepEqual(orders.map(item => item.id), ['keep-by-settlement-id'])
  assert.equal(orders[0].no, 'A-001')
})

test('settlement detail page normalizes compact settlement months', () => {
  const component = loadComponentOptions()
  const ctx = createPageContext(component)

  assert.equal(component.methods.formatMonth.call(ctx, '202604'), '2026-04')
})
