<template>
  <view class="chef-work-page">
    <view class="top-card">
      <view class="top-row">
        <view>
          <view class="title-row">
            <text class="chef-name">{{ chefName }}</text>
            <text :class="['status-pill', statusTone]">{{ auditStatusText }}</text>
          </view>
        </view>
        <image class="avatar" :src="chefAvatar" mode="aspectFill"></image>
      </view>

      <view v-if="isChefWorkbenchAvailable" class="notice-bar">
        <text class="notice-icon">公告</text>
        <swiper v-if="announcements.length" class="notice-swiper" vertical autoplay circular interval="3500">
          <swiper-item v-for="(item, index) in announcements" :key="index">
            <view class="notice-text">{{ item }}</view>
          </swiper-item>
        </swiper>
        <view v-else class="notice-text">暂无抽佣调整公告</view>
      </view>

    </view>

    <view v-if="needApply" class="empty-card">
      <button class="primary-btn" @click="goProfile">申请入驻</button>
    </view>

    <view v-if="isChefWorkbenchAvailable" class="summary-grid">
      <view class="summary-card">
        <text class="summary-number">{{ summary.waitResponse }}</text>
        <text class="summary-label">待接单报价</text>
      </view>
      <view class="summary-card">
        <text class="summary-number">{{ summary.todayService }}</text>
        <text class="summary-label">今日待服务</text>
      </view>
      <view class="summary-card">
        <text class="summary-number">{{ summary.dispute }}</text>
        <text class="summary-label">报价异议</text>
      </view>
      <view class="summary-card">
        <text class="summary-number">{{ summary.monthDone }}</text>
        <text class="summary-label">本月完成</text>
      </view>
    </view>

    <view v-if="isChefWorkbenchAvailable" class="quick-section">
      <view class="quick-list">
        <view class="quick-item" @click="goProfile">
          <view class="quick-icon dark">档</view>
          <view class="quick-body">
            <text class="quick-title">入驻与资料</text>
            <text class="quick-desc">维护手机号、菜系、区域、健康证和作品图</text>
          </view>
          <text class="arrow">›</text>
        </view>
        <view class="quick-item" @click="goOrders">
          <view class="quick-icon orange">单</view>
          <view class="quick-body">
            <text class="quick-title">接单报价</text>
            <text class="quick-desc">响应预约、拒绝、报价、处理异议和服务完成</text>
          </view>
          <text class="arrow">›</text>
        </view>
        <view class="quick-item" @click="goSettlement">
          <view class="quick-icon blue">结</view>
          <view class="quick-body">
            <text class="quick-title">月度结算</text>
            <text class="quick-desc">查看完成单数、提成、违约扣款、底薪和应发金额</text>
          </view>
          <text class="arrow">›</text>
        </view>
      </view>
    </view>

    <view v-if="canResign" class="resign-row">
      <button class="plain-danger" @click="handleResign">申请离职</button>
    </view>
  </view>
</template>

