<template>
  <view class="mine-container" :style="{height: `${windowHeight}px`}">
    <!--顶部用户信息栏-->
    <view class="header-section">
      <view class="flex padding justify-between">
        <view class="flex align-center">
          <view v-if="!avatar" @click="handleToAvatar" class="cu-avatar xl round bg-white">
            <view class="iconfont icon-people text-gray icon"></view>
          </view>
          <image v-if="avatar" @click="handleToAvatar" :src="avatar" class="cu-avatar xl round user-avatar" mode="aspectFit">
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

      <view v-if="chefAction" class="chef-action-card">
        <view class="chef-action-main">
          <view class="chef-action-label">服务厨师入驻</view>
          <view class="chef-action-title">{{ chefAction.title }}</view>
          <view class="chef-action-desc">{{ chefAction.description }}</view>
        </view>
        <button class="chef-action-button" @click="handleChefAction">{{ chefAction.buttonText }}</button>
      </view>

    </view>
  </view>
</template>

<script>
  import { getAppProfile } from "@/api/system/user"
  import { getChefMy } from "@/api/cooking/chef"
  const chefStatus = require('@/utils/chef-status')

  export default {
    data() {
      return {
        name: this.$store.state.user.name,
        nickName: '',
        chef: {}
      }
    },
    onShow() {
      this.name = this.$store.state.user.name
      this.getProfile()
      this.loadChefProfile()
    },
    computed: {
      avatar() {
        return this.$store.state.user.avatar
      },
      chefAction() {
        if (!this.$store.state.user.token) return null
        return this.resolveChefAction(this.chef)
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
      handleChefAction() {
        if (!this.$store.state.user.token) {
          this.handleToLogin()
          return
        }
        const action = this.resolveChefAction(this.chef)
        if (!action) return
        uni.showModal({
          title: action.dialogTitle,
          content: action.dialogContent,
          confirmText: '前往',
          cancelText: '稍后',
          success: ({ confirm }) => {
            if (confirm) {
              this.$tab.navigateTo('/pages/work/profile')
            }
          }
        })
      },
      getProfile() {
        if (!this.$store.state.user.token) return
        getAppProfile().then(response => {
          const user = response.data || {}
          this.nickName = user.nickName || ''
        }).catch(() => {})
      },
      loadChefProfile() {
        if (!this.$store.state.user.token) {
          this.chef = {}
          return
        }
        getChefMy().then(response => {
          this.chef = response && response.data ? response.data : {}
        }).catch(() => {
          this.chef = {}
        })
      },
      resolveChefAction(chef) {
        if (chefStatus.isChefWorkbenchAvailable(chef)) return null
        if (chefStatus.needChefApply(chef)) return null
        if (chefStatus.isChefPending(chef)) {
          return {
            title: '申请审核中',
            description: '资料已提交，可查看当前进度和已填写内容',
            buttonText: '查看进度',
            dialogTitle: '查看申请进度',
            dialogContent: '当前入驻申请正在审核中，可先查看已提交资料和审核状态。'
          }
        }
        if (chefStatus.isChefRejected(chef)) {
          return {
            title: '入驻资料待完善',
            description: '根据驳回原因补充资料后重新提交审核',
            buttonText: '完善资料',
            dialogTitle: '完善入驻资料',
            dialogContent: '请根据驳回原因完善资料，确认后前往资料页继续提交。'
          }
        }
        if (chefStatus.hasChefProfile(chef)) {
          return {
            title: '查看入驻资料',
            description: '当前账号已有入驻资料，可继续查看或补充完善',
            buttonText: '查看资料',
            dialogTitle: '查看入驻资料',
            dialogContent: '可查看当前入驻资料和状态说明，确认后前往资料页。'
          }
        }
        return null
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
        background-color: rgba(255, 255, 255, 0.92);

        .icon {
          font-size: 40px;
        }
      }

      .user-avatar {
        background-color: rgba(255, 255, 255, 0.92);
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

      .chef-action-card {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin: 15px 15px 0;
        padding: 18px 16px;
        border-radius: 14px;
        background: linear-gradient(135deg, #fff1e4 0%, #ffe4d1 100%);
        box-shadow: 0 12px 28px rgba(240, 106, 58, 0.12);
      }

      .chef-action-main {
        display: flex;
        flex-direction: column;
      }

      .chef-action-label {
        font-size: 12px;
        color: #c77445;
      }

      .chef-action-title {
        margin-top: 6px;
        font-size: 18px;
        font-weight: 600;
        color: #7a3b1b;
      }

      .chef-action-desc {
        margin-top: 4px;
        font-size: 12px;
        line-height: 18px;
        color: #9a6a4a;
      }

      .chef-action-button {
        margin: 0 0 0 14px;
        padding: 0 18px;
        min-width: 108px;
        height: 40px;
        line-height: 40px;
        border: none;
        border-radius: 999px;
        background: #f06a3a;
        color: #fff;
        font-size: 14px;
        font-weight: 600;
        box-shadow: 0 10px 20px rgba(240, 106, 58, 0.18);
      }

      .chef-action-button::after {
        border: none;
      }
    }
  }
</style>
