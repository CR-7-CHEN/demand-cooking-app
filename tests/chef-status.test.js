const test = require('node:test');
const assert = require('node:assert/strict');

const chefStatus = require('../utils/chef-status');

test('approved and normal chef can use workbench and hides recommendations', () => {
  const chef = {
    chefId: '2051952879945678850',
    auditStatus: '1',
    chefStatus: '0'
  };

  assert.equal(chefStatus.isChefWorkbenchAvailable(chef), true);
  assert.equal(chefStatus.shouldShowChefRecommendations(chef), false);
});

test('numeric approved and normal chef can use chef orders without recommendations', () => {
  const chef = {
    chefId: '2051952879945678850',
    auditStatus: 1,
    chefStatus: 0
  };

  assert.equal(chefStatus.getAuditStatus(chef), '1');
  assert.equal(chefStatus.getChefServiceStatus(chef), '0');
  assert.equal(chefStatus.isChefApproved(chef), true);
  assert.equal(chefStatus.isChefNormal(chef), true);
  assert.equal(chefStatus.isChefWorkbenchAvailable(chef), true);
  assert.equal(chefStatus.shouldShowChefRecommendations(chef), false);
  assert.equal(chefStatus.resolveOrderPage(chef), '/pages/work/orders');
});

test('numeric pending audit status is not treated as empty or fallback status', () => {
  const chef = {
    chefId: '2051952879945678850',
    auditStatus: 0,
    identityStatus: '1',
    chefStatus: '0'
  };

  assert.equal(chefStatus.getAuditStatus(chef), '0');
  assert.equal(chefStatus.isChefPending(chef), true);
  assert.equal(chefStatus.isChefApproved(chef), false);
  assert.equal(chefStatus.needChefApply(chef), false);
});

test('approved and paused chef still counts as current chef', () => {
  const chef = {
    chefId: '2051952879945678850',
    auditStatus: '1',
    chefStatus: '1'
  };

  assert.equal(chefStatus.isChefWorkbenchAvailable(chef), true);
  assert.equal(chefStatus.isChefPaused(chef), true);
});

test('empty profile still needs application', () => {
  assert.equal(chefStatus.needChefApply({}), true);
});

test('rejected chef is not treated as current chef', () => {
  const chef = {
    chefId: '2051952879945678850',
    auditStatus: '2',
    chefStatus: '0'
  };

  assert.equal(chefStatus.isChefRejected(chef), true);
  assert.equal(chefStatus.isChefWorkbenchAvailable(chef), false);
  assert.equal(chefStatus.shouldShowChefRecommendations(chef), true);
});

test('approved chef order entry should route to chef orders page', () => {
  const chef = {
    chefId: '2051952879945678850',
    auditStatus: '1',
    chefStatus: '0'
  };

  assert.equal(chefStatus.resolveOrderPage(chef), '/pages/work/orders');
});

test('ordinary user order entry should stay on user orders page', () => {
  assert.equal(chefStatus.resolveOrderPage({}), '/pages/user/orders');
});
