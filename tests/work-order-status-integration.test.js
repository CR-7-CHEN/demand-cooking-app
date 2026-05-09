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

test('chef order pages rename confirm tab to user pending confirmation', () => {
  assert.match(ordersSource, /label:\s*'用户待确认'/);
  assert.doesNotMatch(ordersSource, /label:\s*'待确认'/);
});

test('chef order detail switches service action by backend started fields instead of local time inference', () => {
  assert.match(detailSource, /startServiceChefOrder/);
  assert.match(detailSource, /serviceActionText\(\)/);
  assert.match(detailSource, /hasServiceStarted\(\)/);
  assert.match(detailSource, /serviceStartedTime/);
  assert.match(detailSource, /serviceStarted/);
  assert.match(detailSource, /submitStartService\(\)/);
  assert.match(detailSource, /submitServiceAction\(\)/);
  assert.match(detailSource, /submitComplete\(\)/);
  assert.match(detailSource, /return this\.hasServiceStarted \? '服务完成' : '开始服务'/);
  assert.match(detailSource, /return this\.group === 'service' && !this\.hasServiceStarted/);
  assert.doesNotMatch(detailSource, /nowTime/);
  assert.doesNotMatch(detailSource, /Date\.parse/);
  assert.doesNotMatch(detailSource, /canCompleteNow/);
});

test('chef order detail uses dedicated confirm modal copy for start and complete actions', () => {
  assert.match(detailSource, /uni\.showModal\(\{[\s\S]*content:\s*'确认开始服务吗\?'/);
  assert.match(detailSource, /uni\.showModal\(\{[\s\S]*content:\s*'确认开始服务吗\?'[\s\S]*cancelText:\s*'取消'[\s\S]*confirmText:\s*'确认'/);
  assert.match(detailSource, /uni\.showModal\(\{[\s\S]*content:\s*'服务确认完成了吗\?'/);
  assert.match(detailSource, /uni\.showModal\(\{[\s\S]*content:\s*'服务确认完成了吗\?'[\s\S]*cancelText:\s*'取消'[\s\S]*confirmText:\s*'确认完成'/);
});

test('chef order detail shows reject-service popup with required reason before cancel request', () => {
  assert.match(detailSource, /ref="rejectServicePopup"/);
  assert.match(detailSource, /@click="openRejectServicePopup"/);
  assert.match(detailSource, /submitRejectService\(\)/);
  assert.match(detailSource, /closeRejectServicePopup\(\)/);
  assert.match(detailSource, /v-model\.trim="rejectServiceReasonInput"/);
  assert.match(detailSource, /reject-service-dialog/);
});

test('chef order detail centers the pending service section title only for that block', () => {
  assert.match(detailSource, /<view class="section-title section-title--center">待服务处理<\/view>/);
  assert.match(detailSource, /\.section-title--center\s*\{[\s\S]*text-align:\s*center;/);
});

test('chef workbench summary uses unified grouping and strict completion checks', () => {
  assert.match(workbenchSource, /isCompletedOrder/);
  assert.match(workbenchSource, /waitResponse/);
  assert.match(workbenchSource, /todayService/);
  assert.match(workbenchSource, /monthDone/);
  assert.doesNotMatch(workbenchSource, /FINISHED/);
  assert.doesNotMatch(workbenchSource, /DONE/);
});
