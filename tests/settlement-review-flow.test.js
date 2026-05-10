const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const vm = require('node:vm')

const detailPagePath = path.join(__dirname, '..', 'pages', 'work', 'settlement-detail.vue')
const detailPageSource = fs.readFileSync(detailPagePath, 'utf8')

function loadComponentOptions(apiOverrides = {}, uniOverrides = {}) {
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
      showModal: ({ success }) => success && success({ confirm: true, cancel: false }),
      showToast: () => {},
      ...uniOverrides
    },
    globalThis: {
      __testApi: {
        getChefSettlementDetail: () => Promise.resolve({}),
        getChefOrderList: () => Promise.resolve({}),
        submitChefSettlementReview: () => Promise.resolve({}),
        confirmChefSettlement: () => Promise.resolve({}),
        ...apiOverrides
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

test('generated settlements expose confirm and review actions', () => {
  const component = loadComponentOptions()
  const ctx = createPageContext(component, {
    settlement: {
      settlementStatus: 'GENERATED'
    }
  })

  assert.equal(ctx.settlementStatusKey, 'GENERATED')
  assert.equal(ctx.canConfirmSettlement, true)
  assert.equal(ctx.canRequestReview, true)
  assert.equal(ctx.isReviewingSettlement, false)
})

test('reviewing settlements surface review details and stop further confirmation', () => {
  const component = loadComponentOptions()
  const ctx = createPageContext(component, {
    settlement: {
      settlementStatus: 'REVIEWING',
      reviewReasonType: 'AMOUNT_DIFF',
      reviewRemark: '有两单提成少了一部分'
    }
  })

  assert.equal(ctx.settlementStatusKey, 'REVIEWING')
  assert.equal(ctx.canConfirmSettlement, false)
  assert.equal(ctx.canRequestReview, false)
  assert.equal(ctx.isReviewingSettlement, true)
  assert.ok(ctx.reviewReasonLabel)
  assert.equal(ctx.reviewRemarkText, '有两单提成少了一部分')
})

test('submitSettlementReview posts a lightweight review payload and refreshes detail', async () => {
  const payloads = []
  const component = loadComponentOptions({
    submitChefSettlementReview: data => {
      payloads.push(data)
      return Promise.resolve({})
    }
  })
  const ctx = createPageContext(component, {
    settlementId: 'SET-2026-04',
    showReviewForm: true,
    reviewForm: {
      reasonType: 'AMOUNT_DIFF',
      remark: '请再核对一下提成'
    }
  })

  let loadCount = 0
  ctx.load = () => {
    loadCount += 1
    return Promise.resolve()
  }

  await component.methods.submitSettlementReview.call(ctx)

  assert.deepEqual(JSON.parse(JSON.stringify(payloads)), [
    {
      settlementId: 'SET-2026-04',
      reasonType: 'AMOUNT_DIFF',
      remark: '请再核对一下提成'
    }
  ])
  assert.equal(ctx.showReviewForm, false)
  assert.equal(loadCount, 1)
})

test('confirmSettlement posts settlementId and refreshes detail after confirmation', async () => {
  const payloads = []
  const component = loadComponentOptions({
    confirmChefSettlement: data => {
      payloads.push(data)
      return Promise.resolve({})
    }
  })
  const ctx = createPageContext(component, {
    settlementId: 'SET-2026-04'
  })

  let loadCount = 0
  ctx.load = () => {
    loadCount += 1
    return Promise.resolve()
  }

  await component.methods.confirmSettlement.call(ctx)

  assert.deepEqual(JSON.parse(JSON.stringify(payloads)), [{ settlementId: 'SET-2026-04' }])
  assert.equal(loadCount, 1)
})
