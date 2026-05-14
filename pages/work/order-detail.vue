<template>
  <view class="page">
    <view class="head-card">
      <view>
        <text class="sub">订单详情</text>
        <view class="title">{{ order.orderNo || order.orderCode || ('订单 #' + orderId) }}</view>
      </view>
      <text :class="['chip', statusTone]">{{ statusText }}</text>
    </view>

    <view class="info-card">
      <view class="row">
        <text class="label">上门时间</text>
        <text class="value">{{ getTime(order) || '-' }}</text>
      </view>
      <view class="row">
        <text class="label">服务地址</text>
        <text class="value">{{ getAddress(order) }}</text>
      </view>
      <view v-if="order.userPhone || order.contactPhone" class="row">
        <text class="label">用户电话</text>
        <text class="value">{{ order.userPhone || order.contactPhone }}</text>
      </view>
      <view class="row">
        <text class="label">菜品需求</text>
        <text class="value">{{ getDishes(order) }}</text>
      </view>
      <view class="row">
        <text class="label">用户备注</text>
        <text class="value">{{ order.remark || order.userRemark || order.tasteRemark || '-' }}</text>
      </view>
      <view class="row">
        <text class="label">当前报价</text>
        <text class="value money">{{ formatMoney(order.quoteAmount || order.serviceTotalPrice || order.totalAmount) }}</text>
      </view>
      <view v-if="order.quoteRemark || order.quoteDescription" class="row">
        <text class="label">报价说明</text>
        <text class="value">{{ order.quoteRemark || order.quoteDescription }}</text>
      </view>
      <view v-if="order.objectionReason || order.disputeReason" class="row">
        <text class="label">异议原因</text>
        <text class="value">{{ order.objectionReason || order.disputeReason }}</text>
      </view>
    </view>

    <view v-if="canQuote || canHandleDispute" class="action-card">
      <view class="section-title">{{ canHandleDispute ? '处理报价异议' : '接单报价' }}</view>
      <view class="field">
        <text class="field-label">服务总价</text>
        <input class="input" v-model="quoteForm.serviceTotalPrice" type="digit" placeholder="最低 50 元" />
      </view>
      <view class="field">
        <text class="field-label">报价说明</text>
        <textarea class="textarea" v-model.trim="quoteForm.quoteRemark" placeholder="说明服务内容、菜品复杂度或调整原因" />
      </view>
      <view class="quote-actions">
        <button class="primary-btn quote-actions__primary" :loading="submitting" @click="submitQuote">{{ canHandleDispute ? '提交修改报价' : '同意并报价' }}</button>
        <button v-if="canReject" class="plain-danger quote-actions__reject" :loading="submitting" @click="openRejectReservationPopup">拒绝预约</button>
      </view>
    </view>

    <view v-if="canComplete || canChefCancel" class="action-card">
      <button v-if="canComplete" class="primary-btn" :loading="submitting" @click="submitServiceAction">{{ serviceActionText }}</button>
      <button v-if="canChefCancel" class="danger-btn cancel-block__button" :loading="submitting" @click="openRejectServicePopup">拒绝服务</button>
    </view>

    <uni-popup ref="rejectServicePopup" type="dialog" :is-mask-click="!submitting" @change="onRejectServicePopupChange">
      <view class="reject-service-dialog">
        <view class="reject-service-dialog__title">拒绝服务</view>
        <view class="reject-service-dialog__desc">确定拒绝服务吗?</view>
        <textarea
          v-model.trim="rejectServiceReasonInput"
          class="reject-service-dialog__input"
          placeholder="请填写拒绝原因"
          placeholder-class="reject-service-dialog__placeholder"
          maxlength="500"
        />
        <view class="reject-service-dialog__actions">
          <button class="reject-service-dialog__btn reject-service-dialog__btn--ghost" :disabled="submitting" @click="closeRejectServicePopup">取消</button>
          <button class="reject-service-dialog__btn reject-service-dialog__btn--danger" :loading="submitting" @click="submitRejectService">确定</button>
        </view>
      </view>
    </uni-popup>

    <uni-popup ref="rejectReservationPopup" type="dialog" :is-mask-click="!submitting" @change="onRejectReservationPopupChange">
      <view class="reject-reservation-dialog">
        <view class="reject-reservation-dialog__title">拒绝预约</view>
        <view class="reject-reservation-dialog__desc">确定拒绝该预约吗?</view>
        <textarea
          v-model.trim="rejectReservationReasonInput"
          class="reject-reservation-dialog__input"
          placeholder="请填写拒绝原因"
          placeholder-class="reject-reservation-dialog__placeholder"
          maxlength="500"
        />
        <view class="reject-reservation-dialog__actions">
          <button class="reject-reservation-dialog__btn reject-reservation-dialog__btn--ghost" :disabled="submitting" @click="closeRejectReservationPopup">否</button>
          <button class="reject-reservation-dialog__btn reject-reservation-dialog__btn--danger" :loading="submitting" @click="submitRejectReservation">是</button>
        </view>
      </view>
    </uni-popup>
  </view>
