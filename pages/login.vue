<template>
  <view class="normal-login-container">
    <view class="logo-content align-center justify-center flex">
      <text class="title">上门家厨管理系统</text>
    </view>
    <view class="login-form-content">
      <view class="input-item flex align-center">
        <view class="iconfont icon-user icon"></view>
        <input v-model="loginForm.username" class="input" type="text" placeholder="请输入账号" maxlength="30" />
      </view>
      <view class="input-item flex align-center">
        <view class="iconfont icon-password icon"></view>
        <input v-model="loginForm.password" type="password" class="input" placeholder="请输入密码" maxlength="20" />
      </view>
      <view class="action-btn">
        <button @click="handleLogin" class="login-btn cu-btn block lg round" hover-class="login-btn-hover">登录</button>
      </view>
      <view class="action-btn wechat-action-btn">
        <button @click="handleWxLogin" class="wechat-login-btn cu-btn block lg round" hover-class="wechat-login-btn-hover">微信快捷登录</button>
      </view>
      <view class="reg text-center" v-if="register">
        <text class="text-grey1">没有账号？</text>
        <text @click="handleUserRegister" class="text-blue">立即注册</text>
      </view>
      <view class="xieyi text-center">
        <text class="text-grey1">登录即代表同意</text>
        <text @click="handleUserAgrement" class="text-blue">《用户协议》</text>
        <text @click="handlePrivacy" class="text-blue">《隐私协议》</text>
      </view>
    </view>
     
  </view>
</template>

<script>
  import { getToken } from '@/utils/auth'

  export default {
    data() {
      return {
        // 用户注册开关
        register: true,
        globalConfig: getApp().globalData.config,
        loginForm: {
          username: "",
          password: ""
        }
      }
    },
    onLoad() {
      //#ifdef H5
      if (getToken()) {
        this.$tab.reLaunch('/pages/index')
      }
      //#endif
    },
    methods: {
      // 用户注册
      handleUserRegister() {
        this.$tab.redirectTo(`/pages/register`)
      },
      // 隐私协议
      handlePrivacy() {
        let site = this.globalConfig.appInfo.agreements[0]
        this.$tab.navigateTo(`/pages/common/webview/index?title=${site.title}&url=${site.url}`)
      },
      // 用户协议
      handleUserAgrement() {
        let site = this.globalConfig.appInfo.agreements[1]
        this.$tab.navigateTo(`/pages/common/webview/index?title=${site.title}&url=${site.url}`)
      },
      // 登录方法
      async handleLogin() {
        if (this.loginForm.username === "") {
          this.$modal.msgError("请输入账号")
        } else if (this.loginForm.password === "") {
          this.$modal.msgError("请输入密码")
        } else {
          this.$modal.loading("登录中，请耐心等待...")
          this.pwdLogin()
        }
      },
      // 密码登录
      async pwdLogin() {
        const loginInfo = await this.getPasswordLoginInfo()
        this.$store.dispatch('Login', {
          ...this.loginForm,
          ...loginInfo
        }).then(() => {
          this.$modal.closeLoading()
          this.loginSuccess()
        }).catch(() => {
          this.$modal.closeLoading()
        })
      },
      getPasswordLoginInfo() {
        return new Promise((resolve) => {
          // #ifdef MP-WEIXIN
          uni.login({
            success: ({ code }) => {
              if (!code) {
                resolve({})
                return
              }
              resolve({
                xcxCode: code,
                appid: this.getMiniProgramAppId()
              })
            },
            fail: () => {
              resolve({})
            }
          })
          // #endif
          // #ifndef MP-WEIXIN
          resolve({})
          // #endif
        })
      },
      handleWxLogin() {
        // #ifndef MP-WEIXIN
        this.$modal.msgError('请在微信小程序环境中使用微信快捷登录')
        return
        // #endif
        // #ifdef MP-WEIXIN
        this.$modal.loading('微信登录中，请稍候...')
        uni.login({
          success: ({ code }) => {
            if (!code) {
              this.$modal.closeLoading()
              this.$modal.msgError('未获取到微信登录凭证，请重试')
              return
            }
            this.$store.dispatch('WxLogin', {
              xcxCode: code,
              appid: this.getMiniProgramAppId()
            }).then(() => {
              this.$modal.closeLoading()
              this.loginSuccess()
            }).catch(() => {
              this.$modal.closeLoading()
            })
          },
          fail: () => {
            this.$modal.closeLoading()
            this.$modal.msgError('微信登录失败，请重试')
          }
        })
        // #endif
      },
      getMiniProgramAppId() {
        // #ifdef MP-WEIXIN
        const accountInfo = uni.getAccountInfoSync ? uni.getAccountInfoSync() : null
        return accountInfo && accountInfo.miniProgram ? accountInfo.miniProgram.appId : ''
        // #endif
        // #ifndef MP-WEIXIN
        return ''
        // #endif
      },
      loginSuccess(result) {
        // 设置用户信息
        this.$store.dispatch('GetInfo').then(res => {
          this.$tab.reLaunch('/pages/index')
        })
      }
    }
  }
</script>

<style lang="scss" scoped>
  page {
    background-color: #fff7f0;
  }

  .normal-login-container {
    width: 100%;

    .logo-content {
      width: 100%;
      font-size: 21px;
      text-align: center;
      padding-top: 15%;

      .title {
        margin-left: 0;
        font-weight: bold;
        color: #333;
      }
    }

    .login-form-content {
      text-align: center;
      margin: 20px auto;
      margin-top: 15%;
      width: 80%;

      .input-item {
        margin: 20px auto;
        background-color: #fff1e8;
        height: 45px;
        border-radius: 20px;

        .icon {
          font-size: 38rpx;
          margin-left: 10px;
          color: #999;
        }

        .input {
          width: 100%;
          font-size: 14px;
          line-height: 20px;
          text-align: left;
          padding-left: 15px;
        }

      }

      .login-btn {
        margin-top: 40px;
        height: 45px;
        background-color: #f06a3a;
        color: #ffffff;
        border: 1px solid #f06a3a;
        box-sizing: border-box;
      }

      .login-btn-hover {
        background-color: #e45f30;
        border-color: #e45f30;
        opacity: 0.9;
        transform: scale(0.98);
      }

      .wechat-action-btn {
        margin-top: 14px;
      }

      .wechat-login-btn {
        height: 45px;
        background-color: #fff1e8;
        color: #e86f1a;
        border: 1px solid #f4b28c;
        box-sizing: border-box;
      }

      .wechat-login-btn-hover {
        background-color: #ffe8d9;
        opacity: 0.86;
        transform: scale(0.98);
      }
      
      .reg {
        margin-top: 15px;
      }
      
      .xieyi {
        color: #333;
        margin-top: 20px;
      }
      
    }
  }

</style>
