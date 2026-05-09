const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')

const pagesJsonPath = path.join(__dirname, '..', 'pages.json')

test('work tab static defaults show service center before role-specific runtime relabeling', () => {
  const pagesConfig = JSON.parse(fs.readFileSync(pagesJsonPath, 'utf8'))
  const workPage = pagesConfig.pages.find(item => item.path === 'pages/work/index')
  const workTab = pagesConfig.tabBar.list.find(item => item.pagePath === 'pages/work/index')

  assert.equal(workPage && workPage.style.navigationBarTitleText, '服务中心')
  assert.equal(workTab && workTab.text, '服务中心')
})
