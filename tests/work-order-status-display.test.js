const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const appRoot = path.join(__dirname, '..');
const ordersSource = fs.readFileSync(path.join(appRoot, 'pages', 'work', 'orders.vue'), 'utf8');
const detailSource = fs.readFileSync(path.join(appRoot, 'pages', 'work', 'order-detail.vue'), 'utf8');
const settlementDetailSource = fs.readFileSync(path.join(appRoot, 'pages', 'work', 'settlement-detail.vue'), 'utf8');

test('chef order pages normalize backend english enums before rendering status copy', () => {
  assert.match(ordersSource, /displayOrderStatusText/);
  assert.match(detailSource, /displayOrderStatusText/);
  assert.match(settlementDetailSource, /displayOrderStatusText/);

  assert.doesNotMatch(ordersSource, /return order\.statusName \|\| order\.orderStatusName/);
  assert.doesNotMatch(detailSource, /return this\.order\.statusName \|\| this\.order\.orderStatusName/);
  assert.doesNotMatch(settlementDetailSource, /statusText:\s*order\.statusName \|\| order\.orderStatusName/);
});
