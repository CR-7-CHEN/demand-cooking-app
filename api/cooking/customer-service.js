import request from '@/utils/request'

// 客服机器人 FAQ 列表
export function listCustomerFaq(params) {
  return request({
    url: '/cooking/app/support/faq/list',
    method: 'get',
    params
  })
}

// 客服机器人自动回复
export function askCustomerRobot(data) {
  return request({
    url: '/cooking/app/support/robot/ask',
    method: 'post',
    data
  })
}

// 无法自动回答时提交工单
export function submitCustomerTicket(data) {
  return request({
    url: '/cooking/app/support/ticket',
    method: 'post',
    data
  })
}
