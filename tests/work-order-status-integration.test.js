const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.join(__dirname, '..');
const readSource = (...parts) => fs.readFileSync(path.join(root, ...parts), 'utf8');

const ordersPagePath = path.join(root, 'pages', 'work', 'orders.vue');
const ordersSource = readSource('pages', 'work', 'orders.vue');
const detailSource = readSource('pages', 'work', 'order-detail.vue');
const workbenchSource = readSource('pages', 'work', 'index.vue');

function loadOrdersComponent(apiOverrides = {}) {
  const match = ordersSource.match(/<script>([\s\S]*?)<\/script>/);
  assert.ok(match, 'expected orders page to contain a script block');

  const script = match[1]
    .replace(
      /import\s+\{[\s\S]*?\}\s+from\s+'@\/api\/cooking\/chef'\s*/,
      [
        'const getChefOrderList = globalThis.__testApi.getChefOrderList',
        'const getChefWorkbench = globalThis.__testApi.getChefWorkbench'
      ].join('\n') + '\n'
    )
    .replace(
      /const orderStatus = require\('@\/utils\/order-status'\)/,
      `const orderStatus = require(${JSON.stringify(path.join(root, 'utils', 'order-status.js'))})`
    )
    .replace(/export default/, 'module.exports =');

  const sandbox = {
    module: { exports: {} },
    exports: {},
    require,
    console,
    Promise,
    setTimeout,
    clearTimeout,
    uni: {
      stopPullDownRefresh() {}
    },
    globalThis: {
      __testApi: {
        getChefOrderList: () => Promise.resolve({ data: { rows: [] } }),
        getChefWorkbench: () => Promise.resolve({ data: {} }),
        ...apiOverrides
      }
    }
  };

  vm.runInNewContext(script, sandbox, { filename: ordersPagePath });
  return sandbox.module.exports;
}

function createOrdersContext(component, overrides = {}) {
  const ctx = {
    ...(component.data ? component.data() : {}),
    $modal: {
      showToast() {}
    },
    $tab: {
      navigateTo() {}
    },
    ...overrides
  };

  Object.assign(ctx, component.methods);

  Object.entries(component.computed || {}).forEach(([name, getter]) => {
    Object.defineProperty(ctx, name, {
      configurable: true,
      enumerable: true,
      get() {
        return getter.call(ctx);
      }
    });
  });

  return ctx;
}

function toPlain(value) {
  return JSON.parse(JSON.stringify(value));
}

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

test('chef orders isolate refunded statuses into a dedicated refund tab', () => {
  const component = loadOrdersComponent();
  const ctx = createOrdersContext(component, {
    orders: [
      { id: 1, status: 'WAITING_RESPONSE' },
      { id: 2, status: 'REFUNDED' },
      { id: 3, status: 'REFUNDING' },
      { id: 4, status: 'REFUND_FAILED' },
      { id: 5, status: 'COMPLETED' }
    ]
  });

  assert.equal(ctx.tabOf(ctx.orders[0]), 'response');
  assert.equal(ctx.tabOf(ctx.orders[1]), 'refund');
  assert.equal(ctx.tabOf(ctx.orders[2]), 'refund');
  assert.equal(ctx.tabOf(ctx.orders[3]), 'refund');
  assert.equal(ctx.tabOf(ctx.orders[4]), 'done');

  ctx.activeTab = 'refund';
  assert.deepEqual(
    toPlain(ctx.filteredOrders).map(order => order.id),
    [2, 3, 4]
  );
});

test('chef orders prefer backend workbench stats for tab counts and fall back to local orders', async () => {
  const component = loadOrdersComponent({
    getChefOrderList: () => Promise.resolve({
      data: {
        rows: [
          { id: 1, status: 'WAITING_RESPONSE' },
          { id: 2, status: 'WAITING_RESPONSE' },
          { id: 3, status: 'WAITING_SERVICE' },
          { id: 4, status: 'PRICE_OBJECTION' },
          { id: 5, status: 'REFUNDED' },
          { id: 6, status: 'REFUND_FAILED' },
          { id: 7, status: 'COMPLETED' }
        ]
      }
    }),
    getChefWorkbench: () => Promise.resolve({
      data: {
        orderTotalCount: 88,
        waitingResponseCount: 11,
        waitingServiceCount: 7,
        disputeCount: 5,
        refundedCount: 3
      }
    })
  });
  const ctx = createOrdersContext(component);

  await component.methods.load.call(ctx);

  assert.equal(ctx.tabCountOf('response'), 11);
  assert.equal(ctx.tabCountOf('service'), 7);
  assert.equal(ctx.tabCountOf('dispute'), 5);
  assert.equal(ctx.tabCountOf('refund'), 3);

  ctx.orderStats = null;
  assert.equal(ctx.tabCountOf('response'), 2);
  assert.equal(ctx.tabCountOf('service'), 1);
  assert.equal(ctx.tabCountOf('dispute'), 1);
  assert.equal(ctx.tabCountOf('refund'), 2);
});

test('chef orders keep completed tab count hidden while showing active tab counts', () => {
  const component = loadOrdersComponent();
  const ctx = createOrdersContext(component, {
    orders: [
      { id: 1, status: 'WAITING_RESPONSE' },
      { id: 2, status: 'COMPLETED' }
    ]
  });

  const doneTab = ctx.tabs.find(tab => tab.value === 'done');
  const responseTab = ctx.tabs.find(tab => tab.value === 'response');
  const refundTab = ctx.tabs.find(tab => tab.value === 'refund');

  assert.equal(component.methods.showTabCount.call(ctx, doneTab), false);
  assert.equal(component.methods.showTabCount.call(ctx, responseTab), true);
  assert.equal(component.methods.showTabCount.call(ctx, refundTab), false);
  assert.match(ordersSource, /class="tab-content"/);
  assert.match(ordersSource, /class="tab-badge"/);
  assert.doesNotMatch(ordersSource, /tabLabel\(tab\)/);
  assert.equal(component.methods.formatTabCount.call(ctx, 0), '0');
  assert.equal(component.methods.formatTabCount.call(ctx, 12), '12');
  assert.equal(component.methods.formatTabCount.call(ctx, 120), '99+');
});

