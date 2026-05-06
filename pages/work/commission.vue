<template>
  <view class="commission-page">
    <view class="summary-panel">
      <view class="summary-top">
        <view>
          <text class="summary-label">本月提成</text>
          <view class="summary-month">{{ summary.month || queryMonth }}</view>
        </view>
        <picker mode="date" fields="month" :value="queryMonth" @change="onMonthChange">
          <view class="month-button">切换月份</view>
        </picker>
      </view>
      <view class="amount">{{ money(summary.commissionTotal) }}</view>
      <view class="summary-grid">
        <view class="metric">
          <text class="metric-value">{{ summary.orderCount || 0 }}</text>
          <text class="metric-label">完成订单</text>
        </view>
        <view class="metric">
          <text class="metric-value">{{ money(avgCommission) }}</text>
          <text class="metric-label">单均提成</text>
        </view>
      </view>
    </view>

    <view class="section-head">
      <text class="section-title">每单完成列表</text>
      <text class="section-count">{{ rows.length }} 单</text>
    </view>

    <view v-if="loading" class="state-card">
      <view class="empty-title">正在加载提成明细</view>
      <view class="empty-text">请稍候，正在核对订单完成时间和评价信息</view>
    </view>

    <view v-else-if="unavailable" class="state-card">
      <view class="empty-title">暂不可查看</view>
      <view class="empty-text">该页面仅审核通过且未离职/未禁用的做饭人员可用</view>
    </view>

    <view v-else-if="rows.length === 0" class="state-card warm-empty">
      <view class="empty-title">本月暂无完成订单</view>
      <view class="empty-text">完成服务后，每单提成和评价会展示在这里</view>
    </view>

    <view v-else class="order-list">
      <view v-for="order in rows" :key="order.orderId || order.orderNo" class="order-card">
        <view class="order-top">
          <view>
            <text class="order-label">订单号</text>
            <view class="order-no">{{ order.orderNo || '-' }}</view>
          </view>
          <view class="commission">{{ money(order.commissionAmount) }}</view>
        </view>
        <view class="info-line">
          <text class="info-label">订单金额</text>
          <text class="info-value">{{ money(order.payAmount) }}</text>
        </view>
        <view class="info-line">
          <text class="info-label">完成时间</text>
          <text class="info-value">{{ formatTime(order.completeTime) }}</text>
        </view>
        <view class="review-box">
          <view class="review-head">
            <text>服务评价</text>
            <text class="rating">{{ ratingText(order.rating) }}</text>
          </view>
          <view class="review-content">{{ order.reviewContent || '用户暂未评价' }}</view>
          <view v-if="order.reviewTime" class="review-time">{{ formatTime(order.reviewTime) }}</view>
        </view>
      </view>
    </view>
  </view>
</template>

