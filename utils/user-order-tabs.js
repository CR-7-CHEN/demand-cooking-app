const orderStatus = require('./order-status');

const USER_ORDER_TABS = [
  { label: '已预约订单', value: 'reserved' },
  { label: '待支付订单', value: 'payment' },
  { label: '服务中订单', value: 'serving' },
  { label: '已完成订单', value: 'completed' },
  { label: '已关闭订单', value: 'closed' }
];

function statusesOfUserTab(tab) {
  return orderStatus.statusesOfUserTab(tab);
}

function tabOfUserStatus(status) {
  return orderStatus.tabOfUserStatus(status);
}

module.exports = {
  USER_ORDER_TABS,
  USER_ORDER_STATUS_GROUPS: orderStatus.USER_ORDER_STATUS_GROUPS,
  statusesOfUserTab,
  tabOfUserStatus,
  statusesOfTab: statusesOfUserTab,
  tabOfStatus: tabOfUserStatus
};
