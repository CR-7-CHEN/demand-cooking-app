const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const appRoot = path.join(__dirname, '..');
const ordersSource = fs.readFileSync(path.join(appRoot, 'pages', 'user', 'orders.vue'), 'utf8');
const detailSource = fs.readFileSync(path.join(appRoot, 'pages', 'user', 'order-detail.vue'), 'utf8');

function computedBlock(source, name) {
  const match = source.match(new RegExp(`${name}\\(\\)\\s*{([\\s\\S]*?)\\n\\s*},`));
  assert.ok(match, `${name} computed block should exist`);
  return match[1];
}

test('ordinary user order pages import the shared numeric status utilities', () => {
  assert.match(ordersSource, /require\(['"]@\/utils\/order-status['"]\)/);
  assert.match(detailSource, /require\(['"]@\/utils\/order-status['"]\)/);
  assert.match(ordersSource, /require\(['"]@\/utils\/user-order-tabs['"]\)/);
});

test('order detail action guards use normalized status helpers instead of inline English arrays', () => {
  const guardedComputed = [
    'canObjection',
    'canCancel',
    'canConfirm',
    'canReview',
    'canComplaint'
  ];

  for (const name of guardedComputed) {
    const block = computedBlock(detailSource, name);
    assert.doesNotMatch(block, /\[[^\]]*['"][A-Z_]+['"][^\]]*\]/, `${name} should not define inline status arrays`);
    assert.doesNotMatch(block, /this\.order\.status\s*={2,3}\s*['"][A-Z_]+['"]/, `${name} should not compare raw status strings`);
  }

  assert.match(computedBlock(detailSource, 'canObjection'), /isOrderStatus\([^)]*WAITING_PAY/);
  assert.doesNotMatch(computedBlock(detailSource, 'canObjection'), /isOrderStatus\([^)]*['"][A-Z_]+['"]/);
  assert.match(computedBlock(detailSource, 'canObjection'), /objectionCount/);
  assert.match(computedBlock(detailSource, 'canObjection'), /ORDER_STATUS\.WAITING_PAY/);
  assert.match(computedBlock(detailSource, 'canConfirm'), /ORDER_STATUS\.WAITING_CONFIRM/);
  assert.doesNotMatch(computedBlock(detailSource, 'canConfirm'), /isOrderStatus\([^)]*['"][A-Z_]+['"]/);
  assert.match(computedBlock(detailSource, 'canReview'), /isCompletedOrder/);
  assert.match(computedBlock(detailSource, 'canComplaint'), /isCompletedOrder/);
});

test('user order detail hides cancel entry after backend marks service as started', () => {
  assert.match(detailSource, /hasServiceStarted\(\)/);
  assert.match(detailSource, /serviceStartedTime/);
  assert.match(detailSource, /serviceStarted/);
  assert.match(computedBlock(detailSource, 'canCancel'), /ORDER_STATUS\.WAITING_SERVICE/);
  assert.match(computedBlock(detailSource, 'canCancel'), /!this\.hasServiceStarted/);
  assert.doesNotMatch(computedBlock(detailSource, 'canCancel'), /ORDER_STATUS\.WAITING_SERVICE\)\s*$/m);
});

test('order list query uses tab helper status arrays and status text normalizes status first', () => {
  assert.match(ordersSource, /statuses:\s*orderTabs\.statusesOfTab\(this\.activeStatus\)/);
  assert.match(ordersSource, /statusGroup:\s*this\.activeStatus/);
  assert.match(ordersSource, /normalizeOrderStatus\(status\)/);
});

test('status text keeps English closed-status labels after numeric normalization', () => {
  assert.match(ordersSource, /const rawStatus = String\(status \|\| ''\)\.trim\(\)\.toUpperCase\(\)/);
  assert.match(ordersSource, /map\[normalized\]\s*\|\|\s*map\[rawStatus\]/);
  assert.match(detailSource, /const rawStatus = String\(status \|\| ''\)\.trim\(\)\.toUpperCase\(\)/);
  assert.match(detailSource, /map\[normalized\]\s*\|\|\s*map\[rawStatus\]/);
});
