<template>
  <view class="page">
    <view class="tabs">
      <view
        v-for="tab in tabs"
        :key="tab.value"
        :class="['tab', activeTab === tab.value ? 'active' : '']"
        @click="activeTab = tab.value"
      >
        <view class="tab-content">
          <text class="tab-text">{{ tab.label }}</text>
          <text v-if="showTabCount(tab)" class="tab-badge">{{ formatTabCount(tabCountOf(tab.value)) }}</text>
        </view>
      </view>
    </view>

    <view v-if="filteredOrders.length" class="order-list">
      <view v-for="order in filteredOrders" :key="order.orderId" class="order-card" @click="goDetail(order)">
        <view class="card-top">
          <view>
            <view class="order-no">{{ order.orderNo || order.orderCode || ('订单 #' + (order.id || order.orderId)) }}</view>
            <view class="order-time">{{ getTime(order) || '待确认上门时间' }}</view>
          </view>
          <text :class="['status', statusTone(order)]">{{ statusText(order) }}</text>
        </view>

        <view class="info-line">
          <text class="info-label">地址</text>
          <text class="info-value">{{ getAddress(order) }}</text>
        </view>
        <view class="info-line">
          <text class="info-label">菜品</text>
          <text class="info-value">{{ getDishes(order) }}</text>
        </view>
        <view class="bottom-row">
          <text class="price">{{ formatMoney(order.quoteAmount || order.totalAmount || order.payAmount) }}</text>
          <text class="link">查看处理 ›</text>
        </view>
      </view>
    </view>

    <view v-else class="empty">
      <view class="empty-title">暂无订单</view>
      <view class="empty-text">下拉刷新可获取最新预约和服务订单。</view>
    </view>
  </view>
</template>

