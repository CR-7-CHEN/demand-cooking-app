const TokenKey = 'App-Token'
const ClientIdKey = 'App-Client-Id'

export function getToken() {
  return uni.getStorageSync(TokenKey)
}

export function setToken(token) {
  return uni.setStorageSync(TokenKey, token)
}

export function removeToken() {
  return uni.removeStorageSync(TokenKey)
}

export function getClientId() {
  return uni.getStorageSync(ClientIdKey)
}

export function setClientId(clientId) {
  return uni.setStorageSync(ClientIdKey, clientId)
}

export function removeClientId() {
  return uni.removeStorageSync(ClientIdKey)
}
