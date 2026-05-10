import request from '@/utils/request'

// 服务厨师列表
export function listChefs(params) {
  return request({
    url: '/cooking/app/chef/list',
    method: 'get',
    params
  })
}

// 服务厨师详情
export function getChef(id) {
  return request({
    url: `/cooking/app/chef/${id}`,
    method: 'get'
  })
}

// 地址列表
export function listAddresses() {
  return request({
    url: '/cooking/app/address',
    method: 'get'
  })
}

// 新增地址
export function addAddress(data) {
  return request({
    url: '/cooking/app/address',
    method: 'post',
    data
  })
}

// 修改地址
export function updateAddress(data) {
  return request({
    url: '/cooking/app/address',
    method: 'put',
    data
  })
}

// 删除地址
export function deleteAddress(id) {
  return request({
    url: '/cooking/app/address',
    method: 'delete',
    data: { id }
  })
}

// 菜品列表
export function listDishes(params) {
  return request({
    url: '/cooking/app/dish/list',
    method: 'get',
    params
  })
}

// 提交预约订单
export function submitOrder(data) {
  return request({
    url: '/cooking/order/submit',
    method: 'post',
    data
  })
}

// 我的订单列表
export function listMyOrders(params) {
  return request({
    url: '/cooking/order/my/list',
    method: 'get',
    params
  })
}

// 订单详情
export function getOrder(id) {
  return request({
    url: `/cooking/order/${id}`,
    method: 'get'
  })
}

// 报价异议
export function submitObjection(data) {
  return request({
    url: '/cooking/order/objection',
    method: 'post',
    data
  })
}

// 模拟支付成功
export function payOrderSuccess(data) {
  return request({
    url: '/cooking/order/pay/success',
    method: 'post',
    data
  })
}

// 用户取消订单
export function cancelOrder(data) {
  return request({
    url: '/cooking/order/user/cancel',
    method: 'post',
    data
  })
}

// 用户确认完成
export function confirmOrder(data) {
  return request({
    url: '/cooking/order/user/confirm',
    method: 'post',
    data
  })
}

// 提交评价
export function submitReview(data) {
  return request({
    url: '/cooking/review',
    method: 'post',
    data
  })
}

// 提交投诉
export function submitComplaint(data) {
  return request({
    url: '/cooking/complaint',
    method: 'post',
    data
  })
}
