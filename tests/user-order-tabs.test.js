const test = require('node:test');
const assert = require('node:assert/strict');

const orderTabs = require('../utils/user-order-tabs');

test('exposes four user order tabs in requested order', () => {
  assert.deepEqual(orderTabs.USER_ORDER_TABS, [
    { label: '已预约订单', value: 'reserved' },
    { label: '待支付订单', value: 'payment' },
    { label: '服务中订单', value: 'serving' },
    { label: '已完成订单', value: 'completed' }
  ]);
});

test('maps user order statuses into the expected tab groups', () => {
  assert.equal(orderTabs.tabOfStatus('WAITING_RESPONSE'), 'reserved');
  assert.equal(orderTabs.tabOfStatus('WAITING_PAY'), 'payment');
  assert.equal(orderTabs.tabOfStatus('PRICE_OBJECTION'), 'payment');
  assert.equal(orderTabs.tabOfStatus('WAITING_SERVICE'), 'serving');
  assert.equal(orderTabs.tabOfStatus('WAITING_CONFIRM'), 'serving');
  assert.equal(orderTabs.tabOfStatus('COMPLETED'), 'completed');
  assert.equal(orderTabs.tabOfStatus('REJECTED_CLOSED'), 'completed');
  assert.equal(orderTabs.tabOfStatus('REFUNDING'), 'completed');
});

test('returns backend status groups for each tab', () => {
  assert.deepEqual(orderTabs.statusesOfTab('reserved'), ['WAITING_RESPONSE']);
  assert.deepEqual(orderTabs.statusesOfTab('payment'), ['WAITING_PAY', 'PRICE_OBJECTION']);
  assert.deepEqual(orderTabs.statusesOfTab('serving'), ['WAITING_SERVICE', 'WAITING_CONFIRM']);
  assert.ok(orderTabs.statusesOfTab('completed').includes('COMPLETED'));
  assert.ok(orderTabs.statusesOfTab('completed').includes('CANCELED'));
});
