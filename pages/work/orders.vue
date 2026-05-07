<template>
  <view class="page">
    <view class="tabs">
      <view
        v-for="tab in tabs"
        :key="tab.value"
        :class="['tab', activeTab === tab.value ? 'active' : '']"
        @click="activeTab = tab.value"
      >
        {{ tab.label }}
      </view>
    </view>

    <view v-if="filteredOrders.length" class="order-list">
      <view v-for="order in filteredOrders" :key="order.id || order.orderId" class="order-card" @click="goDetail(order)">
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
  import { getChefOrderList } from '@/api/cooking/chef'

  export default {
    data() {
      return {
        activeTab: 'all',
        orders: [],
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
          label: '待确认',
          value: 'confirm'
        }, {
          label: '已完成',
          value: 'done'
        }, {
          label: '异议',
          value: 'dispute'
        }]
      }
    },
    computed: {
      filteredOrders() {
        if (this.activeTab === 'all') return this.orders
        return this.orders.filter(order => this.tabOf(order) === this.activeTab)
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
        return getChefOrderList({ pageNum: 1, pageSize: 100 }).then(res => {
          this.orders = this.toList(res)
        }).catch(() => {
          this.orders = []
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
      normalize(value) {
        return String(value || '').trim().toUpperCase()
      },
      tabOf(order) {
        const status = this.normalize(order.status || order.orderStatus)
        if (['WAITING_RESPONSE', 'WAIT_CHEF_RESPONSE', 'PENDING_RESPONSE', 'WAIT_RESPONSE'].indexOf(status) > -1) return 'response'
        if (['QUOTE_DISPUTE', 'QUOTE_OBJECTION', 'DISPUTE'].indexOf(status) > -1) return 'dispute'
        if (['WAIT_SERVICE', 'PENDING_SERVICE'].indexOf(status) > -1) return 'service'
        if (['WAIT_USER_CONFIRM', 'PENDING_CONFIRM', 'WAIT_CONFIRM'].indexOf(status) > -1) return 'confirm'
        if (['FINISHED', 'COMPLETED', 'DONE'].indexOf(status) > -1) return 'done'
        return 'all'
      },
      statusText(order) {
        const map = {
          response: '待接单报价',
          dispute: '报价异议',
          service: '待服务',
          confirm: '待确认',
          done: '已完成'
        }
        return order.statusName || order.orderStatusName || map[this.tabOf(order)] || '处理中'
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