test('chef order pages rename confirm tab to user pending confirmation', () => {
  assert.match(ordersSource, /label:\s*'\u7528\u6237\u5f85\u786e\u8ba4'/);
  assert.doesNotMatch(ordersSource, /label:\s*'\u5f85\u786e\u8ba4'/);
});

test('chef orders keep the requested tab display order', () => {
  const component = loadOrdersComponent();
  const ctx = createOrdersContext(component);

  assert.deepEqual(
    toPlain(ctx.tabs.map(tab => tab.value)),
    ['all', 'response', 'service', 'done', 'confirm', 'refund', 'dispute']
  );
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
  assert.match(detailSource, /return this\.hasServiceStarted \? '\u670d\u52a1\u5b8c\u6210' : '\u5f00\u59cb\u670d\u52a1'/);
  assert.match(detailSource, /return this\.group === 'service' && !this\.hasServiceStarted/);
  assert.doesNotMatch(detailSource, /nowTime/);
  assert.doesNotMatch(detailSource, /Date\.parse/);
  assert.doesNotMatch(detailSource, /canCompleteNow/);
});

test('chef order detail uses dedicated confirm modal copy for start and complete actions', () => {
  assert.match(detailSource, /uni\.showModal\(\{[\s\S]*content:\s*'\u786e\u8ba4\u5f00\u59cb\u670d\u52a1\u5417\?'/);
  assert.match(detailSource, /uni\.showModal\(\{[\s\S]*content:\s*'\u786e\u8ba4\u5f00\u59cb\u670d\u52a1\u5417\?'[\s\S]*cancelText:\s*'\u53d6\u6d88'[\s\S]*confirmText:\s*'\u786e\u8ba4'/);
  assert.match(detailSource, /uni\.showModal\(\{[\s\S]*content:\s*'\u670d\u52a1\u786e\u8ba4\u5b8c\u6210\u4e86\u5417\?'/);
  assert.match(detailSource, /uni\.showModal\(\{[\s\S]*content:\s*'\u670d\u52a1\u786e\u8ba4\u5b8c\u6210\u4e86\u5417\?'[\s\S]*cancelText:\s*'\u53d6\u6d88'[\s\S]*confirmText:\s*'\u786e\u8ba4\u5b8c\u6210'/);
});

test('chef order detail shows reject-service popup with required reason before cancel request', () => {
  assert.match(detailSource, /ref="rejectServicePopup"/);
  assert.match(detailSource, /@click="openRejectServicePopup"/);
  assert.match(detailSource, /submitRejectService\(\)/);
  assert.match(detailSource, /closeRejectServicePopup\(\)/);
  assert.match(detailSource, /v-model\.trim="rejectServiceReasonInput"/);
  assert.match(detailSource, /reject-service-dialog/);
});

test('chef order detail shows reject-reservation popup with required reason and yes-no buttons', () => {
  assert.match(detailSource, /ref="rejectReservationPopup"/);
  assert.match(detailSource, /@click="openRejectReservationPopup"/);
  assert.match(detailSource, /submitRejectReservation\(\)/);
  assert.match(detailSource, /closeRejectReservationPopup\(\)/);
  assert.match(detailSource, /v-model\.trim="rejectReservationReasonInput"/);
  assert.match(detailSource, /reject-reservation-dialog/);
  assert.match(detailSource, /reject-reservation-dialog__btn--ghost"[^>]*>\u5426<\/button>/);
  assert.match(detailSource, /reject-reservation-dialog__btn--danger"[^>]*>\u662f<\/button>/);
});

test('chef order detail removes the reject-reservation corner title and keeps only the button entry', () => {
  assert.doesNotMatch(detailSource, /<view class="section-title">\u62d2\u7edd\u9884\u7ea6<\/view>/);
  assert.match(detailSource, /<view v-if="canQuote \|\| canHandleDispute" class="action-card">[\s\S]*?<view class="quote-actions">[\s\S]*?<button class="primary-btn quote-actions__primary" :loading="submitting" @click="submitQuote">\{\{ canHandleDispute \? '\u63d0\u4ea4\u4fee\u6539\u62a5\u4ef7' : '\u540c\u610f\u5e76\u62a5\u4ef7' \}\}<\/button>[\s\S]*?<button v-if="canReject" class="plain-danger quote-actions__reject" :loading="submitting" @click="openRejectReservationPopup">\u62d2\u7edd\u9884\u7ea6<\/button>/);
});

test('chef order detail returns to the order list after each successful status change', () => {
  assert.match(detailSource, /submitQuote\(\)[\s\S]*?uni\.navigateBack\(\)/);
  assert.match(detailSource, /submitReject\(\)[\s\S]*?uni\.navigateBack\(\)/);
  assert.match(detailSource, /submitStartService\(\)[\s\S]*?uni\.navigateBack\(\)/);
  assert.match(detailSource, /submitComplete\(\)[\s\S]*?uni\.navigateBack\(\)/);
  assert.match(detailSource, /submitRejectService\(\)[\s\S]*?uni\.navigateBack\(\)/);
});

test('chef order detail centers the pending service section title only for that block', () => {
  assert.match(detailSource, /<view class="section-title section-title--center">\u5f85\u670d\u52a1\u5904\u7406<\/view>/);
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
