const ORDER_STATUS = Object.freeze({
  WAITING_RESPONSE: 0,
  WAITING_PAY: 1,
  PRICE_OBJECTION: 2,
  WAITING_SERVICE: 3,
  WAITING_CONFIRM: 4,
  COMPLETED: 5,
  REJECTED_CLOSED: 6,
  RESPONSE_TIMEOUT_CLOSED: 7,
  OBJECTION_TIMEOUT_CLOSED: 8,
  PAY_TIMEOUT_CLOSED: 9,
  CANCELED: 10,
  REFUNDING: 11,
  REFUNDED: 12,
  REFUND_FAILED: 13,
  CLOSED: 'CLOSED'
});

const NUMBER_STATUS_MAP = Object.freeze({
  0: ORDER_STATUS.WAITING_RESPONSE,
  1: ORDER_STATUS.WAITING_PAY,
  2: ORDER_STATUS.PRICE_OBJECTION,
  3: ORDER_STATUS.WAITING_SERVICE,
  4: ORDER_STATUS.WAITING_CONFIRM,
  5: ORDER_STATUS.COMPLETED,
  6: ORDER_STATUS.REJECTED_CLOSED,
  7: ORDER_STATUS.RESPONSE_TIMEOUT_CLOSED,
  8: ORDER_STATUS.OBJECTION_TIMEOUT_CLOSED,
  9: ORDER_STATUS.PAY_TIMEOUT_CLOSED,
  10: ORDER_STATUS.CANCELED,
  11: ORDER_STATUS.REFUNDING,
  12: ORDER_STATUS.REFUNDED,
  13: ORDER_STATUS.REFUND_FAILED
});

const STATUS_NUMBER_MAP = Object.freeze({
  WAITING_RESPONSE: ORDER_STATUS.WAITING_RESPONSE,
  WAITING_PAY: ORDER_STATUS.WAITING_PAY,
  PRICE_OBJECTION: ORDER_STATUS.PRICE_OBJECTION,
  WAITING_SERVICE: ORDER_STATUS.WAITING_SERVICE,
  WAITING_CONFIRM: ORDER_STATUS.WAITING_CONFIRM,
  COMPLETED: ORDER_STATUS.COMPLETED,
  REJECTED_CLOSED: ORDER_STATUS.REJECTED_CLOSED,
  RESPONSE_TIMEOUT_CLOSED: ORDER_STATUS.RESPONSE_TIMEOUT_CLOSED,
  OBJECTION_TIMEOUT_CLOSED: ORDER_STATUS.OBJECTION_TIMEOUT_CLOSED,
  PAY_TIMEOUT_CLOSED: ORDER_STATUS.PAY_TIMEOUT_CLOSED,
  CANCELED: ORDER_STATUS.CANCELED,
  REFUNDING: ORDER_STATUS.REFUNDING,
  REFUNDED: ORDER_STATUS.REFUNDED,
  REFUND_FAILED: ORDER_STATUS.REFUND_FAILED
});

const STATUS_ALIASES = Object.freeze({
  WAIT_CHEF_RESPONSE: ORDER_STATUS.WAITING_RESPONSE,
  PENDING_RESPONSE: ORDER_STATUS.WAITING_RESPONSE,
  WAIT_RESPONSE: ORDER_STATUS.WAITING_RESPONSE,
  QUOTE_DISPUTE: ORDER_STATUS.PRICE_OBJECTION,
  QUOTE_OBJECTION: ORDER_STATUS.PRICE_OBJECTION,
  DISPUTE: ORDER_STATUS.PRICE_OBJECTION,
  WAIT_SERVICE: ORDER_STATUS.WAITING_SERVICE,
  PENDING_SERVICE: ORDER_STATUS.WAITING_SERVICE,
  WAIT_USER_CONFIRM: ORDER_STATUS.WAITING_CONFIRM,
  PENDING_CONFIRM: ORDER_STATUS.WAITING_CONFIRM,
  WAIT_CONFIRM: ORDER_STATUS.WAITING_CONFIRM
});

const REFUND_STATUSES = Object.freeze([
  ORDER_STATUS.REFUNDING,
  ORDER_STATUS.REFUNDED,
  ORDER_STATUS.REFUND_FAILED
]);

const CLOSED_STATUSES = [
  ORDER_STATUS.REJECTED_CLOSED,
  ORDER_STATUS.RESPONSE_TIMEOUT_CLOSED,
  ORDER_STATUS.OBJECTION_TIMEOUT_CLOSED,
  ORDER_STATUS.PAY_TIMEOUT_CLOSED,
  ORDER_STATUS.CANCELED,
  ...REFUND_STATUSES
];

const REFUND_STATUS_SET = new Set(REFUND_STATUSES);
const CLOSED_STATUS_SET = new Set(CLOSED_STATUSES);

