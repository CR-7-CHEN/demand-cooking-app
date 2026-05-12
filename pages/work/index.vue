<template>
  <view class="chef-work-page">
    <view class="top-card" :class="{ 'service-top-card': !isChefWorkbenchAvailable }">
      <view class="top-row">
        <view>
          <view class="title-row">
            <text class="chef-name">{{ pageTitle }}</text>
            <text v-if="isChefWorkbenchAvailable && !needApply" :class="['status-pill', statusTone]">{{ auditStatusText }}</text>
          </view>
        </view>
        <image class="avatar" :src="chefAvatar" mode="aspectFill"></image>
      </view>

      <view v-if="isChefWorkbenchAvailable" class="notice-bar">
        <view class="notice-icon">
          <uni-icons type="sound-filled" color="#f4c45f" :size="16"></uni-icons>
        </view>
        <uni-notice-bar
          v-if="announcementText"
          class="notice-marquee"
          :text="announcementText"
          :scrollable="true"
          :single="true"
          :show-icon="false"
          background-color="transparent"
          color="#fff7d1"
          :speed="60"
          :font-size="13"
        />
        <view v-else class="notice-empty">暂无公告</view>
      </view>

    </view>

    <view v-if="!isChefWorkbenchAvailable" class="service-section">
      <view class="service-head">
        <text class="service-title">服务中心</text>
        <text class="service-desc">查看订单、地址、客服与常见问题</text>
      </view>
      <view class="quick-list service-list">
        <view
          v-for="item in serviceCenterActions"
          :key="item.title"
          class="quick-item"
          @click="handleServiceCenterAction(item)"
        >
          <view class="quick-icon" :class="item.tone">
            {{ item.badge }}
            <text v-if="item.reminderCount > 0" class="quick-badge">{{ item.reminderBadgeText }}</text>
          </view>
          <view class="quick-body">
            <text class="quick-title">{{ item.title }}</text>
            <text class="quick-desc">{{ item.description }}</text>
          </view>
          <text class="arrow">></text>
        </view>
      </view>
    </view>

    <view v-if="isChefWorkbenchAvailable" class="summary-grid">
      <view class="summary-card">
        <text class="summary-number">{{ waitResponseCount }}</text>
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
          <view class="quick-icon dark">资料</view>
          <view class="quick-body">
            <text class="quick-title">入驻与资料</text>
            <text class="quick-desc">查看已提交的审核资料，可进行修改</text>
          </view>
          <text class="arrow">›</text>
        </view>
        <view class="quick-item" @click="goOrders">
          <view class="quick-icon orange">
            单
            <text v-if="waitResponseCount > 0" class="quick-badge">{{ waitResponseReminderBadgeText }}</text>
          </view>
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

    <uni-popup ref="resignPopup" type="dialog" :is-mask-click="!resignSubmitting" @change="onResignPopupChange">
      <view class="resign-dialog">
        <view class="resign-dialog__title">申请离职</view>
        <view class="resign-dialog__desc">请先处理完未完成订单，再提交离职申请</view>
        <input
          v-model.trim="resignReasonInput"
          class="resign-dialog__input"
          placeholder="请输入离职原因"
          placeholder-class="resign-dialog__placeholder"
          maxlength="500"
        />
        <view class="resign-dialog__actions">
          <button class="resign-dialog__btn resign-dialog__btn--ghost" :disabled="resignSubmitting" @click="closeResignPopup">取消</button>
          <button class="resign-dialog__btn resign-dialog__btn--danger" :loading="resignSubmitting" @click="submitResign">确认离职</button>
        </view>
      </view>
    </uni-popup>
  </view>
</template>

