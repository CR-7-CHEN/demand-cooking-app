<template>
  <view class="normal-login-container">
    <view class="logo-content align-center justify-center flex">
      <text class="title">上门家厨管理系统</text>
    </view>
    <view class="login-form-content">
      <view class="input-item flex align-center">
        <view class="iconfont icon-user icon"></view>
        <input v-model="registerForm.username" class="input" type="text" placeholder="请输入账号" maxlength="30" />
      </view>
      <view class="input-item flex align-center">
        <view class="iconfont icon-password icon"></view>
        <input v-model="registerForm.password" type="password" class="input" placeholder="请输入密码" maxlength="20" />
      </view>
      <view class="input-item flex align-center">
        <view class="iconfont icon-password icon"></view>
        <input v-model="registerForm.confirmPassword" type="password" class="input" placeholder="请再次输入密码" maxlength="20" />
      </view>
      <view class="action-btn">
        <button @click="handleRegister()" class="register-btn cu-btn block lg round" hover-class="register-btn-hover">注册</button>
      </view>
    </view>
    <view class="xieyi text-center">
      <text @click="handleUserLogin" class="text-blue">使用已有账号登录</text>
    </view>
  </view>
</template>

<script>
  export default {
    data() {
      return {
        globalConfig: getApp().globalData.config,
        registerForm: {
          username: "",
          password: "",
          confirmPassword: ""
        }
      }
    },
    methods: {
      handleUserLogin() {
        this.$tab.navigateTo(`/pages/login`)
      },
      async handleRegister() {
        if (this.registerForm.username === "") {
          this.$modal.msgError("请输入您的账号")
        } else if (this.registerForm.password === "") {
          this.$modal.msgError("请输入您的密码")
        } else if (this.registerForm.confirmPassword === "") {
          this.$modal.msgError("请再次输入您的密码")
        } else if (this.registerForm.password !== this.registerForm.confirmPassword) {
          this.$modal.msgError("两次输入的密码不一致")
        } else {
          this.$modal.loading("注册中，请耐心等待...")
          this.register()
        }
      },
      async register() {
        let registerInfo = {}
        try {
          registerInfo = await this.getRegisterLoginInfo()
        } catch (error) {
          this.$modal.closeLoading()
          this.$modal.msgError(error.message || '微信登录凭证获取失败，请重试')
          return
        }
        this.$store.dispatch('Register', {
          ...this.registerForm,
          ...registerInfo
        }).then(() => {
          this.$modal.closeLoading()
          this.$store.dispatch('GetInfo').then(() => {
            this.$tab.reLaunch('/pages/index')
          })
        }).catch(() => {
          this.$modal.closeLoading()
        })
      },
      getRegisterLoginInfo() {
        return new Promise((resolve, reject) => {
          // #ifdef MP-WEIXIN
          uni.login({
            success: ({ code }) => {
              if (!code) {
                reject(new Error('未获取到微信登录凭证，请重试'))
                return
              }
              resolve({
                xcxCode: code,
                appid: this.getMiniProgramAppId()
              })
            },
            fail: () => {
              reject(new Error('微信登录凭证获取失败，请重试'))
            }
          })
          // #endif
          // #ifndef MP-WEIXIN
          resolve({})
          // #endif
        })
      },
      getMiniProgramAppId() {
        // #ifdef MP-WEIXIN
        const accountInfo = uni.getAccountInfoSync ? uni.getAccountInfoSync() : null
        return accountInfo && accountInfo.miniProgram ? accountInfo.miniProgram.appId : ''
        // #endif
        // #ifndef MP-WEIXIN
        return ''
        // #endif
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

      .register-btn {
        margin-top: 40px;
        height: 45px;
        background-color: #f06a3a;
        color: #ffffff;
        border: 1px solid #f06a3a;
        box-sizing: border-box;
      }

      .register-btn-hover {
        background-color: #e45f30;
        border-color: #e45f30;
        opacity: 0.9;
        transform: scale(0.98);
      }

      .xieyi {
        color: #333;
        margin-top: 20px;
      }
    }
  }
</style>
