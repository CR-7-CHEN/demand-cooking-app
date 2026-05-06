import config from '@/config'
import storage from '@/utils/storage'
import constant from '@/utils/constant'
import { isHttp, isEmpty } from "@/utils/validate"
import { login, wxLogin, register, logout, getInfo } from '@/api/login'
import { getToken, setToken, removeToken, getClientId, setClientId, removeClientId } from '@/utils/auth'
import defAva from '@/static/images/profile.jpg'

const baseUrl = config.baseUrl

const user = {
  state: {
    token: getToken(),
    clientId: getClientId(),
    id: storage.get(constant.id),
    name: storage.get(constant.name),
    avatar: storage.get(constant.avatar),
    roles: storage.get(constant.roles),
    permissions: storage.get(constant.permissions)
  },

  mutations: {
    SET_TOKEN: (state, token) => {
      state.token = token
    },
    SET_CLIENT_ID: (state, clientId) => {
      state.clientId = clientId
    },
    SET_ID: (state, id) => {
      state.id = id
      storage.set(constant.id, id)
    },
    SET_NAME: (state, name) => {
      state.name = name
      storage.set(constant.name, name)
    },
    SET_AVATAR: (state, avatar) => {
      state.avatar = avatar
      storage.set(constant.avatar, avatar)
    },
    SET_ROLES: (state, roles) => {
      state.roles = roles
      storage.set(constant.roles, roles)
    },
    SET_PERMISSIONS: (state, permissions) => {
      state.permissions = permissions
      storage.set(constant.permissions, permissions)
    }
  },

  actions: {
    // 登录
    Login({ commit }, userInfo) {
      const username = userInfo.username.trim()
      const password = userInfo.password
      const loginInfo = {
        xcxCode: userInfo.xcxCode,
        appid: userInfo.appid
      }
      return new Promise((resolve, reject) => {
        login(username, password, loginInfo).then(res => {
          const data = res.data || res
          const token = data.access_token || data.accessToken || data.token
          const clientId = data.client_id || data.clientId || config.passwordClientId || config.clientId
          setToken(token)
          setClientId(clientId)
          commit('SET_TOKEN', token)
          commit('SET_CLIENT_ID', clientId)
          resolve()
        }).catch(error => {
          reject(error)
        })
      })
    },

    WxLogin({ commit }, loginInfo) {
      return new Promise((resolve, reject) => {
        wxLogin(loginInfo).then(res => {
          const data = res.data || res
          const token = data.access_token || data.accessToken || data.token
          if (!token) {
            reject(new Error('微信登录未返回登录凭证'))
            return
          }
          const clientId = data.client_id || data.clientId || config.xcxClientId || config.clientId
          setToken(token)
          setClientId(clientId)
          commit('SET_TOKEN', token)
          commit('SET_CLIENT_ID', clientId)
          resolve()
        }).catch(error => {
          reject(error)
        })
      })
    },

    // 注册并保存登录态
    Register({ commit }, userInfo) {
      return new Promise((resolve, reject) => {
        register(userInfo).then(res => {
          const data = res.data || res
          const token = data.access_token || data.accessToken || data.token
          if (!token) {
            reject(new Error('注册成功但未返回登录凭证'))
            return
          }
          const clientId = data.client_id || data.clientId || config.passwordClientId || config.clientId
          setToken(token)
          setClientId(clientId)
          commit('SET_TOKEN', token)
          commit('SET_CLIENT_ID', clientId)
          resolve()
        }).catch(error => {
          reject(error)
        })
      })
    },

    // 获取用户信息
    GetInfo({ commit, state }) {
      return new Promise((resolve, reject) => {
        getInfo().then(res => {
          const data = res.data || res
          const user = data.user
		  let avatar = user.avatar || ""
		  if (!isHttp(avatar)) {
            avatar = (isEmpty(avatar)) ? defAva : baseUrl + avatar
          }
          const userid = (isEmpty(user) || isEmpty(user.userId)) ? "" : user.userId
		  const username = (isEmpty(user) || isEmpty(user.userName)) ? "" : user.userName
		  if (data.roles && data.roles.length > 0) {
            commit('SET_ROLES', data.roles)
            commit('SET_PERMISSIONS', data.permissions)
          } else {
            commit('SET_ROLES', ['ROLE_DEFAULT'])
          }
          commit('SET_ID', userid)
          commit('SET_NAME', username)
          commit('SET_AVATAR', avatar)
          resolve(res)
        }).catch(error => {
          reject(error)
        })
      })
    },

    // 退出系统
    LogOut({ commit, state }) {
      return new Promise((resolve, reject) => {
        logout(state.token).then(() => {
          commit('SET_TOKEN', '')
          commit('SET_CLIENT_ID', '')
          commit('SET_ROLES', [])
          commit('SET_PERMISSIONS', [])
          removeToken()
          removeClientId()
          storage.clean()
          resolve()
        }).catch(error => {
          reject(error)
        })
      })
    }
  }
}

export default user
