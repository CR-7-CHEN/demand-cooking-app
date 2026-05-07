const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const pageSource = fs.readFileSync(path.join(__dirname, '..', 'pages', 'user', 'orders.vue'), 'utf8');
const pagesConfig = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'pages.json'), 'utf8'));

test('user orders page uses pull-down refresh and no explicit refresh button', () => {
  assert.doesNotMatch(pageSource, /refresh-btn|刷新/);
  assert.match(pageSource, /onPullDownRefresh\(\)/);
  assert.match(pageSource, /uni\.stopPullDownRefresh\(\)/);

  const userOrdersPage = pagesConfig.pages.find(page => page.path === 'pages/user/orders');
  assert.ok(userOrdersPage, 'pages/user/orders should exist in pages.json');
  assert.equal(userOrdersPage.style && userOrdersPage.style.enablePullDownRefresh, true);
});
