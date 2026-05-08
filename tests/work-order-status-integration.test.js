const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const readSource = (...parts) => fs.readFileSync(path.join(root, ...parts), 'utf8');

const ordersSource = readSource('pages', 'work', 'orders.vue');
const detailSource = readSource('pages', 'work', 'order-detail.vue');
const workbenchSource = readSource('pages', 'work', 'index.vue');

test('chef work order pages route tab and action state through the unified order status helper', () => {
  for (const source of [ordersSource, detailSource, workbenchSource]) {
    assert.match(source, /@\/utils\/order-status/);
    assert.match(source, /normalizeOrderStatus/);
  }

  assert.match(ordersSource, /tabOf\(order\)/);
  assert.match(detailSource, /group\(\)/);
  assert.doesNotMatch(ordersSource, /QUOTE_DISPUTE/);
  assert.doesNotMatch(detailSource, /QUOTE_DISPUTE/);
});

test('chef work pages map current backend statuses to chef-side groups through the helper', () => {
  for (const source of [ordersSource, detailSource, workbenchSource]) {
    assert.match(source, /WAITING_RESPONSE/);
    assert.match(source, /PRICE_OBJECTION/);
    assert.match(source, /WAITING_SERVICE/);
    assert.match(source, /WAITING_CONFIRM/);
    assert.match(source, /COMPLETED/);
  }

  assert.match(detailSource, /canHandleDispute\(\)/);
  assert.match(detailSource, /canComplete\(\)/);
  assert.match(detailSource, /canChefCancel\(\)/);
});

test('chef workbench summary uses unified grouping and strict completion checks', () => {
  assert.match(workbenchSource, /isCompletedOrder/);
  assert.match(workbenchSource, /waitResponse/);
  assert.match(workbenchSource, /todayService/);
  assert.match(workbenchSource, /monthDone/);
  assert.doesNotMatch(workbenchSource, /FINISHED/);
  assert.doesNotMatch(workbenchSource, /DONE/);
});
