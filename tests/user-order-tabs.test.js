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
  assert.equal(orderTabs.tabOfUserStatus(0), 'reserved');
  assert.equal(orderTabs.tabOfUserStatus('WAITING_RESPONSE'), 'reserved');
  assert.equal(orderTabs.tabOfUserStatus(1), 'payment');
  assert.equal(orderTabs.tabOfUserStatus('PRICE_OBJECTION'), 'payment');
  assert.equal(orderTabs.tabOfUserStatus(3), 'serving');
  assert.equal(orderTabs.tabOfUserStatus('WAITING_CONFIRM'), 'serving');
  assert.equal(orderTabs.tabOfUserStatus(5), 'completed');
  assert.equal(orderTabs.tabOfUserStatus('COMPLETED'), 'completed');
  assert.equal(orderTabs.tabOfUserStatus('REJECTED_CLOSED'), '');
  assert.equal(orderTabs.tabOfUserStatus('REFUNDING'), '');
  assert.equal(orderTabs.tabOfUserStatus('UNKNOWN_STATUS'), '');
});

test('returns numeric query status groups for each tab', () => {
  assert.deepEqual(orderTabs.statusesOfUserTab('reserved'), [0]);
  assert.deepEqual(orderTabs.statusesOfUserTab('payment'), [1, 2]);
  assert.deepEqual(orderTabs.statusesOfUserTab('serving'), [3, 4]);
  assert.deepEqual(orderTabs.statusesOfUserTab('completed'), [5]);
  assert.deepEqual(orderTabs.statusesOfUserTab('unknown'), []);
});

test('keeps legacy tab helper aliases on the same numeric behavior', () => {
  assert.deepEqual(orderTabs.statusesOfTab('completed'), [5]);
  assert.equal(orderTabs.tabOfStatus('COMPLETED'), 'completed');
  assert.equal(orderTabs.tabOfStatus('CANCELED'), '');
});
