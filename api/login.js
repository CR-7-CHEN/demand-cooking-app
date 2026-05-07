import request from '@/utils/request'
import appConfig from '@/config'

// 登录方法
export function login(username, password, loginInfo = {}) {
  const clientId = appConfig.passwordClientId || appConfig.clientId
  const data = {
    username,
    password,
    xcxCode: loginInfo.xcxCode,
    appid: loginInfo.appid,
    clientId,
    grantType: 'password'
  }
  return request({
    'url': '/auth/app/login',
    headers: {
      isToken: false,
      clientid: clientId
    },
    'method': 'post',
    'data': data
  })
}

// 微信快捷登录
export function wxLogin(loginInfo) {
  const xcxCode = typeof loginInfo === 'string' ? loginInfo : loginInfo.xcxCode
  const appid = typeof loginInfo === 'string' ? undefined : loginInfo.appid
  const clientId = appConfig.xcxClientId || appConfig.clientId
  const data = {
    xcxCode,
    appid,
    clientId,
    grantType: 'xcx'
  }
  return request({
    url: '/auth/app/login',
    headers: {
      isToken: false,
      clientid: clientId
    },
    method: 'post',
    data
  })
}

// 注册方法
export function register(data) {
  const clientId = appConfig.passwordClientId || appConfig.clientId
  const params = {
    ...data,
    clientId,
    grantType: 'password',
    userType: 'app_user'
  }
  return request({
    url: '/auth/app/register',
    headers: {
      isToken: false,
      clientid: clientId
    },
    method: 'post',
    data: params
  })
}

// 获取用户详细信息
export function getInfo() {
  return request({
    'url': '/system/user/getInfo',
    'method': 'get'
  })
}

// 退出方法
export function logout() {
  return request({
    'url': '/auth/logout',
    'method': 'post'
  })
}
