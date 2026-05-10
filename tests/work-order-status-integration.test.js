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
  assert.match(ordersSource, /label:\s*'用户待确认'/);
  assert.doesNotMatch(ordersSource, /label:\s*'待确认'/);
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

test('chef order detail returns to the order list after each successful status change', () => {
  assert.match(detailSource, /submitQuote\(\)[\s\S]*?uni\.navigateBack\(\)/);
  assert.match(detailSource, /submitReject\(\)[\s\S]*?uni\.navigateBack\(\)/);
  assert.match(detailSource, /submitStartService\(\)[\s\S]*?uni\.navigateBack\(\)/);
  assert.match(detailSource, /submitComplete\(\)[\s\S]*?uni\.navigateBack\(\)/);
  assert.match(detailSource, /submitRejectService\(\)[\s\S]*?uni\.navigateBack\(\)/);
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
