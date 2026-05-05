<template>
  <view class="page">
    <view class="header">
      <view>
        <view class="title">我的订单</view>
        <view class="subtitle">查看预约、报价、支付和完成进度</view>
      </view>
      <button class="refresh-btn" @click="loadOrders">刷新</button>
    </view>

    <scroll-view scroll-x class="tabs">
      <view
        v-for="item in tabs"
        :key="item.value"
        :class="['tab', activeStatus === item.value ? 'active' : '']"
        @click="changeStatus(item.value)"
      >
        {{ item.label }}
      </view>
    </scroll-view>

    <view v-if="loading" class="state">订单加载中...</view>
    <view v-else-if="orders.length === 0" class="state">当前没有订单</view>

    <view v-else class="list">
      <view v-for="order in orders" :key="order.id || order.orderNo" class="order-card" @click="openOrder(order)">
        <view class="order-head">
          <view class="order-no">{{ order.orderNo || '预约订单' }}</view>
          <view class="status">{{ statusText(order.status) }}</view>
        </view>
        <view class="line">做饭人员：{{ chefDisplayName(order) }}</view>
        <view class="line">上门时间：{{ order.startTime || order.appointmentStartTime || order.serviceStartTime || '-' }}</view>
        <view class="line">服务区域：{{ order.serviceArea || order.areaName || '-' }}</view>
        <view class="footer">
          <text v-if="order.quoteAmount || order.price">报价 ¥{{ order.quoteAmount || order.price }}</text>
          <text v-else>等待报价</text>
          <uni-icons type="right" size="16" color="#9aa19c"></uni-icons>
        </view>
      </view>
    </view>
  </view>
</template>

<script>
  import { listMyOrders } from '@/api/cooking/user'

  export default {
    data() {
      return {
        loading: false,
        activeStatus: '',
        tabs: [
          { label: '全部', value: '' },
          { label: '待响应', value: 'WAITING_RESPONSE' },
          { label: '待支付', value: 'WAITING_PAY' },
          { label: '待服务', value: 'WAITING_SERVICE' },
          { label: '待确认', value: 'WAITING_CONFIRM' },
          { label: '已完成', value: 'COMPLETED' }
        ],
        orders: []
      }
    },
    onShow() {
      this.loadOrders()
    },
    methods: {
      loadOrders() {
        this.loading = true
        listMyOrders({
          status: this.activeStatus
        }).then(res => {
          this.orders = this.pickList(res).map(this.normalizeOrder)
        }).catch(() => {
          this.orders = []
        }).finally(() => {
          this.loading = false
        })
      },
      pickList(res) {
        if (Array.isArray(res)) return res
        if (Array.isArray(res.rows)) return res.rows
        if (Array.isArray(res.records)) return res.records
        if (Array.isArray(res.data)) return res.data
        if (res.data && Array.isArray(res.data.rows)) return res.data.rows
        if (res.data && Array.isArray(res.data.records)) return res.data.records
        if (res.data && Array.isArray(res.data.list)) return res.data.list
        return []
      },
      normalizeOrder(item) {
        return {
          ...item,
          id: item.id || item.orderId,
          startTime: item.startTime || item.appointmentStartTime || item.serviceStartTime,
          price: item.price || item.totalPrice || item.quoteAmount
        }
      },
      chefDisplayName(order) {
        return order.chefName || (order.chef && order.chef.name) || '待确认'
      },
      changeStatus(status) {
        this.activeStatus = status
        this.loadOrders()
      },
      openOrder(order) {
        if (!order.id) {
          this.$modal.msg('订单缺少编号，无法查看详情')
          return
        }
        this.$tab.navigateTo(`/pages/user/order-detail?id=${order.id}`)
      },
      statusText(status) {
        const map = {
          WAITING_RESPONSE: '待响应',
          REJECTED_CLOSED: '已拒绝',
          WAITING_PAY: '待支付',
          PRICE_OBJECTION: '异议中',
          WAITING_SERVICE: '待服务',
          WAITING_CONFIRM: '待确认',
          COMPLETED: '已完成',
          CANCELED: '已取消',
          REFUNDING: '退款中',
          REFUNDED: '已退款',
          REFUND_FAILED: '退款失败'
        }
        return map[status] || status || '未知'
      }
    }
  }
</script>

<style lang="scss" scoped>
  page,
  .page {
    min-height: 100vh;
    background: #fff7f0;
  }

  .page {
    padding: 28rpx 24rpx 48rpx;
  }

  .header,
  .order-head,
  .footer {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  .title {
    color: #1d2b26;
    font-size: 38rpx;
    font-weight: 700;
  }

  .subtitle {
    margin-top: 8rpx;
    color: #7b8580;
    font-size: 24rpx;
  }

  .refresh-btn {
    width: 128rpx;
    height: 58rpx;
    line-height: 58rpx;
    padding: 0;
    border-radius: 8rpx;
    color: #fff;
    background: #f06a3a;
    font-size: 26rpx;
  }

  .tabs {
    margin-top: 26rpx;
    white-space: nowrap;
  }

  .tab {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    height: 58rpx;
    margin-right: 14rpx;
    padding: 0 24rpx;
    border-radius: 8rpx;
    color: #69736e;
    background: #fff;
    font-size: 25rpx;
  }

  .tab.active {
    color: #fff;
    background: #f06a3a;
  }

  .state,
  .order-card {
    border-radius: 8rpx;
    background: #fff;
    box-shadow: 0 8rpx 26rpx rgba(31, 41, 37, .06);
  }

  .state {
    margin-top: 26rpx;
    padding: 56rpx 24rpx;
    color: #7b8580;
    text-align: center;
    font-size: 26rpx;
  }

  .list {
    margin-top: 24rpx;
  }

  .order-card {
    padding: 24rpx;
    margin-bottom: 18rpx;
  }

  .order-no {
    color: #1d2b26;
    font-size: 30rpx;
    font-weight: 700;
  }

  .status {
    padding: 6rpx 12rpx;
    border-radius: 6rpx;
    color: #2f7d58;
    background: #eaf7f0;
    font-size: 23rpx;
  }

  .line {
    margin-top: 14rpx;
    color: #66716b;
    font-size: 25rpx;
    line-height: 1.5;
  }

  .footer {
    margin-top: 18rpx;
    padding-top: 18rpx;
    border-top: 1rpx solid #f0f2ef;
    color: #f06a3a;
    font-size: 26rpx;
  }
</style>
