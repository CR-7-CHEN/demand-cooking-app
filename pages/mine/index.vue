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
        <view v-if="chefEntry" class="list-cell list-cell-arrow" @click="handleChefEntry">
          <view class="menu-item-box">
            <view class="iconfont icon-people menu-icon"></view>
            <view class="chef-entry-box">
              <view>{{ chefEntry.title }}</view>
              <view class="chef-entry-desc">{{ chefEntry.description }}</view>
            </view>
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
      chefEntry() {
        if (!this.$store.state.user.token) return null
        return this.resolveChefEntry(this.chef)
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
      handleChefEntry() {
        if (!this.$store.state.user.token) {
          this.handleToLogin()
          return
        }
        this.$tab.navigateTo('/pages/work/profile')
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
      resolveChefEntry(chef) {
        if (chefStatus.isChefWorkbenchAvailable(chef)) return null
        if (chefStatus.needChefApply(chef)) {
          return {
            title: '申请成为做饭人员',
            description: '提交做饭人员资料并等待审核'
          }
        }
        if (chefStatus.isChefPending(chef)) {
          return {
            title: '查看申请进度',
            description: '审核中，可查看已提交的做饭人员资料'
          }
        }
        if (chefStatus.isChefRejected(chef)) {
          return {
            title: '完善做饭人员资料',
            description: '根据驳回原因修改资料后重新提交'
          }
        }
        if (chefStatus.hasChefProfile(chef)) {
          return {
            title: '查看做饭人员资料',
            description: '工作台暂不可用，可查看或完善入驻资料'
          }
        }
        return {
          title: '申请成为做饭人员',
          description: '提交做饭人员资料并等待审核'
        }
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

      .chef-entry-box {
        display: flex;
        flex-direction: column;
      }

      .chef-entry-desc {
        margin-top: 4px;
        font-size: 12px;
        color: #8a8a8a;
      }
    }
  }
</style>
