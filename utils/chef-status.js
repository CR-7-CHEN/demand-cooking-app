const AUDIT_PENDING = '0';
const AUDIT_APPROVED = '1';
const AUDIT_REJECTED = '2';

const CHEF_STATUS_NORMAL = '0';
const CHEF_STATUS_PAUSED = '1';
const CHEF_STATUS_DISABLED = '2';
const CHEF_STATUS_RESIGNED = '3';

function normalizeStatus(value) {
  return value === undefined || value === null ? '' : String(value).trim();
}

function pickStatusValue(primary, fallback) {
  return primary === undefined || primary === null ? fallback : primary;
}

function hasChefProfile(chef) {
  return !!(chef && (chef.id || chef.chefId));
}

function getAuditStatus(chef) {
  if (!chef) return '';
  return normalizeStatus(pickStatusValue(chef.auditStatus, chef.identityStatus));
}

function getChefServiceStatus(chef) {
  if (!chef) return '';
  return normalizeStatus(pickStatusValue(chef.chefStatus, chef.status));
}

function isChefApproved(chef) {
  return getAuditStatus(chef) === AUDIT_APPROVED;
}

function isChefPending(chef) {
  return getAuditStatus(chef) === AUDIT_PENDING;
}

function isChefRejected(chef) {
  return getAuditStatus(chef) === AUDIT_REJECTED;
}

function isChefNormal(chef) {
  return getChefServiceStatus(chef) === CHEF_STATUS_NORMAL;
}

function isChefPaused(chef) {
  return getChefServiceStatus(chef) === CHEF_STATUS_PAUSED;
}

function isChefDisabled(chef) {
  return getChefServiceStatus(chef) === CHEF_STATUS_DISABLED;
}

function isChefResigned(chef) {
  return getChefServiceStatus(chef) === CHEF_STATUS_RESIGNED;
}

function isChefWorkbenchAvailable(chef) {
  return isChefApproved(chef) && (isChefNormal(chef) || isChefPaused(chef));
}

function shouldShowChefRecommendations(chef) {
  return !isChefWorkbenchAvailable(chef);
}

function needChefApply(chef) {
  return !hasChefProfile(chef) && !getAuditStatus(chef) && !getChefServiceStatus(chef);
}

function resolveOrderPage(chef) {
  return isChefWorkbenchAvailable(chef) ? '/pages/work/orders' : '/pages/user/orders';
}

module.exports = {
  AUDIT_PENDING,
  AUDIT_APPROVED,
  AUDIT_REJECTED,
  CHEF_STATUS_NORMAL,
  CHEF_STATUS_PAUSED,
  CHEF_STATUS_DISABLED,
  CHEF_STATUS_RESIGNED,
  normalizeStatus,
  hasChefProfile,
  getAuditStatus,
  getChefServiceStatus,
  isChefApproved,
  isChefPending,
  isChefRejected,
  isChefNormal,
  isChefPaused,
  isChefDisabled,
  isChefResigned,
  isChefWorkbenchAvailable,
  shouldShowChefRecommendations,
  needChefApply,
  resolveOrderPage
};
