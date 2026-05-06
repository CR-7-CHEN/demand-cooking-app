const USER_ORDER_TABS = [
  { label: '已预约订单', value: 'reserved' },
  { label: '待支付订单', value: 'payment' },
  { label: '服务中订单', value: 'serving' },
  { label: '已完成订单', value: 'completed' }
];

const USER_ORDER_STATUS_GROUPS = {
  reserved: ['WAITING_RESPONSE'],
  payment: ['WAITING_PAY', 'PRICE_OBJECTION'],
  serving: ['WAITING_SERVICE', 'WAITING_CONFIRM'],
  completed: [
    'COMPLETED',
    'REJECTED_CLOSED',
    'RESPONSE_TIMEOUT_CLOSED',
    'OBJECTION_TIMEOUT_CLOSED',
    'PAY_TIMEOUT_CLOSED',
    'CANCELED',
    'REFUNDING',
    'REFUNDED',
    'REFUND_FAILED'
  ]
};

function normalizeStatus(status) {
  return String(status || '').trim().toUpperCase();
}

function statusesOfTab(tab) {
  return USER_ORDER_STATUS_GROUPS[tab] ? USER_ORDER_STATUS_GROUPS[tab].slice() : [];
}

function tabOfStatus(status) {
  const normalized = normalizeStatus(status);
  const keys = Object.keys(USER_ORDER_STATUS_GROUPS);
  for (const key of keys) {
    if (USER_ORDER_STATUS_GROUPS[key].indexOf(normalized) > -1) {
      return key;
    }
  }
  return 'completed';
}

module.exports = {
  USER_ORDER_TABS,
  USER_ORDER_STATUS_GROUPS,
  normalizeStatus,
  statusesOfTab,
  tabOfStatus
};
