const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')

const apiSource = fs.readFileSync(path.join(__dirname, '..', 'api', 'cooking', 'chef.js'), 'utf8')
const pagesSource = fs.readFileSync(path.join(__dirname, '..', 'pages.json'), 'utf8')
const detailPagePath = path.join(__dirname, '..', 'pages', 'work', 'settlement-detail.vue')

test('settlement detail api and route are wired for a dedicated detail page', () => {
  assert.match(apiSource, /export function getChefSettlementDetail\(id\) \{/)
  assert.match(apiSource, /url: `\/cooking\/settlement\/\$\{id\}`/)
  assert.match(pagesSource, /"path": "pages\/work\/settlement-detail"/)
  assert.match(pagesSource, /"navigationBarTitleText": "结算详情"/)
  assert.ok(fs.existsSync(detailPagePath))
})

test('settlement detail page loads settlement and orders by settlementId or month', () => {
  const source = fs.readFileSync(detailPagePath, 'utf8')

  assert.match(source, /import \{ getChefSettlementDetail, getChefOrderList \} from '@\/api\/cooking\/chef'/)
  assert.match(source, /onLoad\(options\)/)
  assert.match(source, /this\.settlementId\s*=\s*options\.id/)
  assert.match(source, /this\.queryMonth\s*=\s*options\.month/)
  assert.match(source, /getChefSettlementDetail\(this\.settlementId\)/)
  assert.match(source, /getChefOrderList\(\{[\s\S]*settlementId: this\.settlementId[\s\S]*month: this\.queryMonth/)
  assert.match(source, /return '订单明细'/)
  assert.match(source, /return '扣款说明'/)
})
