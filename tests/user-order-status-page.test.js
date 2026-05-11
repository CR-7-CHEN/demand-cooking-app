const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const appRoot = path.join(__dirname, '..');
const ordersSource = fs.readFileSync(path.join(appRoot, 'pages', 'user', 'orders.vue'), 'utf8');
const detailSource = fs.readFileSync(path.join(appRoot, 'pages', 'user', 'order-detail.vue'), 'utf8');

function loadOrdersComponent(apiOverrides = {}) {
  const match = ordersSource.match(/<script>([\s\S]*?)<\/script>/);
  assert.ok(match, 'expected user orders page to contain a script block');

  const script = match[1]
    .replace(
      /import\s+\{\s*listMyOrders\s*\}\s+from\s+'@\/api\/cooking\/user'\s*/,
      'const listMyOrders = globalThis.__testApi.listMyOrders\n'
    )
    .replace(
      /import\s+\{\s*getChefMy\s*\}\s+from\s+'@\/api\/cooking\/chef'\s*/,
      'const getChefMy = globalThis.__testApi.getChefMy\n'
    )
    .replace(
      /import\s+\{\s*getToken\s*\}\s+from\s+'@\/utils\/auth'\s*/,
      'const getToken = globalThis.__testApi.getToken\n'
    )
    .replace(
      /const chefStatus = require\('@\/utils\/chef-status'\)/,
      `const chefStatus = require(${JSON.stringify(path.join(appRoot, 'utils', 'chef-status.js'))})`
    )
    .replace(
      /const orderStatus = require\('@\/utils\/order-status'\)/,
      `const orderStatus = require(${JSON.stringify(path.join(appRoot, 'utils', 'order-status.js'))})`
    )
    .replace(
      /const orderTabs = require\('@\/utils\/user-order-tabs'\)/,
      `const orderTabs = require(${JSON.stringify(path.join(appRoot, 'utils', 'user-order-tabs.js'))})`
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
        listMyOrders: () => Promise.resolve({ data: { rows: [] } }),
        getChefMy: () => Promise.resolve({ data: {} }),
        getToken: () => 'token',
        ...apiOverrides
      }
    }
  };

  vm.runInNewContext(script, sandbox, {
    filename: path.join(appRoot, 'pages', 'user', 'orders.vue')
  });
  return sandbox.module.exports;
}

function loadDetailComponent(apiOverrides = {}) {
  const match = detailSource.match(/<script>([\s\S]*?)<\/script>/);
  assert.ok(match, 'expected user order detail page to contain a script block');

  const script = match[1]
    .replace(
      /import\s+\{[\s\S]*?\}\s+from\s+'@\/api\/cooking\/user'\s*/,
      [
        'const getOrder = globalThis.__testApi.getOrder',
        'const submitObjection = globalThis.__testApi.submitObjection',
        'const payOrderSuccess = globalThis.__testApi.payOrderSuccess',
        'const cancelOrder = globalThis.__testApi.cancelOrder',
        'const confirmOrder = globalThis.__testApi.confirmOrder',
        'const submitReview = globalThis.__testApi.submitReview',
        'const submitComplaint = globalThis.__testApi.submitComplaint',
        ''
      ].join('\n')
    )
    .replace(
      /const orderStatus = require\('@\/utils\/order-status'\)/,
      `const orderStatus = require(${JSON.stringify(path.join(appRoot, 'utils', 'order-status.js'))})`
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
      showModal() {}
    },
    globalThis: {
      __testApi: {
        getOrder: () => Promise.resolve({ data: {} }),
        submitObjection: () => Promise.resolve(),
        payOrderSuccess: () => Promise.resolve(),
        cancelOrder: () => Promise.resolve(),
        confirmOrder: () => Promise.resolve(),
        submitReview: () => Promise.resolve(),
        submitComplaint: () => Promise.resolve(),
        ...apiOverrides
      }
    }
  };

  vm.runInNewContext(script, sandbox, {
    filename: path.join(appRoot, 'pages', 'user', 'order-detail.vue')
  });
  return sandbox.module.exports;
}