<script>
  import { getChefCommissionOrders } from '@/api/cooking/chef'

  export default {
    data() {
      return {
        loading: false,
        unavailable: false,
        queryMonth: '',
        summary: {},
        rows: []
      }
    },
    computed: {
      avgCommission() {
        const count = Number(this.summary.orderCount || this.rows.length || 0)
        const total = Number(this.summary.commissionTotal || 0)
        return count > 0 ? total / count : 0
      }
    },
    onLoad(options) {
      this.queryMonth = options && options.month ? options.month : this.currentMonth()
      this.load()
    },
    onPullDownRefresh() {
      this.load().finally(() => {
        uni.stopPullDownRefresh()
      })
    },
    methods: {
      currentMonth() {
        const now = new Date()
        const month = now.getMonth() + 1
        return now.getFullYear() + '-' + (month < 10 ? '0' + month : month)
      },
      onMonthChange(event) {
        this.queryMonth = event.detail.value
        this.load()
      },
      load() {
        this.loading = true
        this.unavailable = false
        return getChefCommissionOrders({ month: this.queryMonth }).then(res => {
          const data = this.unwrap(res) || {}
          this.summary = data.summary || {}
          this.rows = Array.isArray(data.rows) ? data.rows : []
        }).catch(() => {
          this.summary = {}
          this.rows = []
          this.unavailable = true
        }).finally(() => {
          this.loading = false
        })
      },
      unwrap(res) {
        if (!res) return null
        if (res.data !== undefined) return res.data
        return res
      },
      money(value) {
        const amount = Number(value)
        if (!Number.isFinite(amount)) return '¥0.00'
        return `¥${amount.toFixed(2)}`
      },
      ratingText(value) {
        const rating = Number(value)
        if (!Number.isFinite(rating)) return '未评分'
        return `${rating.toFixed(1)} 分`
      },
      formatTime(value) {
        if (!value) return '暂无时间'
        const date = new Date(value)
        if (Number.isNaN(date.getTime())) return String(value)
        const pad = num => String(num).padStart(2, '0')
        return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`
      }
    }
  }
</script>

<style lang="scss" scoped>
  page {
    background: #fff7f0;
  }

  .commission-page {
    min-height: 100vh;
    padding: 28rpx 28rpx 44rpx;
    background: #fff7f0;
  }

  .summary-panel {
    padding: 30rpx;
    border-radius: 8rpx;
    color: #4a2516;
    background: linear-gradient(135deg, #fff0df 0%, #ffe0bf 100%);
    box-shadow: 0 10rpx 30rpx rgba(87, 52, 26, .08);
  }

  .summary-top,
  .order-top,
  .info-line,
  .review-head,
  .section-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 18rpx;
  }

  .summary-label,
  .order-label,
  .info-label {
    color: #9a6a45;
    font-size: 24rpx;
  }

  .summary-month {
    margin-top: 8rpx;
    font-size: 34rpx;
    font-weight: 700;
  }

  .month-button {
    padding: 14rpx 22rpx;
    border-radius: 8rpx;
    color: #f06a3a;
    font-size: 24rpx;
    background: rgba(255, 255, 255, .72);
  }

  .amount {
    margin-top: 28rpx;
    font-size: 58rpx;
    font-weight: 800;
  }

  .summary-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 18rpx;
    margin-top: 26rpx;
  }

  .metric {
    min-width: 0;
    padding: 18rpx;
    border-radius: 8rpx;
    background: rgba(255, 255, 255, .58);
  }

  .metric-value {
    display: block;
    color: #2a211b;
    font-size: 32rpx;
    font-weight: 700;
  }

  .metric-label {
    display: block;
    margin-top: 6rpx;
    color: #9a6a45;
    font-size: 24rpx;
  }

  .section-head {
    padding: 30rpx 4rpx 18rpx;
  }

  .section-title {
    color: #1d2b26;
    font-size: 32rpx;
    font-weight: 700;
  }

  .section-count {
    color: #9a6a45;
    font-size: 24rpx;
  }

  .state-card,
  .order-card {
    border-radius: 8rpx;
    background: #fff;
    box-shadow: 0 8rpx 28rpx rgba(31, 41, 37, .06);
  }

  .state-card {
    padding: 64rpx 28rpx;
    text-align: center;
  }

  .warm-empty {
    background: #fffaf3;
  }

  .empty-title {
    color: #2b312f;
    font-size: 30rpx;
    font-weight: 700;
  }

  .empty-text {
    margin-top: 12rpx;
    color: #8a8f98;
    font-size: 25rpx;
    line-height: 1.5;
  }

  .order-list {
    display: flex;
    flex-direction: column;
    gap: 20rpx;
  }

  .order-card {
    padding: 26rpx;
  }

  .order-no {
    margin-top: 8rpx;
    color: #1f2925;
    font-size: 30rpx;
    font-weight: 700;
  }

  .commission {
    flex-shrink: 0;
    color: #e85d34;
    font-size: 34rpx;
    font-weight: 800;
  }

  .info-line {
    margin-top: 18rpx;
  }

  .info-value {
    min-width: 0;
    color: #515b56;
    font-size: 25rpx;
    text-align: right;
  }

  .review-box {
    margin-top: 20rpx;
    padding: 20rpx;
    border-radius: 8rpx;
    background: #fff7ed;
  }

  .review-head {
    color: #4a2516;
    font-size: 26rpx;
    font-weight: 700;
  }

  .rating {
    color: #f06a3a;
  }

  .review-content {
    margin-top: 12rpx;
    color: #5f6662;
    font-size: 25rpx;
    line-height: 1.5;
  }

  .review-time {
    margin-top: 10rpx;
    color: #9a9f9b;
    font-size: 23rpx;
  }
</style>
