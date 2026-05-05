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
      <button class="primary-btn" :loading="submitting" @click="submitQuote">{{ canHandleDispute ? '提交修改报价' : '同意并报价' }}</button>
    </view>

    <view v-if="canReject" class="action-card">
      <view class="section-title">拒绝预约</view>
      <textarea class="textarea" v-model.trim="rejectReason" placeholder="可填写拒绝原因，便于平台和用户理解" />
      <button class="plain-danger" :loading="submitting" @click="submitReject">拒绝预约</button>
    </view>

    <view v-if="canComplete || canChefCancel" class="action-card">
      <view class="section-title">待服务处理</view>
      <button v-if="canComplete" class="primary-btn" :loading="submitting" @click="submitComplete">确认服务完成</button>
      <view v-if="canChefCancel" class="cancel-block">
        <textarea class="textarea" v-model.trim="cancelReason" placeholder="做饭人员原因取消必须填写原因" />
        <button class="plain-danger" :loading="submitting" @click="submitCancel">做饭人员原因取消</button>
      </view>
    </view>
  </view>
</template>

<script>
  import {
    getCookingOrder,
    rejectChefOrder,
    quoteChefOrder,
    serviceCompleteChefOrder,
    cancelChefOrder
  } from '@/api/cooking/chef'

  export default {
    data() {
      return {
        orderId: '',
        order: {},
        submitting: false,
        rejectReason: '',
        cancelReason: '',
        quoteForm: {
          serviceTotalPrice: '',
          quoteRemark: ''
        }
      }
    },
    computed: {
      status() {
        return this.normalize(this.order.status || this.order.orderStatus)
      },
      group() {
        if (['WAIT_CHEF_RESPONSE', 'PENDING_RESPONSE', 'WAIT_RESPONSE'].indexOf(this.status) > -1) return 'response'
        if (['QUOTE_DISPUTE', 'QUOTE_OBJECTION', 'DISPUTE'].indexOf(this.status) > -1) return 'dispute'
        if (['WAIT_SERVICE', 'PENDING_SERVICE'].indexOf(this.status) > -1) return 'service'
        if (['WAIT_USER_CONFIRM', 'PENDING_CONFIRM', 'WAIT_CONFIRM'].indexOf(this.status) > -1) return 'confirm'
        if (['FINISHED', 'COMPLETED', 'DONE'].indexOf(this.status) > -1) return 'done'
        return 'other'
      },
      statusText() {
        const map = {
          response: '待响应',
          dispute: '报价异议',
          service: '待服务',
          confirm: '待确认',
          done: '已完成',
          other: '处理中'
        }
        return this.order.statusName || this.order.orderStatusName || map[this.group]
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
      canChefCancel() {
        return this.group === 'service'
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
      normalize(value) {
        return String(value || '').trim().toUpperCase()
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
          this.load()
        }).finally(() => {
          this.submitting = false
        })
      },
      submitReject() {
        this.$modal.confirm('确认拒绝该预约吗？拒绝后会释放时间锁定。').then(() => {
          this.submitting = true
          rejectChefOrder(this.orderPayload({ reason: this.rejectReason, rejectReason: this.rejectReason })).then(() => {
            this.$modal.msgSuccess('已拒绝预约')
            this.load()
          }).finally(() => {
            this.submitting = false
          })
        })
      },
      submitComplete() {
        this.$modal.confirm('确认服务已完成？提交后订单将进入待用户确认。').then(() => {
          this.submitting = true
          serviceCompleteChefOrder(this.orderPayload()).then(() => {
            this.$modal.msgSuccess('已提交服务完成')
            this.load()
          }).finally(() => {
            this.submitting = false
          })
        })
      },
      submitCancel() {
        if (!this.cancelReason) {
          this.$modal.showToast('请填写取消原因')
          return
        }
        this.$modal.confirm('确认因做饭人员原因取消？该操作会触发退款并计入违约次数。').then(() => {
          this.submitting = true
          cancelChefOrder(this.orderPayload({ reason: this.cancelReason, cancelReason: this.cancelReason })).then(() => {
            this.$modal.msgSuccess('取消申请已提交')
            this.load()
          }).finally(() => {
            this.submitting = false
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
  .plain-danger {
    height: 80rpx;
    line-height: 80rpx;
    border-radius: 8rpx;
    font-size: 28rpx;
  }

  .primary-btn {
    background: #2f8f55;
    color: #fff;
  }

  .plain-danger {
    margin-top: 18rpx;
    background: #fff4f2;
    color: #a82819;
  }

  .cancel-block {
    margin-top: 22rpx;
    padding-top: 22rpx;
    border-top: 1rpx solid #edf0ee;
  }
</style>
