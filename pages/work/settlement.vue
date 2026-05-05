<template>
  <view class="page">
    <view class="head-card">
      <view>
        <text class="sub">月度结算</text>
        <view class="title">{{ displayMonth }}</view>
      </view>
      <picker mode="date" fields="month" :value="queryMonth" @change="onMonthChange">
        <view class="month-btn">选择月份</view>
      </picker>
    </view>

    <view v-if="loading" class="state-card">
      <view class="empty-title">结算数据加载中...</view>
      <view class="empty-text">正在获取 {{ queryMonth }} 的结算汇总和订单明细</view>
    </view>

    <block v-else>
      <view v-if="hasSettlement" class="amount-card">
        <text class="amount-label">应发金额</text>
        <view class="amount">{{ money(payableAmount) }}</view>
        <text class="amount-tip">平台线下打款，实际以后台结算确认为准</text>
      </view>

      <view v-else class="state-card">
        <view class="empty-title">暂无结算记录</view>
        <view class="empty-text">当前月份还没有生成月度结算，可切换月份或等待后台生成后查看。</view>
      </view>

      <view v-if="hasSettlement" class="grid">
        <view class="metric">
          <text class="num">{{ completeCount }}</text>
          <text class="name">完成单数</text>
        </view>
        <view class="metric">
          <text class="num">{{ money(commissionAmount) }}</text>
          <text class="name">单子提成</text>
        </view>
        <view class="metric">
          <text class="num">{{ violationCount }}</text>
          <text class="name">违约次数</text>
        </view>
        <view class="metric">
          <text class="num">{{ money(deductionAmount) }}</text>
          <text class="name">违约扣款</text>
        </view>
        <view class="metric">
          <text class="num">{{ money(baseSalary) }}</text>
          <text class="name">个人底薪</text>
        </view>
        <view class="metric">
          <text class="num">{{ money(finalCommission) }}</text>
          <text class="name">扣款后提成</text>
        </view>
      </view>

      <view class="section-card">
        <view class="section-head">
          <view>
            <view class="section-title">订单明细</view>
            <view class="section-subtitle">仅展示本月可计入结算的完成订单</view>
          </view>
          <text class="count-pill">{{ settlementOrders.length }} 单</text>
        </view>

        <view v-if="settlementOrders.length" class="detail-list">
          <view v-for="order in settlementOrders" :key="order.id" class="detail-row">
            <view class="detail-top">
              <text class="order-no">{{ order.no }}</text>
              <text :class="['status', order.tone]">{{ order.statusText }}</text>
            </view>
            <view class="detail-line">
              <text class="detail-label">时间</text>
              <text class="detail-value">{{ order.time || '服务时间待返回' }}</text>
            </view>
            <view class="detail-line">
              <text class="detail-label">菜品</text>
              <text class="detail-value">{{ order.dishes }}</text>
            </view>
            <view class="detail-money">
              <text>订单金额 {{ money(order.amount) }}</text>
              <text>结算提成 {{ money(order.commission) }}</text>
            </view>
          </view>
        </view>

        <view v-else class="inner-empty">
          <view class="empty-title">暂无订单明细</view>
          <view class="empty-text">该月份暂无已完成且可计入结算的订单。</view>
        </view>
      </view>

      <view class="section-card">
        <view class="section-title">扣款说明</view>
        <view class="deduct-summary">
          <view class="deduct-item">
            <text class="deduct-label">违约次数</text>
            <text class="deduct-value">{{ violationCount }} 次</text>
          </view>
          <view class="deduct-item">
            <text class="deduct-label">扣款金额</text>
            <text class="deduct-value danger">{{ money(deductionAmount) }}</text>
          </view>
        </view>
        <view v-for="(line, index) in deductionLines" :key="index" class="rule-line">{{ line }}</view>
      </view>

      <view class="rule-card">
        <view class="rule-title">结算口径</view>
        <view class="rule-line">已完成且未退款订单计入结算；退款中、已退款、退款失败和做饭人员原因取消订单不计入。</view>
        <view class="rule-line">当月违约达到 5 次且单子提成不少于 200 元时，从当月提成扣除 200 元，不扣个人底薪。</view>
      </view>
    </block>
  </view>
