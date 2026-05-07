<template>
  <view class="page">
    <view class="head-card">
      <view>
        <text class="sub">{{ subText }}</text>
        <view class="title">{{ displayMonth }}</view>
      </view>
      <text class="chip">{{ settlementStatusText }}</text>
    </view>

    <view v-if="loading" class="state-card">
      <view class="empty-title">{{ loadingTitle }}</view>
      <view class="empty-text">{{ loadingHint }}</view>
    </view>

    <block v-else>
      <view v-if="hasSettlement" class="amount-card">
        <text class="amount-label">{{ payableAmountLabel }}</text>
        <view class="amount">{{ money(payableAmount) }}</view>
        <text class="amount-tip">{{ payableAmountTip }}</text>
      </view>

      <view v-if="hasSettlement" class="grid">
        <view class="metric">
          <text class="num">{{ completeCount }}</text>
          <text class="name">{{ completeCountLabel }}</text>
        </view>
        <view class="metric">
          <text class="num">{{ money(commissionAmount) }}</text>
          <text class="name">{{ commissionLabel }}</text>
        </view>
        <view class="metric">
          <text class="num">{{ violationCount }}</text>
          <text class="name">{{ violationCountLabel }}</text>
        </view>
        <view class="metric">
          <text class="num">{{ money(deductionAmount) }}</text>
          <text class="name">{{ deductionAmountLabel }}</text>
        </view>
        <view class="metric">
          <text class="num">{{ money(baseSalary) }}</text>
          <text class="name">{{ baseSalaryLabel }}</text>
        </view>
        <view class="metric">
          <text class="num">{{ money(finalCommission) }}</text>
          <text class="name">{{ finalCommissionLabel }}</text>
        </view>
      </view>

      <view v-else class="state-card">
        <view class="empty-title">{{ emptySettlementTitle }}</view>
        <view class="empty-text">{{ emptySettlementHint }}</view>
      </view>

      <view class="section-card">
        <view class="section-head">
          <view>
            <view class="section-title">{{ orderSectionText }}</view>
            <view class="section-subtitle">{{ orderSectionHint }}</view>
          </view>
          <text class="count-pill">{{ settlementOrders.length }} {{ orderCountUnit }}</text>
        </view>

        <view v-if="settlementOrders.length" class="detail-list">
          <view v-for="order in settlementOrders" :key="order.id" class="detail-row">
            <view class="detail-top">
              <text class="order-no">{{ order.no }}</text>
              <text :class="['status', order.tone]">{{ order.statusText }}</text>
            </view>
            <view class="detail-line">
              <text class="detail-label">{{ timeLabel }}</text>
              <text class="detail-value">{{ order.time || timeEmptyText }}</text>
            </view>
            <view class="detail-line">
              <text class="detail-label">{{ dishesLabel }}</text>
              <text class="detail-value">{{ order.dishes }}</text>
            </view>
            <view class="detail-money">
              <text>{{ orderAmountLabel }} {{ money(order.amount) }}</text>
              <text>{{ orderCommissionLabel }} {{ money(order.commission) }}</text>
            </view>
          </view>
        </view>

        <view v-else class="inner-empty">
          <view class="empty-title">{{ emptyOrdersTitle }}</view>
          <view class="empty-text">{{ emptyOrdersHint }}</view>
        </view>
      </view>

      <view class="section-card">
        <view class="section-title">{{ deductionSectionText }}</view>
        <view class="deduct-summary">
          <view class="deduct-item">
            <text class="deduct-label">{{ violationCountLabel }}</text>
            <text class="deduct-value">{{ violationCount }} {{ countUnit }}</text>
          </view>
          <view class="deduct-item">
            <text class="deduct-label">{{ deductionAmountLabel }}</text>
            <text class="deduct-value danger">{{ money(deductionAmount) }}</text>
          </view>
        </view>
        <view v-for="(line, index) in deductionLines" :key="index" class="rule-line">{{ line }}</view>
      </view>

      <view class="rule-card">
        <view class="rule-title">{{ ruleSectionText }}</view>
        <view class="rule-line">{{ ruleLineOne }}</view>
        <view class="rule-line">{{ ruleLineTwo }}</view>
      </view>
    </block>
  </view>
</template>

