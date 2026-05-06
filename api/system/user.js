import upload from '@/utils/upload'
import request from '@/utils/request'

// 用户密码重置
export function updateUserPwd(oldPassword, newPassword) {
  const data = {
    oldPassword,
    newPassword
  }
  return request({
    url: '/system/user/profile/updatePwd',
    method: 'put',
    data: data
  })
}

// 查询用户个人信息
export function getUserProfile() {
  return request({
    url: '/system/user/profile',
    method: 'get'
  })
}

// 修改用户个人信息
export function updateUserProfile(data) {
  return request({
    url: '/system/user/profile',
    method: 'put',
    data: data
  })
}

// 查询小程序用户资料
export function getAppProfile() {
  return request({
    url: '/cooking/app/profile',
    method: 'get'
  })
}

// 修改小程序用户资料，仅支持昵称和头像
export function updateAppProfile(data) {
  return request({
    url: '/cooking/app/profile',
    method: 'put',
    data: data
  })
}

// 用户头像上传
export function uploadAvatar(data) {
  return upload({
    url: '/cooking/app/profile/avatar',
    name: data.name,
    filePath: data.filePath
  })
}