</template>

<script>
  import { getChefSettlementMonth, getChefOrderList } from '@/api/cooking/chef'

  const SETTLED_STATUSES = ['FINISHED', 'COMPLETED', 'DONE']

  export default {
    data() {
      return {
        loading: false,
        queryMonth: '',
        settlement: {},
        orders: []
      }
    },
    computed: {
      displayMonth() {
        return this.value('settlementMonth', 'month') || this.queryMonth
      },
      hasSettlement() {
        return Object.keys(this.settlement || {}).some(key => {
          const value = this.settlement[key]
          return value !== undefined && value !== null && value !== ''
        })
      },
      payableAmount() {
        return this.value('payableAmount', 'salaryAmount', 'totalPayable', 'monthIncome', 'totalAmount')
      },
      completeCount() {
        return this.value('completeCount', 'completedOrderCount', 'finishedCount', 'orderCount')
      },
      commissionAmount() {
        return this.value('orderCommission', 'chefCommission', 'commissionAmount', 'totalCommission')
      },
      violationCount() {
        return this.value('violationCount', 'breachCount', 'defaultCount')
      },
      deductionAmount() {
        return this.value('violationDeduction', 'breachDeduction', 'defaultDeduction', 'penaltyAmount')
      },
      baseSalary() {
        return this.value('baseSalary', 'personalBaseSalary')
      },
      finalCommission() {
        return this.value('afterDeductionCommission', 'netCommission', 'finalCommission')
      },
      settlementOrders() {
        const details = this.pickSettlementDetails()
        const source = details.length ? details : this.orders.filter(item => this.isSettlementOrder(item))
        return source.map((item, index) => this.normalizeOrder(item, index)).filter(item => item.id)
      },
      deductionLines() {
        const count = Number(this.violationCount || 0)
        const commission = Number(this.commissionAmount || 0)
        const deduction = Number(this.deductionAmount || 0)
        if (deduction > 0) {
          return [
            `本月违约 ${count} 次，已触发违约扣款。`,
            `扣款从当月单子提成中扣除，个人底薪不参与扣减。`
          ]
        }
        if (count <= 0) {
          return ['本月暂无违约记录，不产生违约扣款。']
        }
        if (count < 5) {
          return [`本月违约 ${count} 次，未达到 5 次扣款条件。`]
        }
        if (commission < 200) {
          return [`本月违约 ${count} 次，但单子提成不足 200 元，不触发 200 元扣款。`]
        }
        return ['后台暂未返回扣款金额，实际以后台结算确认结果为准。']
      }
    },
    onLoad() {
      this.queryMonth = this.currentMonth()
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
      onMonthChange(e) {
        this.queryMonth = e.detail.value
        this.load()
      },
      load() {
        this.loading = true
        return Promise.all([this.loadSettlement(), this.loadOrders()]).finally(() => {
          this.loading = false
        })
      },
      loadSettlement() {
        return getChefSettlementMonth({
          settlementMonth: this.queryMonth,
          month: this.queryMonth,
          pageNum: 1,
          pageSize: 1
        }).then(res => {
          this.settlement = this.normalizeSettlement(res)
        }).catch(() => {
          this.settlement = {}
        })
      },
      loadOrders() {
        return getChefOrderList({
          pageNum: 1,
          pageSize: 200
        }).then(res => {
          this.orders = this.toList(res).filter(item => this.isMonthOrder(item))
        }).catch(() => {
          this.orders = []
        })
      },
      normalizeSettlement(res) {
        const data = this.unwrap(res)
        const rows = this.toList(res)
        if (rows.length) return rows[0]
        if (data && Array.isArray(data.rows)) return {}
        if (data && Array.isArray(data.records)) return {}
        if (data && Array.isArray(data.list)) return {}
        if (data && typeof data === 'object' && !Array.isArray(data)) {
          return data
        }
        return {}
      },
      unwrap(res) {
        if (!res) return null
        if (res.data !== undefined) return res.data
        return res
      },
      toList(res) {
        const data = this.unwrap(res)
        if (Array.isArray(data)) return data
        if (Array.isArray(res && res.rows)) return res.rows
        if (data && Array.isArray(data.rows)) return data.rows
        if (data && Array.isArray(data.records)) return data.records
        if (data && Array.isArray(data.list)) return data.list
        return []
      },
      pickSettlementDetails() {
        const details = this.settlement.orderDetails || this.settlement.orderList || this.settlement.orders || this.settlement.details
        if (Array.isArray(details)) return details
        return []
      },
      value() {
        for (let i = 0; i < arguments.length; i += 1) {
          const key = arguments[i]
          if (this.settlement[key] !== undefined && this.settlement[key] !== null && this.settlement[key] !== '') {
            return this.settlement[key]
          }
        }
        return 0
      },
      isSettlementOrder(order) {
        const status = this.normalizeStatus(order.status || order.orderStatus)
        return SETTLED_STATUSES.indexOf(status) > -1
      },
      isMonthOrder(order) {
        const no = String(order.orderNo || order.orderCode || '')
        const monthKey = this.queryMonth.replace('-', '')
        if (no.indexOf('OD' + monthKey) === 0) return true
        return this.formatMonth(this.getOrderTime(order) || order.createTime || order.payTime) === this.queryMonth
      },
      normalizeOrder(order, index) {
        const id = order.id || order.orderId || order.orderNo || order.orderCode || ('order-' + index)
        return {
          id,
          no: order.orderNo || order.orderCode || ('订单 #' + id),
          time: this.getOrderTime(order) || order.createTime || '',
          dishes: this.getDishes(order),
          amount: order.payAmount || order.totalAmount || order.quoteAmount || order.orderAmount || 0,
          commission: order.chefCommission || order.orderCommission || order.commissionAmount || order.settlementAmount || 0,
          statusText: order.statusName || order.orderStatusName || '已完成',
          tone: this.isSettlementOrder(order) ? 'ok' : 'muted'
        }
      },
      normalizeStatus(status) {
        return String(status || '').trim().toUpperCase()
      },
      getOrderTime(order) {
        return order.serviceStartTime || order.appointmentStartTime || order.appointmentTime || order.bookingTime || order.startTime || order.reserveTime || ''
      },
      getDishes(order) {
        const dishes = order.dishes || order.dishList || order.dishNames || order.dishSnapshot || order.menu
        if (Array.isArray(dishes)) {
          return dishes.map(item => typeof item === 'string' ? item : item.name || item.dishName).filter(Boolean).join('、') || '未填写'
        }
        return dishes || order.dishRemark || '未填写'
      },
      formatMonth(value) {
        if (!value) return ''
        const date = value instanceof Date ? value : new Date(String(value).replace(/-/g, '/'))
        if (!date || isNaN(date.getTime())) return ''
        const month = date.getMonth() + 1
        return date.getFullYear() + '-' + (month < 10 ? '0' + month : month)
      },
      money(value) {
        const number = Number(value || 0)
        return '¥' + (isNaN(number) ? 0 : number).toFixed(2)
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
    padding: 24rpx;
    box-sizing: border-box;
    color: #17211b;
  }

  .head-card,
  .amount-card,
  .metric,
  .rule-card,
  .section-card,
  .state-card {
    border-radius: 14rpx;
    box-shadow: 0 8rpx 28rpx rgba(20, 35, 27, 0.06);
  }

  .head-card {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 28rpx;
    background: #6a3a2b;
    color: #fff;
  }

  .sub {
    color: rgba(255, 255, 255, 0.68);
    font-size: 24rpx;
  }

  .title {
    margin-top: 10rpx;
    font-size: 36rpx;
    font-weight: 700;
  }

  .month-btn {
    padding: 12rpx 18rpx;
    border-radius: 999rpx;
    background: rgba(255, 255, 255, 0.14);
    color: #fff;
    font-size: 24rpx;
  }

  .amount-card,
  .state-card,
  .section-card,
  .rule-card {
    margin-top: 22rpx;
    padding: 28rpx;
    background: #fff;
  }

  .amount-label {
    color: #607066;
    font-size: 25rpx;
  }

  .amount {
    margin-top: 12rpx;
    color: #c1732d;
    font-size: 54rpx;
    font-weight: 800;
  }

  .amount-tip,
  .section-subtitle,
  .empty-text {
    color: #87938b;
    font-size: 24rpx;
    line-height: 1.55;
  }

  .amount-tip {
    display: block;
    margin-top: 10rpx;
  }

  .grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 18rpx;
    margin-top: 22rpx;
  }

  .metric {
    padding: 26rpx;
    background: #fff;
  }

  .num {
    display: block;
    font-size: 34rpx;
    font-weight: 700;
  }

  .name {
    display: block;
    margin-top: 8rpx;
    color: #607066;
    font-size: 24rpx;
  }

  .section-head,
  .detail-top,
  .detail-line,
  .detail-money,
  .deduct-summary,
  .deduct-item {
    display: flex;
    align-items: center;
  }

  .section-head,
  .detail-top,
  .detail-money,
  .deduct-summary {
    justify-content: space-between;
  }

  .section-title,
  .rule-title,
  .empty-title {
    font-size: 30rpx;
    font-weight: 700;
  }

  .section-subtitle {
    margin-top: 8rpx;
  }

  .count-pill {
    flex-shrink: 0;
    padding: 8rpx 14rpx;
    border-radius: 999rpx;
    color: #2f8f55;
    background: #e6f5ec;
    font-size: 22rpx;
  }

  .detail-list {
    margin-top: 18rpx;
  }

  .detail-row {
    padding: 20rpx 0;
    border-top: 1rpx solid #edf0ee;
  }

  .order-no {
    max-width: 440rpx;
    color: #17211b;
    font-size: 28rpx;
    font-weight: 700;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .status {
    flex-shrink: 0;
    padding: 6rpx 12rpx;
    border-radius: 999rpx;
    font-size: 22rpx;
  }

  .status.ok {
    color: #176c35;
    background: #dcf4e1;
  }

  .status.muted {
    color: #4e5a52;
    background: #edf0ee;
  }

  .detail-line {
    margin-top: 14rpx;
  }

  .detail-label {
    flex: 0 0 72rpx;
    color: #87938b;
    font-size: 24rpx;
  }

  .detail-value {
    flex: 1;
    min-width: 0;
    color: #324239;
    font-size: 25rpx;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .detail-money {
    margin-top: 16rpx;
    color: #c1732d;
    font-size: 24rpx;
  }

  .inner-empty {
    margin-top: 22rpx;
    padding: 34rpx 20rpx;
    border-radius: 8rpx;
    background: #fffaf6;
    text-align: center;
  }

  .empty-text {
    margin-top: 10rpx;
  }

  .deduct-summary {
    gap: 18rpx;
    margin-top: 18rpx;
  }

  .deduct-item {
    flex: 1;
    min-height: 76rpx;
    justify-content: space-between;
    padding: 0 18rpx;
    border-radius: 8rpx;
    background: #fff7f0;
  }

  .deduct-label {
    color: #607066;
    font-size: 24rpx;
  }

  .deduct-value {
    color: #17211b;
    font-size: 26rpx;
    font-weight: 700;
  }

  .deduct-value.danger {
    color: #a82819;
  }

  .rule-line {
    margin-top: 14rpx;
    color: #526158;
    font-size: 26rpx;
    line-height: 1.55;
  }
</style>