<script>
  import { getChefSettlementDetail, getChefOrderList } from '@/api/cooking/chef'

  const SETTLED_STATUSES = ['FINISHED', 'COMPLETED', 'DONE']

  export default {
    data() {
      return {
        loading: false,
        settlementId: '',
        queryMonth: '',
        settlement: {},
        orders: []
      }
    },
    computed: {
      subText() {
        return '月度结算详情'
      },
      loadingTitle() {
        return '\u7ed3\u7b97\u660e\u7ec6\u52a0\u8f7d\u4e2d...'
      },
      loadingHint() {
        const monthText = this.displayMonth || this.queryMonth || '\u672a\u77e5\u6708\u4efd'
        return `\u6b63\u5728\u83b7\u53d6 ${monthText} \u7684\u7ed3\u7b97\u8be6\u60c5\u548c\u8ba2\u5355\u660e\u7ec6`
      },
      emptySettlementTitle() {
        return '\u6682\u65e0\u7ed3\u7b97\u8bb0\u5f55'
      },
      emptySettlementHint() {
        return '\u5f53\u524d\u65e0\u6cd5\u627e\u5230\u5bf9\u5e94\u7684\u6708\u5ea6\u7ed3\u7b97\u6570\u636e\uff0c\u53ef\u5207\u6362\u6708\u4efd\u6216\u68c0\u67e5 settlementId'
      },
      orderSectionText() {
        return '订单明细'
      },
      orderSectionHint() {
        return '\u4f18\u5148\u4f7f\u7528\u7ed3\u7b97\u8be6\u60c5\uff0c\u5e76\u6839\u636e settlementId \u6216\u6708\u4efd\u518d\u62c9\u53d6\u8ba2\u5355\u5217\u8868'
      },
      orderCountUnit() {
        return '\u5355'
      },
      timeLabel() {
        return '\u65f6\u95f4'
      },
      timeEmptyText() {
        return '\u670d\u52a1\u65f6\u95f4\u5f85\u8fd4\u56de'
      },
      dishesLabel() {
        return '\u83dc\u54c1'
      },
      orderAmountLabel() {
        return '\u8ba2\u5355\u91d1\u989d'
      },
      orderCommissionLabel() {
        return '\u7ed3\u7b97\u63d0\u6210'
      },
      deductionSectionText() {
        return '扣款说明'
      },
      ruleSectionText() {
        return '\u7ed3\u7b97\u53e3\u5f84'
      },
      ruleLineOne() {
        return '\u5df2\u5b8c\u6210\u4e14\u672a\u9000\u6b3e\u8ba2\u5355\u8ba1\u5165\u7ed3\u7b97\uff1b\u9000\u6b3e\u4e2d\u3001\u5df2\u9000\u6b3e\u3001\u9000\u6b3e\u5931\u8d25\u548c\u505a\u996d\u4eba\u5458\u539f\u56e0\u53d6\u6d88\u8ba2\u5355\u4e0d\u8ba1\u5165\u3002'
      },
      ruleLineTwo() {
        return '\u5f53\u6708\u8fdd\u7ea6\u8fbe\u5230 5 \u6b21\u4e14\u5355\u5b50\u63d0\u6210\u4e0d\u5c11\u4e8e 200 \u5143\u65f6\uff0c\u4ece\u5f53\u6708\u63d0\u6210\u6263\u9664 200 \u5143\uff0c\u4e0d\u6263\u4e2a\u4eba\u5e95\u85aa\u3002'
      },
      payableAmountLabel() {
        return '\u5e94\u53d1\u91d1\u989d'
      },
      payableAmountTip() {
        return '\u5305\u542b\u6708\u5e95\u85aa\u3001\u63d0\u6210\u548c\u6263\u6b3e\u540e\u7ed3\u7b97\u7ed3\u6784\uff0c\u6700\u7ec8\u4ee5\u540e\u53f0\u786e\u8ba4\u4e3a\u51c6'
      },
      completeCountLabel() {
        return '\u5b8c\u6210\u5355\u6570'
      },
      commissionLabel() {
        return '\u5355\u5b50\u63d0\u6210'
      },
      violationCountLabel() {
        return '\u8fdd\u7ea6\u6b21\u6570'
      },
      deductionAmountLabel() {
        return '\u8fdd\u7ea6\u6263\u6b3e'
      },
      baseSalaryLabel() {
        return '\u4e2a\u4eba\u5e95\u85aa'
      },
      finalCommissionLabel() {
        return '\u6263\u6b3e\u540e\u63d0\u6210'
      },
      countUnit() {
        return '\u6b21'
      },
      emptyOrdersTitle() {
        return '\u6682\u65e0\u8ba2\u5355\u660e\u7ec6'
      },
      emptyOrdersHint() {
        return '\u8be5\u6708\u4efd\u6682\u65e0\u5df2\u5b8c\u6210\u4e14\u53ef\u8ba1\u5165\u7ed3\u7b97\u7684\u8ba2\u5355\u3002'
      },
      displayMonth() {
        return this.value('settlementMonth', 'month') || this.queryMonth
      },
      hasSettlement() {
        return Object.keys(this.settlement || {}).some(key => {
          const value = this.settlement[key]
          return value !== undefined && value !== null && value !== ''
        })
      },
      settlementStatusText() {
        return this.value('settlementStatusName', 'statusName', 'settlementStatus') || (this.queryMonth || '\u6708\u5ea6\u7ed3\u7b97')
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
            `\u672c\u6708\u8fdd\u7ea6 ${count} \u6b21\uff0c\u5df2\u89e6\u53d1\u8fdd\u7ea6\u6263\u6b3e\u3002`,
            '\u6263\u6b3e\u4ece\u5f53\u6708\u5355\u5b50\u63d0\u6210\u4e2d\u6263\u9664\uff0c\u4e0d\u4f1a\u518d\u6263\u4e2a\u4eba\u5e95\u85aa\u3002'
          ]
        }
        if (count <= 0) {
          return ['\u672c\u6708\u6682\u65e0\u8fdd\u7ea6\u8bb0\u5f55\uff0c\u4e0d\u4ea7\u751f\u8fdd\u7ea6\u6263\u6b3e\u3002']
        }
        if (count < 5) {
          return [`\u672c\u6708\u8fdd\u7ea6 ${count} \u6b21\uff0c\u672a\u8fbe\u5230 5 \u6b21\u6263\u6b3e\u6761\u4ef6\u3002`]
        }
        if (commission < 200) {
          return [`\u672c\u6708\u8fdd\u7ea6 ${count} \u6b21\uff0c\u4f46\u5355\u5b50\u63d0\u6210\u4e0d\u8db3 200 \u5143\uff0c\u4e0d\u89e6\u53d1 200 \u5143\u6263\u6b3e\u3002`]
        }
        return ['\u540e\u53f0\u6682\u672a\u8fd4\u56de\u6263\u6b3e\u91d1\u989d\uff0c\u5b9e\u9645\u4ee5\u540e\u53f0\u7ed3\u7b97\u786e\u8ba4\u7ed3\u679c\u4e3a\u51c6\u3002']
      }
    },
    onLoad(options) {
      this.settlementId = options.id || options.settlementId || ''
      this.queryMonth = options.month || options.settlementMonth || ''
      this.load()
    },
    onPullDownRefresh() {
      this.load().finally(() => {
        uni.stopPullDownRefresh()
      })
    },
    methods: {
      load() {
        this.loading = true
        return Promise.all([this.loadSettlement(), this.loadOrders()]).finally(() => {
          this.loading = false
        })
      },
      loadSettlement() {
        if (!this.settlementId) return Promise.resolve()
        return getChefSettlementDetail(this.settlementId).then(res => {
          this.settlement = this.normalizeSettlement(res)
          if (!this.queryMonth) {
            this.queryMonth = this.value('settlementMonth', 'month') || this.queryMonth
          }
        }).catch(() => {
          this.settlement = {}
        })
      },
      loadOrders() {
        return getChefOrderList({
          pageNum: 1,
          pageSize: 200,
          settlementId: this.settlementId,
          month: this.queryMonth
        }).then(res => {
          this.orders = this.toList(res)
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
      normalizeOrder(order, index) {
        const id = order.id || order.orderId || order.orderNo || order.orderCode || ('order-' + index)
        return {
          id,
          no: order.orderNo || order.orderCode || ('\u8ba2\u5355 #' + id),
          time: this.getOrderTime(order) || order.createTime || '',
          dishes: this.getDishes(order),
          amount: order.payAmount || order.totalAmount || order.quoteAmount || order.orderAmount || 0,
          commission: order.chefCommission || order.orderCommission || order.commissionAmount || order.settlementAmount || 0,
          statusText: order.statusName || order.orderStatusName || '\u5df2\u5b8c\u6210',
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
          return dishes.map(item => typeof item === 'string' ? item : item.name || item.dishName).filter(Boolean).join('\u3001') || '\u672a\u586b\u5199'
        }
        return dishes || order.dishRemark || '\u672a\u586b\u5199'
      },
      money(value) {
        const number = Number(value || 0)
        return '楼' + (isNaN(number) ? 0 : number).toFixed(2)
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

  .chip {
    flex-shrink: 0;
    padding: 8rpx 14rpx;
    border-radius: 999rpx;
    background: rgba(255, 255, 255, 0.14);
    color: #fff;
    font-size: 22rpx;
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
    flex: 0 0 96rpx;
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
