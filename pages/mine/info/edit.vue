<template>
  <view class="container">
    <view class="example">
      <uni-forms ref="form" :model="user" labelWidth="80px">
        <view class="avatar-row" @click="handleToAvatar">
          <view class="avatar-label">用户头像</view>
          <view class="avatar-value">
            <image class="avatar" :src="avatar" mode="aspectFill"></image>
            <view class="iconfont icon-right"></view>
          </view>
        </view>
        <uni-forms-item label="用户昵称" name="nickName">
          <uni-easyinput v-model="user.nickName" placeholder="请输入昵称" />
        </uni-forms-item>
      </uni-forms>
      <button type="primary" @click="submit">提交</button>
    </view>
  </view>
</template>

<script>
  import { getAppProfile, updateAppProfile } from "@/api/system/user"

  export default {
    data() {
      return {
        user: {
          nickName: ""
        },
        rules: {
          nickName: {
            rules: [{
              required: true,
              errorMessage: '用户昵称不能为空'
            }]
          }
        }
      }
    },
    computed: {
      avatar() {
        return this.$store.state.user.avatar || '/static/images/profile.jpg'
      }
    },
    onLoad() {
      this.getUser()
    },
    onReady() {
      this.$refs.form.setRules(this.rules)
    },
    methods: {
      getUser() {
        getAppProfile().then(response => {
          const data = response.data || {}
          this.user = {
            nickName: data.nickName || ''
          }
        })
      },
      handleToAvatar() {
        this.$tab.navigateTo('/pages/mine/avatar/index')
      },
      submit(ref) {
        this.$refs.form.validate().then(res => {
          updateAppProfile({
            nickName: this.user.nickName
          }).then(response => {
            this.$store.dispatch('GetInfo').catch(() => {})
            this.$modal.msgSuccess("修改成功")
            this.user = {
              nickName: ""
            }
            this.$refs.form.clearValidate()
            setTimeout(() => {
              this.$tab.switchTab('/pages/mine/index')
            }, 300)
          })
        })
      }
    }
  }
</script>

<style lang="scss" scoped>
  page {
    background-color: #fff7f0;
  }

  .example {
    padding: 15px;
    background-color: #fff;
  }

  .avatar-row {
    min-height: 96rpx;
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0 0 22rpx;
    margin-bottom: 22rpx;
    border-bottom: 1rpx solid #f1f1f1;
  }

  .avatar-label {
    width: 80px;
    font-size: 14px;
    color: #606266;
  }

  .avatar-value {
    display: flex;
    align-items: center;
    color: #909399;
  }

  .avatar {
    width: 72rpx;
    height: 72rpx;
    border-radius: 50%;
    margin-right: 12rpx;
  }

  .segmented-control {
    margin-bottom: 15px;
  }

  .button-group {
    margin-top: 15px;
    display: flex;
    justify-content: space-around;
  }

  .form-item {
    display: flex;
    align-items: center;
    flex: 1;
  }

  .button {
    display: flex;
    align-items: center;
    height: 35px;
    line-height: 35px;
    margin-left: 10px;
  }
</style>
