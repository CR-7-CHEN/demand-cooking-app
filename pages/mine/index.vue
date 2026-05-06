<template>
  <view class="mine-container" :style="{height: `${windowHeight}px`}">
    <!--顶部用户信息栏-->
    <view class="header-section">
      <view class="flex padding justify-between">
        <view class="flex align-center">
          <view v-if="!avatar" @click="handleToAvatar" class="cu-avatar xl round bg-white">
            <view class="iconfont icon-people text-gray icon"></view>
          </view>
          <image v-if="avatar" @click="handleToAvatar" :src="avatar" class="cu-avatar xl round" mode="widthFix">
          </image>
          <view v-if="!name" @click="handleToLogin" class="login-tip">
            点击登录
          </view>
          <view v-if="name" class="user-info">
            <view class="u_title">
              用户名：{{ name }}
            </view>
            <view class="u_nickname">
              用户昵称：{{ nickName || '未设置' }}
            </view>
          </view>
        </view>
      </view>
    </view>

    <view class="content-section">
      <view class="mine-actions grid col-2 text-center">
        <view class="action-item" @click="handleCustomerService">
          <view class="iconfont icon-service text-blue icon"></view>
          <text class="text">在线客服</text>
        </view>
        <view class="action-item" @click="handleBuilding">
          <view class="iconfont icon-dianzan text-green icon"></view>
          <text class="text">点赞我们</text>
        </view>
      </view>

      <view class="menu-list">
        <view class="list-cell list-cell-arrow" @click="handleToEditInfo">
          <view class="menu-item-box">
            <view class="iconfont icon-user menu-icon"></view>
            <view>编辑资料</view>
          </view>
        </view>
        <view class="list-cell list-cell-arrow" @click="handleHelp">
          <view class="menu-item-box">
            <view class="iconfont icon-help menu-icon"></view>
            <view>常见问题</view>
          </view>
        </view>
        <view class="list-cell list-cell-arrow" @click="handleAbout">
          <view class="menu-item-box">
            <view class="iconfont icon-aixin menu-icon"></view>
            <view>关于我们</view>
          </view>
        </view>
        <view class="list-cell list-cell-arrow" @click="handleToSetting">
          <view class="menu-item-box">
            <view class="iconfont icon-setting menu-icon"></view>
            <view>应用设置</view>
          </view>
        </view>
      </view>

    </view>
  </view>
</template>

<script>
  import { getAppProfile } from "@/api/system/user"

  export default {
    data() {
      return {
        name: this.$store.state.user.name,
        nickName: ''
      }
    },
    onShow() {
      this.name = this.$store.state.user.name
      this.getProfile()
    },
    computed: {
      avatar() {
        return this.$store.state.user.avatar
      },
      windowHeight() {
        return uni.getSystemInfoSync().windowHeight - 50
      }
    },
    methods: {
      handleToEditInfo() {
        this.$tab.navigateTo('/pages/mine/info/edit')
      },
      handleToSetting() {
        this.$tab.navigateTo('/pages/mine/setting/index')
      },
      handleToLogin() {
        this.$tab.reLaunch('/pages/login')
      },
      handleToAvatar() {
        this.$tab.navigateTo('/pages/mine/avatar/index')
      },
      handleHelp() {
        this.$tab.navigateTo('/pages/mine/help/index')
      },
      handleCustomerService() {
        this.$tab.navigateTo('/pages/mine/service/index')
      },
      handleAbout() {
        this.$tab.navigateTo('/pages/mine/about/index')
      },
      getProfile() {
        if (!this.$store.state.user.token) return
        getAppProfile().then(response => {
          const user = response.data || {}
          this.nickName = user.nickName || ''
        }).catch(() => {})
      },
      handleBuilding() {
        this.$modal.showToast('模块建设中~')
      }
    }
  }
</script>

<style lang="scss" scoped>
  page {
    background-color: #fff7f0;
  }

  .mine-container {
    width: 100%;
    height: 100%;


    .header-section {
      padding: 15px 15px 45px 15px;
      background-color: #f06a3a;
      color: white;

      .login-tip {
        font-size: 18px;
        margin-left: 10px;
      }

      .cu-avatar {
        border: 2px solid #eaeaea;

        .icon {
          font-size: 40px;
        }
      }

      .user-info {
        margin-left: 15px;

        .u_title {
          font-size: 18px;
          line-height: 30px;
        }

        .u_nickname {
          font-size: 13px;
          line-height: 22px;
          color: rgba(255, 255, 255, 0.86);
        }
      }
    }

    .content-section {
      position: relative;
      top: -50px;

      .mine-actions {
        margin: 15px 15px;
        padding: 20px 0px;
        border-radius: 8px;
        background-color: white;

        .action-item {
          .icon {
            font-size: 28px;
          }

          .text {
            display: block;
            font-size: 13px;
            margin: 8px 0px;
          }
        }
      }
    }
  }
</style>