function createOrdersContext(component, overrides = {}) {
  const ctx = {
    ...(component.data ? component.data() : {}),
    $modal: {
      msg() {}
    },
    $tab: {
      navigateTo() {},
      redirectTo() {}
    },
    ...overrides
  };

  Object.assign(ctx, component.methods);
  return ctx;
}

function createDetailContext(component, overrides = {}) {
  const ctx = {
    ...(component.data ? component.data() : {}),
    $modal: {
      msg() {},
      msgSuccess() {}
    },
    ...overrides
  };

  Object.assign(ctx, component.methods);
  return ctx;
}

function computedBlock(source, name) {
  const match = source.match(new RegExp(`${name}\\(\\)\\s*{([\\s\\S]*?)\\n\\s*},`));
  assert.ok(match, `${name} computed block should exist`);
  return match[1];
}

test('ordinary user order pages import the shared numeric status utilities', () => {
  assert.match(ordersSource, /require\(['"]@\/utils\/order-status['"]\)/);
  assert.match(detailSource, /require\(['"]@\/utils\/order-status['"]\)/);
  assert.match(ordersSource, /require\(['"]@\/utils\/user-order-tabs['"]\)/);
});

test('order detail action guards use normalized status helpers instead of inline English arrays', () => {
  const guardedComputed = [
    'canObjection',
    'canCancel',
    'canConfirm',
    'canReview',
    'canComplaint'
  ];

  for (const name of guardedComputed) {
    const block = computedBlock(detailSource, name);
    assert.doesNotMatch(block, /\[[^\]]*['"][A-Z_]+['"][^\]]*\]/, `${name} should not define inline status arrays`);
    assert.doesNotMatch(block, /this\.order\.status\s*={2,3}\s*['"][A-Z_]+['"]/, `${name} should not compare raw status strings`);
  }

  assert.match(computedBlock(detailSource, 'canObjection'), /isOrderStatus\([^)]*WAITING_PAY/);
  assert.doesNotMatch(computedBlock(detailSource, 'canObjection'), /isOrderStatus\([^)]*['"][A-Z_]+['"]/);
  assert.match(computedBlock(detailSource, 'canObjection'), /objectionCount/);
  assert.match(computedBlock(detailSource, 'canObjection'), /ORDER_STATUS\.WAITING_PAY/);
  assert.match(computedBlock(detailSource, 'canConfirm'), /ORDER_STATUS\.WAITING_CONFIRM/);
  assert.doesNotMatch(computedBlock(detailSource, 'canConfirm'), /isOrderStatus\([^)]*['"][A-Z_]+['"]/);
  assert.match(computedBlock(detailSource, 'canReview'), /isCompletedOrder/);
  assert.match(computedBlock(detailSource, 'canComplaint'), /isCompletedOrder/);
});

test('user order detail hides cancel entry after backend marks service as started', () => {
  assert.match(detailSource, /hasServiceStarted\(\)/);
  assert.match(detailSource, /serviceStartedTime/);
  assert.match(detailSource, /serviceStarted/);
  assert.match(computedBlock(detailSource, 'canCancel'), /ORDER_STATUS\.WAITING_SERVICE/);
  assert.match(computedBlock(detailSource, 'canCancel'), /!this\.hasServiceStarted/);
  assert.doesNotMatch(computedBlock(detailSource, 'canCancel'), /ORDER_STATUS\.WAITING_SERVICE\)\s*$/m);
});

test('user order detail formats JSON dish snapshot into readable dish demand text', () => {
  assert.doesNotMatch(detailSource, /order\.dishText\s*\|\|\s*order\.dishSnapshot/);

  const component = loadDetailComponent();
  const ctx = createDetailContext(component);
  const normalized = component.methods.normalizeOrder.call(ctx, {
    orderId: 'ORDER-1',
    dishSnapshot: JSON.stringify({
      dishes: [
        { id: 1, name: '红烧肉' },
        { id: 2, name: '番茄炒蛋' }
      ],
      customDishNames: ['青菜'],
      tasteRemark: '少辣',
      materialRemark: '自带米饭'
    })
  });

  assert.equal(normalized.dishText, '红烧肉、番茄炒蛋、青菜；少辣；自带米饭');
});

test('order list query uses tab helper status arrays and status text normalizes status first', () => {
  assert.match(ordersSource, /statuses:\s*orderTabs\.statusesOfTab\(this\.activeStatus\)/);
  assert.match(ordersSource, /statusGroup:\s*this\.activeStatus/);
  assert.match(ordersSource, /normalizeOrderStatus\(status\)/);
});

test('ordinary user order card uses a stable field key and tap event for mini program navigation', () => {
  assert.doesNotMatch(ordersSource, /:key="[^"]*\([^"]*"/);
  assert.match(ordersSource, /:key="order\.orderKey \|\| order\.orderNo"/);
  assert.match(ordersSource, /:data-order-id="order\.orderKey"/);
  assert.match(ordersSource, /@tap="openOrder"/);
  assert.doesNotMatch(ordersSource, /@tap="openOrder\(order\)"/);
});

test('status text keeps English closed-status labels after numeric normalization', () => {
  assert.match(ordersSource, /const rawStatus = String\(status \|\| ''\)\.trim\(\)\.toUpperCase\(\)/);
  assert.match(ordersSource, /map\[normalized\]\s*\|\|\s*map\[rawStatus\]/);
  assert.match(detailSource, /const rawStatus = String\(status \|\| ''\)\.trim\(\)\.toUpperCase\(\)/);
  assert.match(detailSource, /map\[normalized\]\s*\|\|\s*map\[rawStatus\]/);
});

test('ordinary user orders open detail even when backend only returns orderId', async () => {
  const component = loadOrdersComponent({
    listMyOrders: () => Promise.resolve({
      data: {
        rows: [
          {
            orderId: 'ORDER-ONLY',
            orderNo: 'NO-1',
            status: 'WAITING_PAY'
          }
        ]
      }
    })
  });
  const calls = [];
  const ctx = createOrdersContext(component, {
    $tab: {
      navigateTo(url) {
        calls.push(url);
      },
      redirectTo() {}
    }
  });

  await component.methods.loadOrders.call(ctx);
  component.methods.openOrder.call(ctx, { orderId: 'ORDER-ONLY' });

  assert.deepEqual(calls, ['/pages/user/order-detail?id=ORDER-ONLY']);
});

test('all four ordinary user tabs share the same detail entry and never disable card click by tab', () => {
  const component = loadOrdersComponent();
  const calls = [];
  const ctx = createOrdersContext(component, {
    $tab: {
      navigateTo(url) {
        calls.push(url);
      },
      redirectTo() {}
    }
  });

  const ordersByTab = {
    reserved: { orderId: 'RESERVED-1' },
    payment: { orderId: 'PAYMENT-1' },
    serving: { orderId: 'SERVING-1' },
    completed: { orderId: 'COMPLETED-1' }
  };

  for (const [tab, order] of Object.entries(ordersByTab)) {
    component.methods.changeStatus.call(ctx, tab);
    component.methods.openOrder.call(ctx, order);
  }

  assert.deepEqual(calls, [
    '/pages/user/order-detail?id=RESERVED-1',
    '/pages/user/order-detail?id=PAYMENT-1',
    '/pages/user/order-detail?id=SERVING-1',
    '/pages/user/order-detail?id=COMPLETED-1'
  ]);
});

test('ordinary user order click still navigates when mini program event passes only the order id', () => {
  const component = loadOrdersComponent();
  const calls = [];
  const ctx = createOrdersContext(component, {
    $tab: {
      navigateTo(url) {
        calls.push(url);
      },
      redirectTo() {}
    }
  });

  component.methods.openOrder.call(ctx, 'DIRECT-ID');

  assert.deepEqual(calls, ['/pages/user/order-detail?id=DIRECT-ID']);
});

test('ordinary user order click reads order id from mini program dataset events', () => {
  const component = loadOrdersComponent();
  const calls = [];
  const ctx = createOrdersContext(component, {
    $tab: {
      navigateTo(url) {
        calls.push(url);
      },
      redirectTo() {}
    }
  });

  component.methods.openOrder.call(ctx, {
    currentTarget: {
      dataset: {
        orderId: 'DATASET-ID'
      }
    }
  });

  assert.deepEqual(calls, ['/pages/user/order-detail?id=DATASET-ID']);
});
