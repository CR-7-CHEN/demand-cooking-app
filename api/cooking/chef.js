import request from '@/utils/request'
import upload from '@/utils/upload'

// 做饭人员资料
export function getChefMy() {
  return request({
    url: '/cooking/chef/my',
    method: 'get'
  })
}

export function getChefWorkbench() {
  return request({
    url: '/cooking/chef/workbench',
    method: 'get'
  })
}

export function getChefCommissionOrders(params) {
  return request({
    url: '/cooking/chef/commission/orders',
    method: 'get',
    params
  })
}

export function applyChef(data) {
  return request({
    url: '/cooking/chef/apply',
    method: 'post',
    data
  })
}

export function updateChefMy(data) {
  return request({
    url: '/cooking/chef/my',
    method: 'put',
    data
  })
}

export function uploadChefImage(filePath) {
  return upload({
    url: '/cooking/chef/upload',
    name: 'file',
    filePath
  })
}

export function pauseChef(data) {
  return request({
    url: '/cooking/chef/pause',
    method: 'post',
    data
  })
}

export function resumeChef(data) {
  return request({
    url: '/cooking/chef/resume',
    method: 'post',
    data
  })
}

export function resignChef(data) {
  return request({
    url: '/cooking/chef/resign',
    method: 'post',
    data
  })
}

// 可预约时间
export function getChefTime(params) {
  return request({
    url: '/cooking/chef/time',
    method: 'get',
    params
  })
}

export function addChefTime(data) {
  return request({
    url: '/cooking/chef/time',
    method: 'post',
    data
  })
}

export function updateChefTime(data) {
  return request({
    url: '/cooking/chef/time',
    method: 'put',
    data
  })
}

export function deleteChefTime(id) {
  return request({
    url: '/cooking/chef/time',
    method: 'delete',
    params: { id }
  })
}

// 做饭人员订单
export function getChefOrderList(params) {
  return request({
    url: '/cooking/order/chef/list',
    method: 'get',
    params
  })
}

export function getCookingOrder(id) {
  return request({
    url: `/cooking/order/${id}`,
    method: 'get'
  })
}

export function rejectChefOrder(data) {
  return request({
    url: '/cooking/order/chef/reject',
    method: 'post',
    data
  })
}

export function quoteChefOrder(data) {
  return request({
    url: '/cooking/order/chef/quote',
    method: 'post',
    data
  })
}

export function startServiceChefOrder(data) {
  return request({
    url: '/cooking/order/chef/serviceStart',
    method: 'post',
    data
  })
}

export function serviceCompleteChefOrder(data) {
  return request({
    url: '/cooking/order/chef/serviceComplete',
    method: 'post',
    data
  })
}

export function cancelChefOrder(data) {
  return request({
    url: '/cooking/order/chef/cancel',
    method: 'post',
    data
  })
}

// 结算与公告
export function getChefSettlementDetail(id) {
  return request({
    url: `/cooking/settlement/${id}`,
    method: 'get'
  })
}

export function getChefSettlementMonth(params) {
  return request({
    url: '/cooking/settlement/chef/month',
    method: 'get',
    params
  })
}

export function submitChefSettlementReview(data) {
  return request({
    url: '/cooking/settlement/chef/review',
    method: 'post',
    data
  })
}

export function confirmChefSettlement(data) {
  return request({
    url: '/cooking/settlement/chef/confirm',
    method: 'post',
    data
  })
}

export function getWorkbenchAnnouncements(params) {
  return request({
    url: '/cooking/notice/announcement',
    method: 'get',
    params
  })
}