<script>
  import { getChefOrderList, getChefWorkbench } from '@/api/cooking/chef'
  const orderStatus = require('@/utils/order-status')
  const CHEF_ORDER_GROUP_MAP = {
    [orderStatus.ORDER_STATUS.WAITING_RESPONSE]: 'response',
    [orderStatus.ORDER_STATUS.PRICE_OBJECTION]: 'dispute',
    [orderStatus.ORDER_STATUS.WAITING_SERVICE]: 'service',
    [orderStatus.ORDER_STATUS.WAITING_CONFIRM]: 'confirm',
    [orderStatus.ORDER_STATUS.COMPLETED]: 'done'
  }
  const CHEF_STATUS_TEXT_MAP = {
    [orderStatus.ORDER_STATUS.WAITING_RESPONSE]: '待接单报价',
    [orderStatus.ORDER_STATUS.PRICE_OBJECTION]: '报价异议',
    [orderStatus.ORDER_STATUS.WAITING_SERVICE]: '待服务',
    [orderStatus.ORDER_STATUS.WAITING_CONFIRM]: '用户待确认',
    [orderStatus.ORDER_STATUS.COMPLETED]: '已完成'
  }

  function chefOrderStatusGroup(status) {
    return CHEF_ORDER_GROUP_MAP[orderStatus.normalizeOrderStatus(status)] || ''
  }

  const TAB_COUNT_FIELDS = Object.freeze({
    response: ['waitingResponseCount', 'responseCount', 'response'],
    service: ['waitingServiceCount', 'serviceCount', 'service'],
    dispute: ['disputeCount', 'priceObjectionCount', 'dispute'],
    refund: ['refundedCount', 'refundCount', 'refund']
  })
  const WORK_ORDERS_SCOPE_STORAGE_KEY = 'work_orders_scope'

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
      total: readCountValue(stats, ['orderTotalCount', 'total']),
      response: readCountValue(stats, TAB_COUNT_FIELDS.response),
      service: readCountValue(stats, TAB_COUNT_FIELDS.service),
      dispute: readCountValue(stats, TAB_COUNT_FIELDS.dispute),
      refund: readCountValue(stats, TAB_COUNT_FIELDS.refund)
    }
  }

  export default {
    data() {
      return {
        activeTab: 'all',
        listScope: '',
        orders: [],
        orderStats: null,
        tabs: [{
          label: '全部',
          value: 'all'
        }, {
          label: '待接单报价',
          value: 'response'
        }, {
          label: '待服务',
          value: 'service'
        }, {
          label: '已完成',
          value: 'done'
        }, {
          label: '用户待确认',
          value: 'confirm'
        }, {
          label: '已退款',
          value: 'refund'
        }, {
          label: '异议',
          value: 'dispute'
        }]
      }
    },
    computed: {
      filteredOrders() {
        if (this.activeTab === 'all') return this.orders
        const tabOrders = this.orders.filter(order => this.tabOf(order) === this.activeTab)
        if (this.listScope === 'today_service' && this.activeTab === 'service') {
          return tabOrders.filter(order => this.isTodayServiceOrder(order))
        }
        return tabOrders
      }
    },
    onLoad(option) {
      if (option && option.tab && this.tabs.some(tab => tab.value === option.tab)) {
        this.activeTab = option.tab
      }
      const cachedScope = typeof uni.getStorageSync === 'function'
        ? uni.getStorageSync(WORK_ORDERS_SCOPE_STORAGE_KEY)
        : ''
      if (option && option.scope) {
        this.listScope = option.scope
      } else if (this.activeTab === 'service' && cachedScope) {
        this.listScope = cachedScope
      } else {
        this.listScope = ''
      }
      if (cachedScope && typeof uni.removeStorageSync === 'function') {
        uni.removeStorageSync(WORK_ORDERS_SCOPE_STORAGE_KEY)
      }
    },
    onShow() {
      this.load()
    },
    onPullDownRefresh() {
      this.load().finally(() => {
        uni.stopPullDownRefresh()
      })
    },
    methods: {
      load() {
        return Promise.allSettled([
          getChefOrderList({ pageNum: 1, pageSize: 100 }),
          getChefWorkbench()
        ]).then(([orderResult, workbenchResult]) => {
          this.orders = orderResult && orderResult.status === 'fulfilled' ? this.toList(orderResult.value) : []
          const workbench = workbenchResult && workbenchResult.status === 'fulfilled'
            ? (workbenchResult.value && workbenchResult.value.data !== undefined ? workbenchResult.value.data : workbenchResult.value)
            : null
          this.orderStats = toOrderStats(workbench)
        })
      },
      toList(res) {
        const data = res && res.data !== undefined ? res.data : res
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
      tabOf(order) {
        const status = this.orderStatusOf(order)
        if (orderStatus.isRefundOrderStatus(status)) return 'refund'
        return chefOrderStatusGroup(status) || 'all'
      },
      isTodayServiceOrder(order) {
        return this.isSameDay(this.getTime(order), new Date())
      },
      isSameDay(value, targetDate) {
        const date = this.parseDate(value)
        if (!date || Number.isNaN(date.getTime())) {
          return false
        }
        const current = targetDate instanceof Date ? targetDate : new Date()
        return date.getFullYear() === current.getFullYear() &&
          date.getMonth() === current.getMonth() &&
          date.getDate() === current.getDate()
      },
      parseDate(value) {
        if (!value) return null
        if (value instanceof Date) return value
        const normalized = String(value).replace(/-/g, '/')
        const date = new Date(normalized)
        return Number.isNaN(date.getTime()) ? null : date
      },
      tabCountOf(tabValue) {
        if (this.orderStats && this.orderStats[tabValue] !== null && this.orderStats[tabValue] !== undefined) {
          return this.orderStats[tabValue]
        }
        return this.orders.filter(order => this.tabOf(order) === tabValue).length
      },
      showTabCount(tab) {
        return !!tab && (tab.value === 'response' || tab.value === 'service' || tab.value === 'dispute')
      },
      formatTabCount(count) {
        const value = Number(count)
        if (!Number.isFinite(value) || value < 0) return '0'
        return value > 99 ? '99+' : String(value)
      },
      statusText(order) {
        return orderStatus.displayOrderStatusText(order.statusName || order.orderStatusName, CHEF_STATUS_TEXT_MAP) ||
          orderStatus.displayOrderStatusText(this.orderStatusOf(order), CHEF_STATUS_TEXT_MAP) ||
          '处理中'
      },
      statusTone(order) {
        const tab = this.tabOf(order)
        if (tab === 'response' || tab === 'dispute') return 'warn'
        if (tab === 'service') return 'ok'
        if (tab === 'done') return 'muted'
        return 'blue'
      },
      getTime(order) {
        return order.serviceStartTime || order.appointmentTime || order.bookingTime || order.startTime || order.reserveTime || ''
      },
      getAddress(order) {
        const address = order.address || order.addressSnapshot || {}
        if (typeof address === 'string') return address
        return order.fullAddress || order.serviceAddress || [address.area, address.detail, address.doorNo].filter(Boolean).join(' ') || '地址待返回'
      },
      getDishes(order) {
        const dishes = order.dishes || order.dishList || order.dishNames || order.menu
        if (Array.isArray(dishes)) {
          return dishes.map(item => typeof item === 'string' ? item : item.name || item.dishName).filter(Boolean).join('、') || '未填写'
        }
        return dishes || order.dishRemark || '未填写'
      },
      formatMoney(value) {
        if (value === null || value === undefined || value === '') return '未报价'
        return '¥' + Number(value).toFixed(2)
      },
      goDetail(order) {
        const id = order.id || order.orderId
        if (!id) {
          this.$modal.showToast('缺少订单 ID')
          return
        }
        this.$tab.navigateTo('/pages/work/order-detail?id=' + id)
      }
    }
  }
</script>

<style lang="scss" scoped>
  page {
    background: #fff7f0;
  }

  .page {
    min-height: 100vh;
    padding: 20rpx 24rpx 32rpx;
    box-sizing: border-box;
    color: #17211b;
  }

  .tabs {
    display: flex;
    flex-wrap: nowrap;
    overflow-x: auto;
    padding-bottom: 16rpx;
  }

  .tab {
    flex: 0 0 auto;
    margin-right: 14rpx;
    padding: 14rpx 22rpx;
    border-radius: 999rpx;
    background: #fff;
    color: #607066;
    font-size: 26rpx;
  }

  .tab-content {
    display: flex;
    align-items: center;
    gap: 10rpx;
  }

  .tab-text {
    white-space: nowrap;
  }

  .tab-badge {
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

  .tab.active {
    background: #6a3a2b;
    color: #fff;
    font-weight: 600;
  }

  .order-card,
  .empty {
    border-radius: 14rpx;
    background: #fff;
    box-shadow: 0 8rpx 28rpx rgba(20, 35, 27, 0.06);
  }

  .order-card {
    margin-bottom: 18rpx;
    padding: 26rpx;
  }

  .card-top,
  .bottom-row,
  .info-line {
    display: flex;
    align-items: center;
  }

  .card-top,
  .bottom-row {
    justify-content: space-between;
  }

  .order-no {
    max-width: 470rpx;
    font-size: 30rpx;
    font-weight: 700;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .order-time {
    margin-top: 8rpx;
    color: #607066;
    font-size: 24rpx;
  }

  .status {
    flex: 0 0 auto;
    padding: 8rpx 14rpx;
    border-radius: 999rpx;
    font-size: 22rpx;
  }

  .status.warn {
    background: #fff0cb;
    color: #875800;
  }

  .status.ok {
    background: #dcf4e1;
    color: #176c35;
  }

  .status.blue {
    background: #e0f0f8;
    color: #316a93;
  }

  .status.muted {
    background: #edf0ee;
    color: #4e5a52;
  }

  .info-line {
    margin-top: 18rpx;
  }

  .info-label {
    flex: 0 0 72rpx;
    color: #87938b;
    font-size: 24rpx;
  }

  .info-value {
    flex: 1;
    min-width: 0;
    color: #324239;
    font-size: 26rpx;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .bottom-row {
    margin-top: 22rpx;
    padding-top: 18rpx;
    border-top: 1rpx solid #edf0ee;
  }

  .price {
    color: #c1732d;
    font-size: 30rpx;
    font-weight: 700;
  }

  .link {
    color: #2f8f55;
    font-size: 26rpx;
  }

  .empty {
    margin-top: 24rpx;
    padding: 60rpx 30rpx;
    text-align: center;
  }

  .empty-title {
    font-size: 32rpx;
    font-weight: 700;
  }

  .empty-text {
    margin-top: 12rpx;
    color: #607066;
    font-size: 26rpx;
  }
</style>