<script>
  import {
    getChefMy,
    resignChef,
    getChefOrderList,
    getCommissionAnnouncement
  } from '@/api/cooking/chef'
  const chefStatus = require('@/utils/chef-status')

  export default {
    data() {
      return {
        loading: false,
        chef: {},
        orders: [],
        announcements: []
      }
    },
    computed: {
      chefName() {
        return this.chef.realName || this.chef.name || this.chef.nickName || this.$store.state.user.name || '做饭人员'
      },
      chefAvatar() {
        return this.chef.avatarUrl || this.chef.avatar || this.$store.state.user.avatar || '/static/images/profile.jpg'
      },
      needApply() {
        return chefStatus.needChefApply(this.chef)
      },
      isChefWorkbenchAvailable() {
        return chefStatus.isChefWorkbenchAvailable(this.chef)
      },
      auditStatusText() {
        if (chefStatus.isChefApproved(this.chef) && chefStatus.isChefPaused(this.chef)) return '暂停接单'
        if (chefStatus.isChefApproved(this.chef) && chefStatus.isChefNormal(this.chef)) return '审核通过'
        if (chefStatus.isChefPending(this.chef)) return '待审核'
        if (chefStatus.isChefRejected(this.chef)) return '审核驳回'
        if (chefStatus.isChefDisabled(this.chef)) return '已禁用'
        if (chefStatus.isChefResigned(this.chef)) return '已离职'
        return this.needApply ? '未申请' : (this.chef.statusName || '资料待完善')
      },
      statusTone() {
        if (chefStatus.isChefApproved(this.chef) && chefStatus.isChefNormal(this.chef)) return 'ok'
        if (chefStatus.isChefPaused(this.chef) || chefStatus.isChefPending(this.chef)) return 'warn'
        if (chefStatus.isChefRejected(this.chef) || chefStatus.isChefDisabled(this.chef) || chefStatus.isChefResigned(this.chef)) return 'danger'
        return 'muted'
      },
      canResign() {
        return this.isChefWorkbenchAvailable
      },
      summary() {
        const now = new Date()
        const monthKey = this.formatMonth(now)
        return this.orders.reduce((result, order) => {
          const status = this.normalizeStatus(order.status || order.orderStatus)
          if (this.isStatus(status, ['WAIT_CHEF_RESPONSE', 'PENDING_RESPONSE', 'WAIT_RESPONSE'])) {
            result.waitResponse += 1
          }
          if (this.isStatus(status, ['QUOTE_DISPUTE', 'QUOTE_OBJECTION', 'DISPUTE'])) {
            result.dispute += 1
          }
          if (this.isStatus(status, ['WAIT_SERVICE', 'PENDING_SERVICE']) && this.isToday(this.getOrderTime(order))) {
            result.todayService += 1
          }
          if (this.isStatus(status, ['FINISHED', 'COMPLETED', 'DONE']) && this.formatMonth(this.getOrderTime(order)) === monthKey) {
            result.monthDone += 1
          }
          return result
        }, {
          waitResponse: 0,
          todayService: 0,
          dispute: 0,
          monthDone: 0
        })
      }
    },
    onShow() {
      this.loadPage()
    },
    methods: {
      loadPage() {
        this.loading = true
        this.loadChef().then(() => {
          if (this.isChefWorkbenchAvailable) {
            return Promise.all([this.loadOrders(), this.loadAnnouncements()])
          }
          this.orders = []
          this.announcements = []
          return null
        }).finally(() => {
          this.loading = false
        })
      },
      loadChef() {
        return getChefMy().then(res => {
          this.chef = this.unwrap(res) || {}
        }).catch(() => {
          this.chef = {}
        })
      },
      loadOrders() {
        return getChefOrderList({ pageNum: 1, pageSize: 100 }).then(res => {
          this.orders = this.toList(res)
        }).catch(() => {
          this.orders = []
        })
      },
      loadAnnouncements() {
        return getCommissionAnnouncement().then(res => {
          const list = this.toList(res)
          if (list.length) {
            this.announcements = list.map(item => {
              if (typeof item === 'string') return item
              return item.content || item.title || item.summary || item.remark || '平台抽佣公告'
            })
          } else {
            const data = this.unwrap(res)
            this.announcements = data && typeof data === 'string' ? [data] : []
          }
        }).catch(() => {
          this.announcements = []
        })
      },
      unwrap(res) {
        if (!res) return null
        if (res.data !== undefined) return res.data
        return res
      },
      toList(res) {
        const data = this.unwrap(res)
        if (Array.isArray(data)) return data
        if (data && Array.isArray(data.rows)) return data.rows
        if (res && Array.isArray(res.rows)) return res.rows
        if (data && Array.isArray(data.list)) return data.list
        if (data && Array.isArray(data.records)) return data.records
        return []
      },
      normalizeStatus(status) {
        return String(status || '').trim().toUpperCase()
      },
      isStatus(status, values) {
        return values.indexOf(status) > -1
      },
      getOrderTime(order) {
        return order.serviceStartTime || order.appointmentTime || order.bookingTime || order.startTime || order.reserveTime || ''
      },
      isToday(value) {
        if (!value) return false
        const date = new Date(String(value).replace(/-/g, '/'))
        const now = new Date()
        return date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth() && date.getDate() === now.getDate()
      },
      formatMonth(value) {
        const date = value instanceof Date ? value : new Date(String(value || '').replace(/-/g, '/'))
        if (!date || isNaN(date.getTime())) return ''
        const month = date.getMonth() + 1
        return `${date.getFullYear()}-${month < 10 ? '0' + month : month}`
      },
      goProfile() {
        this.$tab.navigateTo('/pages/work/profile')
      },
      goOrders() {
        this.$tab.navigateTo('/pages/work/orders')
      },
      goSettlement() {
        this.$tab.navigateTo('/pages/work/settlement')
      },
      handleResign() {
        this.$modal.confirm('离职申请提交后将由平台处理，未完成订单会被拦截，确认提交吗？').then(() => {
          resignChef({}).then(() => {
            this.$modal.msgSuccess('离职申请已提交')
            this.loadChef()
          })
        })
      }
    }
  }
</script>

