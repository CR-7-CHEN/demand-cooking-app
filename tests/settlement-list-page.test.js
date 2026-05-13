const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const vm = require('node:vm')

const pagePath = path.join(__dirname, '..', 'pages', 'work', 'settlement.vue')
const source = fs.readFileSync(pagePath, 'utf8')

function loadComponentOptions(uniOverrides) {
  const match = source.match(/<script>([\s\S]*?)<\/script>/)
  assert.ok(match, 'expected settlement page to contain a script block')

  const script = match[1]
    .replace(
      /import\s+\{\s*getChefSettlementMonth\s*\}\s+from\s+'@\/api\/cooking\/chef'\s*/,
      "const getChefSettlementMonth = () => Promise.resolve({ rows: [] })\n"
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
    uni: Object.assign({
      navigateTo() {},
      stopPullDownRefresh() {}
    }, uniOverrides || {})
  }

  vm.runInNewContext(script, sandbox, { filename: pagePath })
  return sandbox.module.exports
}

function createPageContext(component) {
  const ctx = component.data ? component.data() : {}
  Object.assign(ctx, component.methods)
  return ctx
}

test('settlement page renders a paged card list with pull-down refresh and load-more controls', () => {
  assert.match(source, /<picker[\s\S]*mode="date"[\s\S]*fields="month"[\s\S]*@change="onMonthChange"/)
  assert.match(source, /clearMonthFilter/)
  assert.match(source, /<scroll-view[\s\S]*refresher-enabled="true"[\s\S]*@refresherrefresh="onPullDownRefresh"/)
  assert.match(source, /v-for="item in settlementList"/)
  assert.match(source, /class="settlement-card"/)
  assert.match(source, /item\.month/)
  assert.match(source, /item\.completeCount/)
  assert.match(source, /item\.displayPayableAmount/)
  assert.match(source, /item\.settlementStatus/)
  assert.match(source, /@click="goDetail\(item\)"/)
  assert.match(source, /loadNextPage/)
  assert.match(source, /scrolltolower/)
  assert.match(source, /uni\.navigateTo\(\{[\s\S]*url: '\/pages\/work\/settlement-detail\?id=' \+ item\.id \+ '&month=' \+ item\.month/)
  assert.doesNotMatch(source, /鏌ョ湅鍏ㄩ儴/)
  assert.doesNotMatch(source, /缁撶畻鍒楄〃/)
  assert.doesNotMatch(source, /loadPrevPage/)
  assert.doesNotMatch(source, /loadMoreText/)
  assert.doesNotMatch(source, /class="pager"/)
  assert.doesNotMatch(source, /getChefOrderList/)
  assert.doesNotMatch(source, /settlementOrders/)
})

test('settlement page normalizes natural-month list payload fields from backend settlement records and current review statuses', () => {
  assert.match(source, /'settlementNo'/)
  assert.match(source, /'completedCount'/)
  assert.match(source, /'settlementStatusName'/)
  assert.match(source, /GENERATED/)
  assert.match(source, /REVIEWING/)
  assert.match(source, /CONFIRMED/)
  assert.match(source, /PAID/)
  assert.match(source, /headerMonthText\(\)/)
  assert.match(source, /formatMonth\(value\)/)
})

test('settlement page normalizes backend numeric settlement statuses to numeric canonical keys', () => {
  const component = loadComponentOptions()
  const ctx = createPageContext(component)

  assert.equal(component.methods.normalizeStatus.call(ctx, 0), '0')
  assert.equal(component.methods.normalizeStatus.call(ctx, 1), '1')
  assert.equal(component.methods.normalizeStatus.call(ctx, 2), '2')
  assert.equal(component.methods.normalizeStatus.call(ctx, 3), '3')
  assert.equal(component.methods.normalizeStatus.call(ctx, 'generated'), '0')
  assert.equal(component.methods.normalizeStatus.call(ctx, 'REVIEWING'), '1')
  assert.equal(component.methods.normalizeStatus.call(ctx, 'CONFIRMED'), '2')
  assert.equal(component.methods.normalizeStatus.call(ctx, 'PAID'), '3')

  const records = [0, 1, 2, 3].map((status, index) => component.methods.normalizeItem.call(ctx, {
    id: 'SET-' + status,
    settlementMonth: '2026-05',
    statusCode: status
  }, 1, index))

  assert.deepEqual(records.map(item => item.statusText), ['待确认', '复核中', '待发放', '已发放'])
  assert.deepEqual(records.map(item => item.statusTone), ['warning', 'info', 'warning', 'success'])
})

test('settlement page displays payable amount as base salary plus gross commission when available', () => {
  const component = loadComponentOptions()
  const ctx = createPageContext(component)

  const item = component.methods.normalizeItem.call(ctx, {
    settlementMonth: '2026-05',
    completedCount: 6,
    baseSalary: 3000,
    chefCommission: 560,
    payableAmount: 3360,
    violationDeduction: 200
  }, 1, 0)

  assert.equal(item.displayPayableAmount, 3560)
  assert.equal(item.payableAmount, 3360)
})

test('settlement page routes completed-count metric to chef completed orders without bubbling to detail', () => {
  assert.match(source, /class="metric complete-count-metric"[\s\S]*@click\.stop="goCompletedOrders\(item\)"/)
  assert.match(source, /goCompletedOrders\(item\)/)

  const navigatedUrls = []
  const component = loadComponentOptions({
    navigateTo({ url }) {
      navigatedUrls.push(url)
    }
  })
  const ctx = createPageContext(component)

  component.methods.goCompletedOrders.call(ctx, {
    id: 'SETTLE-202605',
    month: '2026-05'
  })

  assert.deepEqual(navigatedUrls, ['/pages/work/orders?tab=done'])
})

test('settlement page routes payable-amount metric and remaining card area to settlement detail', () => {
  assert.match(source, /class="metric payable-amount-metric"[\s\S]*@click\.stop="goDetail\(item\)"/)
  assert.match(source, /class="settlement-card"[\s\S]*@click="goDetail\(item\)"/)

  const navigatedUrls = []
  const component = loadComponentOptions({
    navigateTo({ url }) {
      navigatedUrls.push(url)
    }
  })
  const ctx = createPageContext(component)

  component.methods.goDetail.call(ctx, {
    id: 'SETTLE-202605',
    month: '2026-05'
  })

  assert.deepEqual(navigatedUrls, ['/pages/work/settlement-detail?id=SETTLE-202605&month=2026-05'])
})
