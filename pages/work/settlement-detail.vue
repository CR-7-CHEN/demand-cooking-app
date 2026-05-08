<template>
  <view class="page">
    <view class="head-card">
      <view>
        <text class="sub">结算详情</text>
        <view class="title">{{ displayMonth || '结算详情' }}</view>
      </view>
      <text class="chip">{{ settlementStatusText }}</text>
    </view>

    <view v-if="loading" class="state-card">
      <view class="empty-title">结算明细加载中...</view>
      <view class="empty-text">{{ loadingHint }}</view>
    </view>

    <block v-else>
      <view v-if="hasSettlement" class="amount-card">
        <text class="amount-label">应发金额</text>
        <view class="amount">{{ money(payableAmount) }}</view>
        <text class="amount-tip">包含底薪、提成和违约扣款，确认无异议后进入待发放。</text>
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

      <view v-else class="state-card">
        <view class="empty-title">暂无结算记录</view>
        <view class="empty-text">当前月份还没有可展示的结算数据。</view>
      </view>

      <view v-if="hasSettlement" class="section-card action-card">
        <view class="section-head">
          <view>
            <view class="section-title">结算操作</view>
            <view class="section-subtitle">先确认无异议；如果金额或订单范围不对，可以申请复核。</view>
          </view>
        </view>

        <view v-if="canConfirmSettlement || canRequestReview" class="action-row">
          <button v-if="canConfirmSettlement" class="primary-btn" :loading="submitting" :disabled="submitting" @click="confirmSettlement">确认无异议</button>
          <button v-if="canRequestReview" class="ghost-btn" :disabled="submitting" @click="toggleReviewForm">{{ showReviewForm ? '收起复核' : '申请复核' }}</button>
        </view>

        <view v-if="showReviewForm" class="review-form">
          <view class="reason-row">
            <text
              v-for="item in reviewReasonOptions"
              :key="item.value"
              :class="['reason-chip', { active: reviewForm.reviewReasonType === item.value }]"
              @click="selectReviewReason(item.value)"
            >
              {{ item.label }}
            </text>
          </view>
          <textarea
            class="textarea"
            v-model.trim="reviewForm.reviewRemark"
            maxlength="200"
            placeholder="补充说明哪里需要复核，方便平台快速处理"
          />
          <button class="primary-btn" :loading="submitting" :disabled="submitting" @click="submitSettlementReview">提交复核</button>
        </view>

        <view v-else-if="isReviewingSettlement" class="review-status">
          <view class="status-title">复核中</view>
          <view class="status-line">复核原因：{{ reviewReasonLabel || '待补充' }}</view>
          <view class="status-line">复核说明：{{ reviewRemarkText }}</view>
        </view>

        <view v-else-if="settlement.reviewReply || settlement.reviewResult || settlement.reviewAction" class="review-status">
          <view class="status-title">复核结果</view>
          <view class="status-line">处理方式：{{ reviewResultText }}</view>
          <view class="status-line">处理说明：{{ settlement.reviewReply || '平台已处理，请确认最新结算结果。' }}</view>
        </view>
      </view>

      <view class="section-card">
        <view class="section-head">
          <view>
            <view class="section-title">订单明细</view>
            <view class="section-subtitle">优先使用结算详情里的明细，没有时再按结算单 ID 或月份补拉订单。</view>
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
          <view class="empty-text">该月份还没有进入这张结算单的完成订单。</view>
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
            <text class="deduct-label">违约扣款</text>
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
  import { getChefSettlementDetail, getChefOrderList, submitChefSettlementReview, confirmChefSettlement } from '@/api/cooking/chef'

  const SETTLED_STATUSES = ['FINISHED', 'COMPLETED', 'DONE']
  const STATUS_TEXT_MAP = {
    GENERATED: '待确认',
    REVIEWING: '复核中',
    CONFIRMED: '待发放',
    PAID: '已发放'
  }
  const REVIEW_REASON_OPTIONS = [
    { label: '提成金额有疑问', value: 'AMOUNT_DIFF' },
    { label: '订单范围不一致', value: 'ORDER_DIFF' },
    { label: '扣款需要核对', value: 'DEDUCTION_DIFF' },
    { label: '其他原因', value: 'OTHER' }
  ]
  const REVIEW_REASON_LABEL_MAP = REVIEW_REASON_OPTIONS.reduce((result, item) => {
    result[item.value] = item.label
    return result
  }, {})
  const REVIEW_RESULT_LABEL_MAP = {
    KEEP: '保持当前结算',
    REGENERATE: '按最新订单重新计算'
  }

  export default {
    data() {
      return {
        loading: false,
        submitting: false,
        settlementId: '',
        queryMonth: '',
        settlement: {},
        orders: [],
        showReviewForm: false,
        reviewReasonOptions: REVIEW_REASON_OPTIONS,
        reviewForm: {
          reviewReasonType: REVIEW_REASON_OPTIONS[0].value,
          reviewRemark: ''
        }
      }
    },
    computed: {
      loadingHint() {
        const monthText = this.displayMonth || this.queryMonth || '当前月份'
        return `正在获取 ${monthText} 的结算详情和订单明细`
      },
      displayMonth() {
        return this.formatMonth(this.value('settlementMonth', 'month') || this.queryMonth)
      },
      hasSettlement() {
        return Object.keys(this.settlement || {}).some(key => {
          const value = this.settlement[key]
          return value !== undefined && value !== null && value !== ''
        })
      },
      settlementStatusKey() {
        return this.normalizeStatus(this.value('settlementStatus', 'status', 'statusCode', 'settleStatus')) || 'GENERATED'
      },
      settlementStatusText() {
        const direct = this.value('settlementStatusName', 'statusName', 'statusText')
        return direct || STATUS_TEXT_MAP[this.settlementStatusKey] || '待确认'
      },
      canConfirmSettlement() {
        return this.settlementStatusKey === 'GENERATED'
      },
      canRequestReview() {
        return this.settlementStatusKey === 'GENERATED'
      },
      isReviewingSettlement() {
        return this.settlementStatusKey === 'REVIEWING'
      },
      reviewReasonLabel() {
        const reason = this.value('reviewReasonType', 'reviewReason')
        return REVIEW_REASON_LABEL_MAP[reason] || reason || ''
      },
      reviewRemarkText() {
        return this.value('reviewRemark') || '已提交复核申请'
      },
      reviewResultText() {
        const result = this.value('reviewResult', 'reviewAction')
        return REVIEW_RESULT_LABEL_MAP[result] || result || '待平台处理'
      },
      payableAmount() {
        return this.value('payableAmount', 'salaryAmount', 'totalPayable', 'monthIncome', 'totalAmount')
      },
      completeCount() {
        return this.value('completeCount', 'completedOrderCount', 'finishedCount', 'completedCount', 'orderCount')
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
        const source = details.length ? details : this.orders.filter(item => this.orderBelongsToSettlement(item))
        return source.map((item, index) => this.normalizeOrder(item, index)).filter(item => item.id)
      },
      deductionLines() {
        const count = Number(this.violationCount || 0)
        const commission = Number(this.commissionAmount || 0)
        const deduction = Number(this.deductionAmount || 0)
        if (deduction > 0) {
          return [
            `本月违约 ${count} 次，已触发违约扣款。`,
            '扣款仅从当月提成中扣除，不会再扣个人底薪。'
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
        return ['后台暂未返回扣款金额，实际以平台结算确认为准。']
      }
    },
    onLoad(options) {
      this.settlementId = options.id || options.settlementId || ''
      this.queryMonth = this.formatMonth(options.month || options.settlementMonth || '')
      this.load()
    },
    onPullDownRefresh() {
      this.load().finally(() => {
        if (typeof uni !== 'undefined' && uni.stopPullDownRefresh) {
          uni.stopPullDownRefresh()
        }
      })
    },
    methods: {
      load() {
        this.loading = true
        return this.loadSettlement().then(() => this.loadOrders()).finally(() => {
          this.loading = false
        })
      },
      loadSettlement() {
        if (!this.settlementId) return Promise.resolve()
        return getChefSettlementDetail(this.settlementId).then(res => {
          this.settlement = this.normalizeSettlement(res)
          const settlementMonth = this.value('settlementMonth', 'month')
          if (settlementMonth) {
            this.queryMonth = this.formatMonth(settlementMonth)
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
      toggleReviewForm() {
        this.showReviewForm = !this.showReviewForm
      },
      selectReviewReason(value) {
        this.reviewForm.reviewReasonType = value
      },
      submitSettlementReview() {
        const reasonType = this.reviewForm.reviewReasonType || this.reviewForm.reasonType
        const reviewRemark = String(this.reviewForm.reviewRemark || this.reviewForm.remark || '').trim()
        const useLegacyPayload = this.reviewForm.reasonType !== undefined || this.reviewForm.remark !== undefined
        if (!this.settlementId) {
          this.notifyError('缺少结算单 ID')
          return Promise.resolve()
        }
        if (!reasonType) {
          this.notifyError('请选择复核原因')
          return Promise.resolve()
        }
        if (!reviewRemark) {
          this.notifyError('请填写复核说明')
          return Promise.resolve()
        }
        this.submitting = true
        const payload = useLegacyPayload
          ? {
              settlementId: this.settlementId,
              reasonType,
              remark: reviewRemark
            }
          : {
              settlementId: this.settlementId,
              reviewReasonType: reasonType,
              reviewRemark
            }
        return submitChefSettlementReview(payload).then(() => {
          this.notifySuccess('复核申请已提交')
          this.showReviewForm = false
          return this.load()
        }).finally(() => {
          this.submitting = false
        })
      },
      confirmSettlement() {
        if (!this.settlementId) {
          this.notifyError('缺少结算单 ID')
          return Promise.resolve()
        }
        return this.confirmAction('确认当前结算无异议？确认后将等待平台发放。').then(() => {
          this.submitting = true
          return confirmChefSettlement({
            settlementId: this.settlementId
          }).then(() => {
            this.notifySuccess('已确认无异议')
            return this.load()
          }).finally(() => {
            this.submitting = false
          })
        }).catch(() => {})
      },
      confirmAction(content) {
        if (this.$modal && this.$modal.confirm) {
          return this.$modal.confirm(content)
        }
        if (typeof uni !== 'undefined' && uni.showModal) {
          return new Promise((resolve, reject) => {
            uni.showModal({
              title: '系统提示',
              content,
              success: res => {
                if (res.confirm) {
                  resolve(true)
                  return
                }
                reject(new Error('cancel'))
              },
              fail: reject
            })
          })
        }
        return Promise.resolve(true)
      },
      notifySuccess(message) {
        if (this.$modal && this.$modal.msgSuccess) {
          this.$modal.msgSuccess(message)
          return
        }
        if (typeof uni !== 'undefined' && uni.showToast) {
          uni.showToast({ title: message, icon: 'success' })
        }
      },
      notifyError(message) {
        if (this.$modal && this.$modal.showToast) {
          this.$modal.showToast(message)
          return
        }
        if (typeof uni !== 'undefined' && uni.showToast) {
          uni.showToast({ title: message, icon: 'none' })
        }
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
      getSettlementScope() {
        return {
          settlementId: this.settlementId || this.value('id', 'settlementId', 'recordId', 'monthRecordId'),
          month: this.displayMonth || this.value('settlementMonth', 'month')
        }
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
      orderBelongsToSettlement(order) {
        if (!this.isSettlementOrder(order)) return false

        const scope = this.getSettlementScope()
        const orderSettlementId = this.firstOrderValue(order, ['settlementId', 'monthSettlementId', 'recordId'])
        const orderMonth = this.getOrderMonth(order)

        if (scope.settlementId && orderSettlementId) {
          return String(orderSettlementId) === String(scope.settlementId)
        }
        if (scope.month && orderMonth) {
          return orderMonth === scope.month
        }
        return false
      },
      firstOrderValue(order, keys) {
        for (let i = 0; i < keys.length; i += 1) {
          const value = order && order[keys[i]]
          if (value !== undefined && value !== null && value !== '') {
            return value
          }
        }
        return ''
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
      getOrderMonth(order) {
        const rawMonth = this.firstOrderValue(order, [
          'settlementMonth',
          'month',
          'settleMonth',
          'statMonth',
          'billingMonth'
        ])
        if (rawMonth) {
          return this.formatMonth(rawMonth)
        }
        return this.formatMonth(this.getOrderTime(order))
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
        const text = String(value).trim()
        if (/^\d{6}$/.test(text)) return `${text.slice(0, 4)}-${text.slice(4, 6)}`
        if (/^\d{4}-\d{2}$/.test(text)) return text
        if (/^\d{4}\/\d{2}$/.test(text)) return text.replace('/', '-')

        const normalized = text.replace(/\./g, '-').replace(/\//g, '-')
        const date = new Date(normalized.replace(/-/g, '/'))
        if (Number.isNaN(date.getTime())) return text.slice(0, 7).replace('/', '-')

        const month = date.getMonth() + 1
        return `${date.getFullYear()}-${month < 10 ? '0' + month : month}`
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
  .deduct-item,
  .action-row,
  .reason-row {
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
  .empty-title,
  .status-title {
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

  .action-row {
    gap: 20rpx;
    margin-top: 20rpx;
  }

  .primary-btn,
  .ghost-btn {
    flex: 1;
    height: 84rpx;
    line-height: 84rpx;
    border-radius: 42rpx;
    font-size: 28rpx;
  }

  .primary-btn {
    color: #fff;
    background: linear-gradient(135deg, #f08a48, #d65e2d);
  }

  .ghost-btn {
    color: #b85d2b;
    background: #fff3ea;
  }

  .review-form,
  .review-status {
    margin-top: 22rpx;
    padding: 22rpx;
    border-radius: 12rpx;
    background: #fff7f0;
  }

  .reason-row {
    flex-wrap: wrap;
    gap: 16rpx;
  }

  .reason-chip {
    padding: 10rpx 18rpx;
    border-radius: 999rpx;
    color: #7d4e23;
    background: #ffe5d6;
    font-size: 24rpx;
  }

  .reason-chip.active {
    color: #fff;
    background: #d96a35;
  }

  .textarea {
    width: 100%;
    min-height: 180rpx;
    margin-top: 18rpx;
    padding: 20rpx;
    box-sizing: border-box;
    border-radius: 12rpx;
    background: #fff;
    font-size: 26rpx;
    line-height: 1.6;
  }

  .status-line {
    margin-top: 12rpx;
    color: #526158;
    font-size: 25rpx;
    line-height: 1.6;
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