<style lang="scss" scoped>
  page {
    background: #fff7f0;
  }

  .chef-work-page {
    min-height: 100vh;
    padding: 24rpx;
    box-sizing: border-box;
    color: #17211b;
  }

  .top-card {
    padding: 32rpx;
    border-radius: 16rpx;
    background: #6a3a2b;
    color: #fff;
  }

  .top-row,
  .title-row,
  .quick-item {
    display: flex;
    align-items: center;
  }

  .top-row {
    justify-content: space-between;
  }

  .chef-name {
    max-width: 360rpx;
    font-size: 42rpx;
    font-weight: 700;
    line-height: 1.2;
  }

  .status-pill {
    margin-left: 16rpx;
    padding: 6rpx 14rpx;
    border-radius: 999rpx;
    font-size: 22rpx;
    background: rgba(255, 255, 255, 0.15);
    color: #fff;
  }

  .status-pill.ok {
    background: #d9f5df;
    color: #176c35;
  }

  .status-pill.warn {
    background: #fff0cb;
    color: #875800;
  }

  .status-pill.danger {
    background: #ffe0dc;
    color: #a82819;
  }

  .status-pill.muted {
    background: #edf0ee;
    color: #4e5a52;
  }

  .avatar {
    width: 104rpx;
    height: 104rpx;
    border-radius: 52rpx;
    background: rgba(255, 255, 255, 0.16);
  }

  .notice-bar {
    display: flex;
    align-items: center;
    margin-top: 28rpx;
    padding: 18rpx 20rpx;
    border-radius: 10rpx;
    background: rgba(255, 255, 255, 0.1);
  }

  .notice-icon {
    flex: 0 0 auto;
    padding: 4rpx 10rpx;
    border-radius: 6rpx;
    background: #f4c45f;
    color: #241a06;
    font-size: 22rpx;
  }

  .notice-swiper {
    flex: 1;
    height: 42rpx;
    margin-left: 14rpx;
  }

  .notice-text {
    flex: 1;
    margin-left: 14rpx;
    color: rgba(255, 255, 255, 0.86);
    font-size: 24rpx;
    line-height: 42rpx;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .primary-btn {
    border-color: #2f8f55;
    background: #2f8f55;
    color: #fff;
  }

  .empty-card,
  .summary-card,
  .quick-list,
  .resign-row {
    border-radius: 14rpx;
    background: #fff;
    box-shadow: 0 8rpx 28rpx rgba(20, 35, 27, 0.06);
  }

  .empty-card {
    margin-top: 24rpx;
    padding: 34rpx;
  }

  .empty-title {
    font-size: 34rpx;
    font-weight: 700;
  }

  .empty-desc {
    margin: 14rpx 0 24rpx;
    color: #607066;
    font-size: 26rpx;
    line-height: 1.6;
  }

  .primary-btn {
    height: 78rpx;
    line-height: 78rpx;
    border-radius: 8rpx;
    font-size: 28rpx;
  }

  .summary-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 18rpx;
    margin-top: 22rpx;
  }

  .summary-card {
    padding: 26rpx;
  }

  .summary-number {
    display: block;
    color: #17211b;
    font-size: 42rpx;
    font-weight: 700;
  }

  .summary-label {
    display: block;
    margin-top: 8rpx;
    color: #607066;
    font-size: 24rpx;
  }

  .quick-section {
    margin-top: 30rpx;
  }

  .section-title {
    margin-bottom: 16rpx;
    font-size: 30rpx;
    font-weight: 700;
  }

  .quick-list {
    overflow: hidden;
  }

  .quick-item {
    min-height: 132rpx;
    padding: 24rpx;
    border-bottom: 1rpx solid #edf0ee;
    box-sizing: border-box;
  }

  .quick-item:last-child {
    border-bottom: none;
  }

  .quick-icon {
    flex: 0 0 auto;
    width: 72rpx;
    height: 72rpx;
    border-radius: 10rpx;
    color: #fff;
    font-size: 28rpx;
    font-weight: 700;
    line-height: 72rpx;
    text-align: center;
  }

  .quick-icon.dark {
    background: #25362c;
  }

  .quick-icon.green {
    background: #2f8f55;
  }

  .quick-icon.orange {
    background: #c1732d;
  }

  .quick-icon.blue {
    background: #316a93;
  }

  .quick-body {
    flex: 1;
    min-width: 0;
    margin-left: 22rpx;
  }

  .quick-title {
    display: block;
    font-size: 30rpx;
    font-weight: 650;
  }

  .quick-desc {
    display: block;
    margin-top: 8rpx;
    color: #6c7b70;
    font-size: 24rpx;
    line-height: 1.45;
  }

  .arrow {
    color: #98a29b;
    font-size: 42rpx;
  }

  .resign-row {
    margin-top: 26rpx;
    padding: 18rpx;
  }

  .plain-danger {
    background: #fff;
    color: #a82819;
    font-size: 28rpx;
  }
</style>