</template>

<script>
  import {
    getCookingOrder,
    rejectChefOrder,
    quoteChefOrder,
    startServiceChefOrder,
    serviceCompleteChefOrder,
    cancelChefOrder
  } from '@/api/cooking/chef'
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

  export default {
    data() {
      return {
        orderId: '',
        order: {},
        submitting: false,
        rejectReservationReasonInput: '',
        rejectServiceReasonInput: '',
        quoteForm: {
          serviceTotalPrice: '',
          quoteRemark: ''
        }
      }
    },
    computed: {
      status() {
        return this.orderStatusOf(this.order)
      },
      group() {
        return chefOrderStatusGroup(this.status) || 'other'
      },
      statusText() {
        return orderStatus.displayOrderStatusText(this.order.statusName || this.order.orderStatusName, CHEF_STATUS_TEXT_MAP) ||
          orderStatus.displayOrderStatusText(this.status, CHEF_STATUS_TEXT_MAP) ||
          '处理中'
      },
      statusTone() {
        if (this.group === 'response' || this.group === 'dispute') return 'warn'
        if (this.group === 'service') return 'ok'
        if (this.group === 'done') return 'muted'
        return 'blue'
      },
      canQuote() {
        return this.group === 'response'
      },
      canReject() {
        return this.group === 'response'
      },
      canHandleDispute() {
        return this.group === 'dispute'
      },
      canComplete() {
        return this.group === 'service'
      },
      hasServiceStarted() {
        return !!this.getServiceStartedTime(this.order) || this.order.serviceStarted === true || this.order.serviceStarted === 1 || this.order.serviceStarted === '1'
      },
      serviceActionText() {
        return this.hasServiceStarted ? '服务完成' : '开始服务'
      },
      canChefCancel() {
        return this.group === 'service' && !this.hasServiceStarted
      }
    },
    onLoad(options) {
      this.orderId = options.id
      this.load()
    },
    methods: {
      load() {
        if (!this.orderId) return
        getCookingOrder(this.orderId).then(res => {
          this.order = res && res.data !== undefined ? res.data : res
          this.quoteForm.serviceTotalPrice = this.order.quoteAmount || this.order.serviceTotalPrice || ''
          this.quoteForm.quoteRemark = this.order.quoteRemark || this.order.quoteDescription || ''
        })
      },
      orderStatusOf(order) {
        if (!order) return ''
        if (order.status !== undefined && order.status !== null && order.status !== '') return order.status
        return order.orderStatus
      },
      getTime(order) {
        return order.serviceStartTime || order.appointmentTime || order.bookingTime || order.startTime || order.reserveTime || ''
      },
      getServiceStartedTime(order) {
        if (!order) return ''
        return order.serviceStartedTime || order.serviceStartedAt || ''
      },
      parseOrderTime(value) {
        if (!value) return null
        if (value instanceof Date) return value
        const normalized = typeof value === 'string' ? value.replace(/-/g, '/') : value
        const time = new Date(normalized)
        return Number.isNaN(time.getTime()) ? null : time
      },
      getStartServiceConfirmContent(now = new Date()) {
        const serviceStartTime = this.parseOrderTime(this.order && this.order.serviceStartTime)
        const currentTime = this.parseOrderTime(now)
        if (serviceStartTime && currentTime && currentTime.getTime() < serviceStartTime.getTime()) {
          return '当前未到预约时间，确认提前开始服务吗?'
        }
        return '确认开始服务吗?'
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
      orderPayload(extra) {
        return Object.assign({
          id: this.orderId,
          orderId: this.orderId
        }, extra || {})
      },
      submitQuote() {
        const price = Number(this.quoteForm.serviceTotalPrice)
        if (!price || price < 50) {
          this.$modal.showToast('报价最低 50 元')
          return
        }
        this.submitting = true
        quoteChefOrder(this.orderPayload({
          serviceTotalPrice: price,
          quoteAmount: price,
          quoteRemark: this.quoteForm.quoteRemark,
          quoteDescription: this.quoteForm.quoteRemark
        })).then(() => {
          this.$modal.msgSuccess(this.canHandleDispute ? '异议报价已提交' : '报价已提交')
          uni.navigateBack()
        }).finally(() => {
          this.submitting = false
        })
      },
      submitReject() {
        return this.submitRejectReservation()
      },
      openRejectReservationPopup() {
        if (this.submitting || !this.$refs.rejectReservationPopup) return
        this.$refs.rejectReservationPopup.open()
      },
      onRejectReservationPopupChange(event) {
        if (event && event.show) return
        this.rejectReservationReasonInput = ''
      },
      closeRejectReservationPopup() {
        if (this.submitting || !this.$refs.rejectReservationPopup) return
        this.$refs.rejectReservationPopup.close()
      },
      submitRejectReservation() {
        if (!this.rejectReservationReasonInput) {
          this.$modal.showToast('请填写拒绝原因')
          return
        }
        this.submitting = true
        rejectChefOrder(this.orderPayload({
          reason: this.rejectReservationReasonInput,
          rejectReason: this.rejectReservationReasonInput
        })).then(() => {
          this.$modal.msgSuccess('已拒绝预约')
          if (this.$refs.rejectReservationPopup) {
            this.$refs.rejectReservationPopup.close()
          }
          uni.navigateBack()
        }).finally(() => {
          this.submitting = false
        })
      },
      submitServiceAction() {
        if (this.hasServiceStarted) {
          this.submitComplete()
          return
        }
        this.submitStartService()
      },
      submitStartService() {
        uni.showModal({
          content: this.getStartServiceConfirmContent(),
          cancelText: '取消',
          confirmText: '确认',
          success: res => {
            if (!res.confirm) return
            this.submitting = true
            startServiceChefOrder(this.orderPayload()).then(() => {
              this.$modal.msgSuccess('已开始服务')
              uni.navigateBack()
            }).finally(() => {
              this.submitting = false
            })
          }
        })
      },
      submitComplete() {
        if (!this.hasServiceStarted) {
          this.$modal.showToast('请先开始服务')
          return
        }
        uni.showModal({
          content: '服务确认完成了吗?',
          cancelText: '取消',
          confirmText: '确认完成',
          success: res => {
            if (!res.confirm) return
            this.submitting = true
            serviceCompleteChefOrder(this.orderPayload()).then(() => {
              this.$modal.msgSuccess('已提交服务完成')
              uni.navigateBack()
            }).finally(() => {
              this.submitting = false
            })
          }
        })
      },
      openRejectServicePopup() {
        if (this.submitting || !this.$refs.rejectServicePopup) return
        this.$refs.rejectServicePopup.open()
      },
      onRejectServicePopupChange(event) {
        if (event && event.show) return
        this.rejectServiceReasonInput = ''
      },
      closeRejectServicePopup() {
        if (this.submitting || !this.$refs.rejectServicePopup) return
        this.$refs.rejectServicePopup.close()
      },
      submitRejectService() {
        if (!this.rejectServiceReasonInput) {
          this.$modal.showToast('请填写拒绝原因')
          return
        }
        this.submitting = true
        cancelChefOrder(this.orderPayload({
          reason: this.rejectServiceReasonInput,
          cancelReason: this.rejectServiceReasonInput
        })).then(() => {
          this.$modal.msgSuccess('拒绝服务已提交')
          if (this.$refs.rejectServicePopup) {
            this.$refs.rejectServicePopup.close()
          }
            uni.navigateBack()
        }).finally(() => {
          this.submitting = false
        })
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
  .info-card,
  .action-card {
    border-radius: 14rpx;
    background: #fff;
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
    max-width: 470rpx;
    margin-top: 10rpx;
    font-size: 34rpx;
    font-weight: 700;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .chip {
    flex: 0 0 auto;
    padding: 8rpx 16rpx;
    border-radius: 999rpx;
    font-size: 24rpx;
  }

  .chip.warn {
    background: #fff0cb;
    color: #875800;
  }

  .chip.ok {
    background: #dcf4e1;
    color: #176c35;
  }

  .chip.blue {
    background: #e0f0f8;
    color: #316a93;
  }

  .chip.muted {
    background: #edf0ee;
    color: #4e5a52;
  }

  .info-card,
  .action-card {
    margin-top: 22rpx;
    padding: 26rpx;
  }

  .row {
    display: flex;
    padding: 16rpx 0;
    border-bottom: 1rpx solid #edf0ee;
  }

  .row:last-child {
    border-bottom: none;
  }

  .label {
    flex: 0 0 150rpx;
    color: #87938b;
    font-size: 25rpx;
  }

  .value {
    flex: 1;
    min-width: 0;
    color: #26352d;
    font-size: 26rpx;
    line-height: 1.5;
  }

  .money {
    color: #c1732d;
    font-weight: 700;
  }

  .section-title {
    margin-bottom: 18rpx;
    font-size: 30rpx;
    font-weight: 700;
  }

  .section-title--center {
    text-align: center;
  }

  .field {
    margin-bottom: 20rpx;
  }

  .field-label {
    display: block;
    margin-bottom: 10rpx;
    color: #415047;
    font-size: 26rpx;
    font-weight: 600;
  }

  .input,
  .textarea {
    width: 100%;
    min-height: 76rpx;
    padding: 18rpx 20rpx;
    border: 1rpx solid #e2e8e4;
    border-radius: 8rpx;
    background: #fbfcfb;
    box-sizing: border-box;
    color: #18211b;
    font-size: 28rpx;
  }

  .textarea {
    height: 150rpx;
    line-height: 1.55;
  }

  .primary-btn,
  .plain-danger,
  .danger-btn {
    height: 80rpx;
    line-height: 80rpx;
    border-radius: 8rpx;
    font-size: 28rpx;
  }

  .primary-btn {
    background: #2f8f55;
    color: #fff;
  }

  .quote-actions {
    display: flex;
    flex-direction: column;
    gap: 16rpx;
    margin-top: 18rpx;
  }

  .quote-actions__primary,
  .quote-actions__reject {
    width: 100%;
    margin-top: 0;
  }

  .plain-danger {
    margin-top: 18rpx;
    background: #fff4f2;
    color: #a82819;
  }

  .danger-btn {
    margin-top: 18rpx;
    background: #c64034;
    color: #fff;
  }

  .cancel-block {
    margin-top: 22rpx;
    padding-top: 22rpx;
    border-top: 1rpx solid #edf0ee;
  }

  .cancel-block__button {
    width: 100%;
  }

  .reject-service-dialog {
    width: 620rpx;
    padding: 36rpx 32rpx 28rpx;
    border-radius: 16rpx;
    background: #fff;
    box-sizing: border-box;
  }

  .reject-reservation-dialog {
    width: 620rpx;
    padding: 36rpx 32rpx 28rpx;
    border-radius: 16rpx;
    background: #fff;
    box-sizing: border-box;
  }

  .reject-service-dialog__title {
    color: #17211b;
    font-size: 36rpx;
    font-weight: 700;
    text-align: center;
  }

  .reject-reservation-dialog__title {
    color: #17211b;
    font-size: 36rpx;
    font-weight: 700;
    text-align: center;
  }

  .reject-service-dialog__desc {
    margin-top: 18rpx;
    color: #66756b;
    font-size: 28rpx;
    line-height: 1.6;
    text-align: center;
  }

  .reject-reservation-dialog__desc {
    margin-top: 18rpx;
    color: #66756b;
    font-size: 28rpx;
    line-height: 1.6;
    text-align: center;
  }

  .reject-service-dialog__input {
    width: 100%;
    min-height: 180rpx;
    margin-top: 22rpx;
    padding: 18rpx 20rpx;
    border: 1rpx solid #e2e8e4;
    border-radius: 8rpx;
    box-sizing: border-box;
    color: #17211b;
    font-size: 24rpx;
    line-height: 1.6;
    background: #fbfcfb;
  }

  .reject-reservation-dialog__input {
    width: 100%;
    min-height: 180rpx;
    margin-top: 22rpx;
    padding: 18rpx 20rpx;
    border: 1rpx solid #e2e8e4;
    border-radius: 8rpx;
    box-sizing: border-box;
    color: #17211b;
    font-size: 24rpx;
    line-height: 1.6;
    background: #fbfcfb;
  }

  .reject-service-dialog__placeholder {
    color: #98a29b;
    font-size: 22rpx;
  }

  .reject-reservation-dialog__placeholder {
    color: #98a29b;
    font-size: 22rpx;
  }

  .reject-service-dialog__actions {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 18rpx;
    margin-top: 26rpx;
  }

  .reject-reservation-dialog__actions {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 18rpx;
    margin-top: 26rpx;
  }

  .reject-service-dialog__btn {
    height: 76rpx;
    line-height: 76rpx;
    border-radius: 8rpx;
    font-size: 28rpx;
  }

  .reject-reservation-dialog__btn {
    height: 76rpx;
    line-height: 76rpx;
    border-radius: 8rpx;
    font-size: 28rpx;
  }

  .reject-service-dialog__btn--ghost {
    background: #fff;
    color: #5f6d64;
    border: 1rpx solid #d7dfda;
  }

  .reject-reservation-dialog__btn--ghost {
    background: #fff;
    color: #5f6d64;
    border: 1rpx solid #d7dfda;
  }

  .reject-service-dialog__btn--danger {
    background: #a82819;
    color: #fff;
  }

  .reject-reservation-dialog__btn--danger {
    background: #a82819;
    color: #fff;
  }
</style>