const DEFAULT_STATUS_TEXT_MAP = Object.freeze({
  [ORDER_STATUS.WAITING_RESPONSE]: '待响应',
  [ORDER_STATUS.WAITING_PAY]: '待支付',
  [ORDER_STATUS.PRICE_OBJECTION]: '异议中',
  [ORDER_STATUS.WAITING_SERVICE]: '待服务',
  [ORDER_STATUS.WAITING_CONFIRM]: '待确认',
  [ORDER_STATUS.COMPLETED]: '已完成',
  [ORDER_STATUS.REJECTED_CLOSED]: '已拒绝',
  [ORDER_STATUS.RESPONSE_TIMEOUT_CLOSED]: '响应超时关闭',
  [ORDER_STATUS.OBJECTION_TIMEOUT_CLOSED]: '异议超时关闭',
  [ORDER_STATUS.PAY_TIMEOUT_CLOSED]: '支付超时关闭',
  [ORDER_STATUS.CANCELED]: '已取消',
  [ORDER_STATUS.REFUNDING]: '退款中',
  [ORDER_STATUS.REFUNDED]: '已退款',
  [ORDER_STATUS.REFUND_FAILED]: '退款失败',
  REJECTED_CLOSED: '已拒绝',
  RESPONSE_TIMEOUT_CLOSED: '响应超时关闭',
  OBJECTION_TIMEOUT_CLOSED: '异议超时关闭',
  PAY_TIMEOUT_CLOSED: '支付超时关闭',
  CANCELED: '已取消',
  REFUNDING: '退款中',
  REFUNDED: '已退款',
  REFUND_FAILED: '退款失败'
});

const USER_ORDER_STATUS_GROUPS = Object.freeze({
  reserved: [ORDER_STATUS.WAITING_RESPONSE],
  payment: [ORDER_STATUS.WAITING_PAY, ORDER_STATUS.PRICE_OBJECTION],
  paid: [ORDER_STATUS.WAITING_SERVICE],
  serving: [ORDER_STATUS.WAITING_SERVICE, ORDER_STATUS.WAITING_CONFIRM],
  completed: [ORDER_STATUS.COMPLETED],
  closed: CLOSED_STATUSES.slice()
});

function normalizeOrderStatus(status) {
  if (status === null || status === undefined) {
    return '';
  }

  const raw = String(status).trim().toUpperCase();
  if (raw === '') {
    return '';
  }

  if (Object.prototype.hasOwnProperty.call(NUMBER_STATUS_MAP, raw)) {
    return NUMBER_STATUS_MAP[raw];
  }

  if (Object.prototype.hasOwnProperty.call(STATUS_ALIASES, raw)) {
    return STATUS_ALIASES[raw];
  }

  if (Object.prototype.hasOwnProperty.call(STATUS_NUMBER_MAP, raw)) {
    return STATUS_NUMBER_MAP[raw];
  }

  if (CLOSED_STATUS_SET.has(raw)) {
    return ORDER_STATUS.CLOSED;
  }

  return '';
}

function orderStatusGroup(status) {
  const normalized = normalizeOrderStatus(status);
  if (normalized === ORDER_STATUS.WAITING_RESPONSE) {
    return 'reserved';
  }
  if (normalized === ORDER_STATUS.WAITING_PAY || normalized === ORDER_STATUS.PRICE_OBJECTION) {
    return 'payment';
  }
  if (normalized === ORDER_STATUS.WAITING_SERVICE) {
    return 'paid';
  }
  if (normalized === ORDER_STATUS.WAITING_CONFIRM) {
    return 'serving';
  }
  if (normalized === ORDER_STATUS.COMPLETED) {
    return 'completed';
  }
  if (normalized === ORDER_STATUS.CLOSED || CLOSED_STATUS_SET.has(normalized)) {
    return 'closed';
  }
  return '';
}

function isOrderStatus(status, key) {
  const normalizedStatus = normalizeOrderStatus(status);
  const normalizedKey = normalizeOrderStatus(key);
  return normalizedStatus !== '' && normalizedStatus === normalizedKey;
}

function isRefundOrderStatus(status) {
  if (status === null || status === undefined) {
    return false;
  }

  const raw = String(status).trim().toUpperCase();
  if (raw === '') {
    return false;
  }

  const normalized = normalizeOrderStatus(status);
  return REFUND_STATUS_SET.has(normalized) || REFUND_STATUS_SET.has(raw);
}

function isCompletedOrder(status) {
  return isOrderStatus(status, ORDER_STATUS.COMPLETED);
}

function statusesOfUserTab(tab) {
  return USER_ORDER_STATUS_GROUPS[tab] ? USER_ORDER_STATUS_GROUPS[tab].slice() : [];
}

function tabOfUserStatus(status) {
  const group = orderStatusGroup(status);
  return USER_ORDER_STATUS_GROUPS[group] ? group : '';
}

function displayOrderStatusText(status, overrideMap) {
  if (status === null || status === undefined) {
    return '';
  }

  const rawText = String(status).trim();
  if (!rawText) {
    return '';
  }

  const rawStatus = rawText.toUpperCase();
  const normalized = normalizeOrderStatus(status);
  const map = overrideMap || {};

  if (Object.prototype.hasOwnProperty.call(map, normalized)) {
    return map[normalized];
  }

  if (Object.prototype.hasOwnProperty.call(map, rawStatus)) {
    return map[rawStatus];
  }

  if (Object.prototype.hasOwnProperty.call(DEFAULT_STATUS_TEXT_MAP, normalized)) {
    return DEFAULT_STATUS_TEXT_MAP[normalized];
  }

  if (Object.prototype.hasOwnProperty.call(DEFAULT_STATUS_TEXT_MAP, rawStatus)) {
    return DEFAULT_STATUS_TEXT_MAP[rawStatus];
  }

  return /^[A-Z0-9_]+$/.test(rawText) ? '' : rawText;
}

module.exports = {
  ORDER_STATUS,
  NUMBER_STATUS_MAP,
  STATUS_NUMBER_MAP,
  CLOSED_STATUSES,
  USER_ORDER_STATUS_GROUPS,
  normalizeOrderStatus,
  orderStatusGroup,
  isOrderStatus,
  isRefundOrderStatus,
  isCompletedOrder,
  displayOrderStatusText,
  statusesOfUserTab,
  tabOfUserStatus
};