<script>
  import { getToken } from '@/utils/auth'
  import { listMyOrders } from '@/api/cooking/user'
  import {
    getChefMy,
    resignChef,
    getChefOrderList,
    getChefWorkbench,
    getWorkbenchAnnouncements
  } from '@/api/cooking/chef'
  const chefStatus = require('@/utils/chef-status')
  const orderStatus = require('@/utils/order-status')
  const userOrderTabs = require('@/utils/user-order-tabs')
  const CHEF_ORDER_GROUP_MAP = {
    [orderStatus.ORDER_STATUS.WAITING_RESPONSE]: 'response',
    [orderStatus.ORDER_STATUS.PRICE_OBJECTION]: 'dispute',
    [orderStatus.ORDER_STATUS.WAITING_SERVICE]: 'service',
    [orderStatus.ORDER_STATUS.WAITING_CONFIRM]: 'confirm',
    [orderStatus.ORDER_STATUS.COMPLETED]: 'done'
  }

  function chefOrderStatusGroup(status) {
    return CHEF_ORDER_GROUP_MAP[orderStatus.normalizeOrderStatus(status)] || ''
  }

  const WAIT_RESPONSE_COUNT_FIELDS = ['waitingResponseCount', 'responseCount', 'response']

  function readCountValue(source, keys) {
    if (!source || !Array.isArray(keys)) return null
    for (let i = 0; i < keys.length; i += 1) {
      const key = keys[i]
      if (!Object.prototype.hasOwnProperty.call(source, key)) continue
      const count = Number(source[key])
      if (Number.isFinite(count) && count >= 0) {
        return count
      }
    }
    return null
  }

  function toOrderStats(workbench) {
    const stats = workbench && typeof workbench === 'object'
      ? (workbench.orderStats || workbench)
      : null
    if (!stats) return null
    return {
      response: readCountValue(stats, WAIT_RESPONSE_COUNT_FIELDS)
    }
  }

  export default {
    data() {
      return {
        loading: false,
        chef: {},
        orders: [],
        orderStats: null,
        announcements: [],
        serviceOrderReminderCount: 0,
        resignReasonInput: '',
        resignSubmitting: false
      }
    },
    computed: {
      pageTitle() {
        return this.isChefWorkbenchAvailable ? this.chefName : '服务中心'
      },
      chefName() {
        return this.chef.realName || this.chef.name || this.chef.nickName || this.$store.state.user.name || '服务厨师'
      },
      chefAvatar() {
        return this.chef.avatarUrl || this.chef.avatar || this.$store.state.user.avatar || '/static/images/profile.jpg'
      },
      needApply() {
        return chefStatus.needChefApply(this.chef)
      },
      hasChefProfile() {
        return chefStatus.hasChefProfile(this.chef)
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
      chefRejectReason() {
        return chefStatus.getChefRejectReason(this.chef)
      },
      canResign() {
        return this.isChefWorkbenchAvailable
      },
      serviceOrderReminderBadgeText() {
        return this.serviceOrderReminderCount > 99 ? '99+' : String(this.serviceOrderReminderCount)
      },
      waitResponseCount() {
        if (this.orderStats && this.orderStats.response !== null && this.orderStats.response !== undefined) {
          return this.orderStats.response
        }
        return this.summary.waitResponse
      },
      waitResponseReminderBadgeText() {
        const count = Number(this.waitResponseCount || 0)
        if (!Number.isFinite(count) || count < 0) return '0'
        return count > 99 ? '99+' : String(count)
      },
      serviceCenterActions() {
        return [
          {
            title: '我的订单',
            description: '查看当前账号的订单记录与服务进度',
            url: '/pages/user/orders',
            badge: '订',
            tone: 'orange',
            reminderCount: this.serviceOrderReminderCount,
            reminderBadgeText: this.serviceOrderReminderBadgeText,
            requiresLogin: true
          },
          {
            title: '地址管理/常用地址',
            description: '维护常用地址，方便下单时快速选择',
            url: '/pages/user/address',
            badge: '址',
            tone: 'dark',
            requiresLogin: true
          },
          {
            title: '在线客服',
            description: '前往客服入口，咨询平台规则与问题',
            url: '/pages/mine/service/index',
            badge: '服',
            tone: 'blue'
          },
          {
            title: '常见问题',
            description: '查看常见问题与使用说明',
            url: '/pages/mine/help/index',
            badge: '问',
            tone: 'green'
          },
          {
            title: chefStatus.isChefRejected(this.chef) ? '完善入驻资料' : '申请成为服务厨师',
            description: chefStatus.isChefRejected(this.chef)
              ? (this.chefRejectReason ? `驳回原因：${this.chefRejectReason}` : '入驻申请已驳回，请完善资料后重新提交')
              : '提交服务厨师资料，申请开通工作台能力',
            url: '/pages/work/profile',
            badge: '申',
            tone: 'red',
            action: 'applyChef',
            confirmContent: chefStatus.isChefRejected(this.chef) ? '是否前往完善入驻资料?' : '是否申请入驻成为服务厨师?',
            requiresLogin: true
          }
        ]
      },
      announcementText() {
        return this.announcements.filter(Boolean).join('   |   ')
      },
      summary() {
        const now = new Date()
        const monthKey = this.formatMonth(now)
        return this.orders.reduce((result, order) => {
          const status = this.orderStatusOf(order)
          const group = chefOrderStatusGroup(status)
          if (group === 'response') {
            result.waitResponse += 1
          }
          if (group === 'dispute') {
            result.dispute += 1
          }
          if (group === 'service' && this.isToday(this.getOrderTime(order))) {
            result.todayService += 1
          }
          if (orderStatus.isCompletedOrder(status) && this.formatMonth(this.getOrderTime(order)) === monthKey) {
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
        return this.loadChef().then(() => {
          this.syncPageLabels()
          if (this.isChefWorkbenchAvailable) {
            return Promise.all([this.loadOrders(), this.loadWorkbench(), this.loadAnnouncements()])
          }
          this.orders = []
          this.orderStats = null
          this.announcements = []
          return this.loadServiceCenterReminder()
        }).finally(() => {
          this.loading = false
        })
      },
      syncPageLabels() {
        const title = this.isChefWorkbenchAvailable ? '工作台' : '服务中心'
        if (typeof uni.setTabBarItem === 'function') {
          uni.setTabBarItem({
            index: 1,
            text: title
          })
        }
        if (typeof uni.setNavigationBarTitle === 'function') {
          uni.setNavigationBarTitle({ title })
        }
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
      loadWorkbench() {
        return getChefWorkbench().then(res => {
          this.orderStats = toOrderStats(this.unwrap(res))
        }).catch(() => {
          this.orderStats = null
        })
      },
      loadServiceCenterReminder() {
        if (!getToken()) {
          this.serviceOrderReminderCount = 0
          return Promise.resolve()
        }
        return listMyOrders({
          pageNum: 1,
          pageSize: 120,
          statusGroup: 'payment',
          statuses: userOrderTabs.statusesOfTab('payment')
        }).then(res => {
          this.serviceOrderReminderCount = this.toList(res).length
        }).catch(() => {
          this.serviceOrderReminderCount = 0
        })
      },
      loadAnnouncements() {
        return getWorkbenchAnnouncements().then(res => {
          const list = this.toList(res)
          if (list.length) {
            this.announcements = list.map(item => this.formatAnnouncement(item))
          } else {
            const data = this.unwrap(res)
            this.announcements = data && typeof data === 'string' ? [data] : []
          }
        }).catch(() => {
          this.announcements = []
        })
      },
      formatAnnouncement(item) {
        if (typeof item === 'string') return item
        const noticeContent = this.normalizeAnnouncementText(item.noticeContent)
        if (noticeContent) return noticeContent
        const announcementContent = this.normalizeAnnouncementText(item.announcementContent)
        if (announcementContent) return announcementContent
        const content = this.normalizeAnnouncementText(item.content || item.summary || item.remark)
        if (content) return content
        const noticeTitle = this.normalizeAnnouncementText(item.noticeTitle)
        if (noticeTitle) return noticeTitle
        return this.normalizeAnnouncementText(item.title) || '平台公告'
      },
      normalizeAnnouncementText(value) {
        return String(value || '')
          .replace(/<[^>]+>/g, ' ')
          .replace(/&nbsp;/gi, ' ')
          .replace(/\s+/g, ' ')
          .trim()
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
      orderStatusOf(order) {
        if (!order) return ''
        if (order.status !== undefined && order.status !== null && order.status !== '') return order.status
        return order.orderStatus
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
      handleServiceCenterAction(item) {
        if (!item || !item.url) return
        if (item.action === 'applyChef') {
          uni.showModal({
            title: '申请入驻',
            content: item.confirmContent || '是否申请入驻成为服务厨师?',
            cancelText: '否',
            confirmText: '是',
            success: (res) => {
              if (res.confirm) {
                this.requireLogin(item.url)
              }
            }
          })
          return
        }
        if (item.requiresLogin) {
          this.requireLogin(item.url)
          return
        }
        this.$tab.navigateTo(item.url)
      },
      requireLogin(nextUrl) {
        if (!getToken()) {
          this.$modal.msg('请先登录后继续')
          this.$tab.navigateTo('/pages/login')
          return
        }
        this.$tab.navigateTo(nextUrl)
      },
      goProfile() {
        if (this.needApply) {
          uni.showModal({
            title: '入驻确认',
            content: '是否入驻成为服务厨师？',
            cancelText: '否',
            confirmText: '是',
            success: (res) => {
              if (res.confirm) {
                this.$tab.navigateTo('/pages/work/profile')
              }
            }
          })
        } else {
          this.$tab.navigateTo('/pages/work/profile')
        }
      },
      goOrders() {
        this.$tab.navigateTo('/pages/work/orders?tab=response')
      },
      goSettlement() {
        this.$tab.navigateTo('/pages/work/settlement')
      },
      handleResign() {
        if (!this.$refs.resignPopup) return
        this.$refs.resignPopup.open()
      },
      onResignPopupChange(event) {
        const detail = event && event.detail ? event.detail : {}
        if (!detail.show && !this.resignSubmitting) {
          this.resignReasonInput = ''
        }
      },
      closeResignPopup() {
        if (this.resignSubmitting || !this.$refs.resignPopup) return
        this.$refs.resignPopup.close()
      },
      submitResign() {
        const resignReason = String(this.resignReasonInput || '').trim()
        if (!resignReason) {
          this.$modal.msg('请输入离职原因')
          return
        }
        this.resignSubmitting = true
        resignChef({ resignReason }).then(() => {
          this.$modal.msgSuccess('离职申请已提交')
          this.resignReasonInput = ''
          if (this.$refs.resignPopup) {
            this.$refs.resignPopup.close()
          }
          this.loadChef()
        }).finally(() => {
          this.resignSubmitting = false
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

  .service-top-card {
    background: linear-gradient(135deg, #f05d3c 0%, #f58a4b 58%, #ffc46b 100%);
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
    margin-top: 20rpx;
    padding: 10rpx 16rpx;
    border-radius: 8rpx;
    background: rgba(255, 255, 255, 0.08);
  }

  .notice-icon {
    flex: 0 0 auto;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 34rpx;
    height: 34rpx;
  }

  .notice-marquee,
  .notice-empty {
    flex: 1;
    margin-left: 10rpx;
  }

  .notice-empty {
    color: #fff7d1;
    font-size: 24rpx;
    font-weight: 600;
    line-height: 36rpx;
  }

  ::v-deep .notice-marquee.uni-noticebar {
    padding: 0;
    min-height: 36rpx;
  }

  ::v-deep .notice-marquee .uni-noticebar__content-wrapper {
    height: 36rpx !important;
  }

  ::v-deep .notice-marquee .uni-noticebar__content-text {
    overflow: hidden;
    font-weight: 700;
    letter-spacing: 0;
    line-height: 36rpx !important;
    text-shadow: 0 2rpx 6rpx rgba(0, 0, 0, 0.14);
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

  .service-section {
    margin-top: 24rpx;
  }

  .service-head {
    margin-bottom: 16rpx;
  }

  .service-title {
    display: block;
    font-size: 30rpx;
    font-weight: 700;
  }

  .service-desc {
    display: block;
    margin-top: 8rpx;
    color: #607066;
    font-size: 24rpx;
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
    position: relative;
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

  .quick-badge {
    position: absolute;
    top: -12rpx;
    right: -16rpx;
    min-width: 36rpx;
    height: 36rpx;
    padding: 0 10rpx;
    box-sizing: border-box;
    line-height: 36rpx;
    border-radius: 999rpx;
    background: #e85d34;
    color: #fff;
    font-size: 20rpx;
    text-align: center;
    font-weight: 600;
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

  .quick-icon.red {
    background: #b9432d;
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

  .resign-dialog {
    width: 620rpx;
    padding: 36rpx 32rpx 28rpx;
    border-radius: 16rpx;
    background: #fff;
    box-sizing: border-box;
  }

  .resign-dialog__title {
    color: #17211b;
    font-size: 36rpx;
    font-weight: 700;
    text-align: center;
  }

  .resign-dialog__desc {
    margin-top: 18rpx;
    color: #66756b;
    font-size: 28rpx;
    line-height: 1.6;
  }

  .resign-dialog__input {
    width: 100%;
    height: 76rpx;
    margin-top: 22rpx;
    padding: 0 20rpx;
    border: 1rpx solid #e2e8e4;
    border-radius: 8rpx;
    box-sizing: border-box;
    color: #17211b;
    font-size: 24rpx;
    background: #fbfcfb;
  }

  .resign-dialog__placeholder {
    color: #98a29b;
    font-size: 22rpx;
  }

  .resign-dialog__actions {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 18rpx;
    margin-top: 26rpx;
  }

  .resign-dialog__btn {
    height: 76rpx;
    line-height: 76rpx;
    border-radius: 8rpx;
    font-size: 28rpx;
  }

  .resign-dialog__btn--ghost {
    background: #fff;
    color: #5f6d64;
    border: 1rpx solid #d7dfda;
  }

  .resign-dialog__btn--danger {
    background: #a82819;
    color: #fff;
  }
</style>
