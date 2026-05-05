// 应用全局配置
module.exports = {
  baseUrl: 'http://localhost:8080',
  // baseUrl: 'https://vue.ruoyi.vip/prod-api',
  // 默认 App 客户端ID（对应后端 sys_client 表 app 客户端）
  clientId: '428a8310cd442757ae699df5d894f051',
  // 账号密码客户端ID（用于账号密码登录/注册）
  passwordClientId: '428a8310cd442757ae699df5d894f051',
  // 微信小程序客户端ID（对应后端 sys_client 表 xcx 客户端，用于微信快捷登录）
  xcxClientId: 'be7052a7e4f802c20df10a8d131adb12',
  tenantId: '000000',
  // 应用信息
  appInfo: {
    // 应用名称
    name: "ruoyi-app",
    // 应用版本
    version: "1.2.0",
    // 应用logo
    logo: "/static/logo.png",
    // 官方网站
    site_url: "http://ruoyi.vip",
    // 政策协议
    agreements: [{
        title: "隐私政策",
        url: "https://ruoyi.vip/protocol.html"
      },
      {
        title: "用户服务协议",
        url: "https://ruoyi.vip/protocol.html"
      }
    ]
  }
}
