const test = require('node:test');
const assert = require('node:assert/strict');

const {
  ORDER_STATUS,
  CLOSED_STATUSES,
  displayOrderStatusText,
  normalizeOrderStatus,
  orderStatusGroup,
  isOrderStatus,
  isRefundOrderStatus,
  isCompletedOrder,
  statusesOfUserTab,
  tabOfUserStatus
} = require('../utils/order-status');

test('normalizes numeric and backend order statuses to the same canonical value', () => {
  assert.equal(ORDER_STATUS.WAITING_RESPONSE, 0);
  assert.equal(ORDER_STATUS.WAITING_PAY, 1);
  assert.equal(ORDER_STATUS.PRICE_OBJECTION, 2);
  assert.equal(ORDER_STATUS.WAITING_SERVICE, 3);
  assert.equal(ORDER_STATUS.WAITING_CONFIRM, 4);
  assert.equal(ORDER_STATUS.COMPLETED, 5);
  assert.equal(normalizeOrderStatus(0), 0);
  assert.equal(normalizeOrderStatus('1'), 1);
  assert.equal(normalizeOrderStatus(2), 2);
  assert.equal(normalizeOrderStatus('WAITING_SERVICE'), 3);
  assert.equal(normalizeOrderStatus(' waiting_confirm '), 4);
  assert.equal(normalizeOrderStatus(5), 5);
});

test('groups numeric order statuses by user order lifecycle', () => {
  assert.equal(orderStatusGroup(0), 'reserved');
  assert.equal(orderStatusGroup(1), 'payment');
  assert.equal(orderStatusGroup(2), 'payment');
  assert.equal(orderStatusGroup(3), 'paid');
  assert.equal(orderStatusGroup(4), 'serving');
  assert.equal(orderStatusGroup(5), 'completed');
});

test('treats only numeric 5 and COMPLETED as completed orders', () => {
  assert.equal(isCompletedOrder(5), true);
  assert.equal(isCompletedOrder('5'), true);
  assert.equal(isCompletedOrder('COMPLETED'), true);
  assert.equal(isCompletedOrder('REJECTED_CLOSED'), false);
  assert.equal(isCompletedOrder('CANCELED'), false);
  assert.equal(isCompletedOrder('REFUNDING'), false);
  assert.equal(isCompletedOrder('UNKNOWN_STATUS'), false);
  assert.equal(isCompletedOrder(undefined), false);
});

test('matches status by normalized canonical key', () => {
  assert.equal(isOrderStatus(0, ORDER_STATUS.WAITING_RESPONSE), true);
  assert.equal(isOrderStatus('0', ORDER_STATUS.WAITING_RESPONSE), true);
  assert.equal(isOrderStatus('WAITING_RESPONSE', ORDER_STATUS.WAITING_RESPONSE), true);
  assert.equal(isOrderStatus('WAITING_PAY', ORDER_STATUS.WAITING_RESPONSE), false);
});

test('detects refund lifecycle statuses before chef pages map tabs locally', () => {
  assert.equal(isRefundOrderStatus('REFUNDING'), true);
  assert.equal(isRefundOrderStatus('REFUNDED'), true);
  assert.equal(isRefundOrderStatus('REFUND_FAILED'), true);
  assert.equal(isRefundOrderStatus('CANCELED'), false);
  assert.equal(isRefundOrderStatus(ORDER_STATUS.COMPLETED), false);
});

test('maps closed and unknown statuses away from active or completed groups', () => {
  assert.equal(orderStatusGroup('REJECTED_CLOSED'), 'closed');
  assert.equal(orderStatusGroup('CANCELED'), 'closed');
  assert.equal(orderStatusGroup('REFUNDING'), 'closed');
  assert.equal(orderStatusGroup('NOT_A_REAL_STATUS'), '');
});

test('exposes numeric user tab status groups from the shared status utility', () => {
  assert.deepEqual(statusesOfUserTab('reserved'), [0]);
  assert.deepEqual(statusesOfUserTab('payment'), [1, 2]);
  assert.deepEqual(statusesOfUserTab('paid'), [3]);
  assert.deepEqual(statusesOfUserTab('serving'), [3, 4]);
  assert.deepEqual(statusesOfUserTab('completed'), [5]);
  assert.deepEqual(statusesOfUserTab('closed'), CLOSED_STATUSES);
  assert.equal(tabOfUserStatus(0), 'reserved');
  assert.equal(tabOfUserStatus(3), 'paid');
  assert.equal(tabOfUserStatus('WAITING_CONFIRM'), 'serving');
  assert.equal(tabOfUserStatus('COMPLETED'), 'completed');
  assert.equal(tabOfUserStatus('CANCELED'), 'closed');
});

test('maps backend english status enums to readable Chinese copy', () => {
  assert.equal(displayOrderStatusText('REFUNDED'), '已退款');
  assert.equal(displayOrderStatusText('REFUNDING'), '退款中');
  assert.equal(displayOrderStatusText('WAITING_CONFIRM'), '待确认');
  assert.equal(displayOrderStatusText('COMPLETED'), '已完成');
  assert.equal(displayOrderStatusText('已退款'), '已退款');
});
