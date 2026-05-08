const ORDER_STATUS = Object.freeze({
  WAITING_RESPONSE: 0,
  WAITING_PAY: 1,
  PRICE_OBJECTION: 2,
  WAITING_SERVICE: 3,
  WAITING_CONFIRM: 4,
  COMPLETED: 5,
  CLOSED: 'CLOSED'
});

const NUMBER_STATUS_MAP = Object.freeze({
  0: ORDER_STATUS.WAITING_RESPONSE,
  1: ORDER_STATUS.WAITING_PAY,
  2: ORDER_STATUS.PRICE_OBJECTION,
  3: ORDER_STATUS.WAITING_SERVICE,
  4: ORDER_STATUS.WAITING_CONFIRM,
  5: ORDER_STATUS.COMPLETED
});

const STATUS_NUMBER_MAP = Object.freeze({
  WAITING_RESPONSE: ORDER_STATUS.WAITING_RESPONSE,
  WAITING_PAY: ORDER_STATUS.WAITING_PAY,
  PRICE_OBJECTION: ORDER_STATUS.PRICE_OBJECTION,
  WAITING_SERVICE: ORDER_STATUS.WAITING_SERVICE,
  WAITING_CONFIRM: ORDER_STATUS.WAITING_CONFIRM,
  COMPLETED: ORDER_STATUS.COMPLETED
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

const CLOSED_STATUSES = [
  'REJECTED_CLOSED',
  'RESPONSE_TIMEOUT_CLOSED',
  'OBJECTION_TIMEOUT_CLOSED',
  'PAY_TIMEOUT_CLOSED',
  'CANCELED',
  'REFUNDING',
  'REFUNDED',
  'REFUND_FAILED'
];

const CLOSED_STATUS_SET = new Set(CLOSED_STATUSES);

const USER_ORDER_STATUS_GROUPS = Object.freeze({
  reserved: [ORDER_STATUS.WAITING_RESPONSE],
  payment: [ORDER_STATUS.WAITING_PAY, ORDER_STATUS.PRICE_OBJECTION],
  serving: [ORDER_STATUS.WAITING_SERVICE, ORDER_STATUS.WAITING_CONFIRM],
  completed: [ORDER_STATUS.COMPLETED]
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
  if (normalized === ORDER_STATUS.WAITING_SERVICE || normalized === ORDER_STATUS.WAITING_CONFIRM) {
    return 'serving';
  }
  if (normalized === ORDER_STATUS.COMPLETED) {
    return 'completed';
  }
  if (normalized === ORDER_STATUS.CLOSED) {
    return 'closed';
  }
  return '';
}

function isOrderStatus(status, key) {
  const normalizedStatus = normalizeOrderStatus(status);
  const normalizedKey = normalizeOrderStatus(key);
  return normalizedStatus !== '' && normalizedStatus === normalizedKey;
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

module.exports = {
  ORDER_STATUS,
  NUMBER_STATUS_MAP,
  STATUS_NUMBER_MAP,
  CLOSED_STATUSES,
  USER_ORDER_STATUS_GROUPS,
  normalizeOrderStatus,
  orderStatusGroup,
  isOrderStatus,
  isCompletedOrder,
  statusesOfUserTab,
  tabOfUserStatus
};
