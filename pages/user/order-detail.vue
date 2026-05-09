<template>
  <view class="page">
    <view class="summary-card">
      <view class="order-no">{{ order.orderNo || '订单详情' }}</view>
      <view class="status">{{ statusText(order.status) }}</view>
      <view class="time">上门时间：{{ order.startTime || order.serviceStartTime || '-' }}</view>
      <view class="address">地址：{{ order.addressText || order.addressSnapshot || '-' }}</view>
    </view>

    <view class="card">
      <view class="card-title">预约信息</view>
      <view class="row"><text>做饭人员</text><text>{{ order.chefName || '-' }}</text></view>
      <view class="row"><text>菜品需求</text><text>{{ order.dishText || order.dishSnapshot || '-' }}</text></view>
      <view class="row"><text>备注</text><text>{{ order.remark || order.userRemark || '-' }}</text></view>
      <view class="row"><text>报价</text><text class="price">{{ order.quoteAmount ? '¥' + order.quoteAmount : '待报价' }}</text></view>
      <view v-if="order.quoteRemark" class="quote-remark">{{ order.quoteRemark }}</view>
    </view>

    <view class="card">
      <view class="card-title">当前可操作</view>
      <view class="actions">
        <button v-if="canPay" class="primary" @click="pay">模拟支付成功</button>
        <button v-if="canObjection" class="plain" @click="openObjection">发起报价异议</button>
        <button v-if="canCancel" class="plain danger" @click="cancel">取消订单</button>
        <button v-if="canConfirm" class="primary" @click="confirm">确认完成</button>
        <button v-if="canReview" class="plain" @click="openReview">评价</button>
        <button v-if="canComplaint" class="plain" @click="openComplaint">投诉</button>
      </view>
    </view>

    <view v-if="panel" class="card">
      <view class="card-title">{{ panelTitle }}</view>
      <textarea v-model="form.content" class="textarea" :placeholder="panelPlaceholder"></textarea>
      <view v-if="panel === 'review'" class="field">
        <text>评分</text>
        <slider :value="form.rating" min="1" max="5" step="1" activeColor="#f06a3a" @change="changeRating" />
        <text>{{ form.rating }}</text>
      </view>
      <button class="submit-btn" @click="submitPanel">提交</button>
    </view>
  </view>
</template>

<script>
  import {
    getOrder,
    submitObjection,
    payOrderSuccess,
    cancelOrder,
    confirmOrder,
    submitReview,
    submitComplaint
  } from '@/api/cooking/user'
  const orderStatus = require('@/utils/order-status')

  export default {
    data() {
      return {
        orderId: '',
        order: {},
        panel: '',
        form: {
          content: '',
          rating: 5
        }
      }
    },
    computed: {
      canPay() {
        return orderStatus.isOrderStatus(this.order.status, orderStatus.ORDER_STATUS.WAITING_PAY) ||
          orderStatus.isOrderStatus(this.order.status, orderStatus.ORDER_STATUS.PRICE_OBJECTION)
      },
      canObjection() {
        return orderStatus.isOrderStatus(this.order.status, orderStatus.ORDER_STATUS.WAITING_PAY) &&
          Number(this.order.objectionCount || 0) === 0
      },
      canCancel() {
        return orderStatus.isOrderStatus(this.order.status, orderStatus.ORDER_STATUS.WAITING_RESPONSE) ||
          orderStatus.isOrderStatus(this.order.status, orderStatus.ORDER_STATUS.WAITING_PAY) ||
          orderStatus.isOrderStatus(this.order.status, orderStatus.ORDER_STATUS.PRICE_OBJECTION) ||
          (orderStatus.isOrderStatus(this.order.status, orderStatus.ORDER_STATUS.WAITING_SERVICE) && !this.hasServiceStarted)
      },
      canConfirm() {
        return orderStatus.isOrderStatus(this.order.status, orderStatus.ORDER_STATUS.WAITING_CONFIRM)
      },
      hasServiceStarted() {
        return !!this.getServiceStartedTime(this.order) || this.order.serviceStarted === true || this.order.serviceStarted === 1 || this.order.serviceStarted === '1'
      },
      canReview() {
        return orderStatus.isCompletedOrder(this.order.status) && !this.order.reviewId
      },
      canComplaint() {
        return orderStatus.isCompletedOrder(this.order.status) && !this.order.complaintId
      },
      panelTitle() {
        const map = {
          objection: '报价异议',
          review: '订单评价',
          complaint: '订单投诉'
        }
        return map[this.panel] || ''
      },
      panelPlaceholder() {
        const map = {
          objection: '请说明你对报价的疑问',
          review: '说说这次上门做饭体验',
          complaint: '请说明投诉原因和事实'
        }
        return map[this.panel] || ''
      }
    },
    onLoad(option) {
      this.orderId = option.id || ''
      this.loadOrder()
    },
    methods: {
      loadOrder() {
        if (!this.orderId) return
        getOrder(this.orderId).then(res => {
          const data = res.data || res
          this.order = this.normalizeOrder(data)
        })
      },
      normalizeOrder(data) {
        const address = data.addressText || data.address || data.addressSnapshot
        return {
          ...data,
          id: data.id || data.orderId || this.orderId,
          startTime: data.startTime || data.appointmentStartTime || data.serviceStartTime,
          chefName: data.chefName || (data.chef && data.chef.name) || data.cookName,
          addressText: address,
          dishText: data.dishText || data.dishesText || data.customDishNames
        }
      },
      getServiceStartedTime(order) {
        if (!order) return ''
        return order.serviceStartedTime || order.serviceStartedAt || ''
      },
      statusText(status) {
        const normalized = orderStatus.normalizeOrderStatus(status)
        const rawStatus = String(status || '').trim().toUpperCase()
        const map = {
          [orderStatus.ORDER_STATUS.WAITING_RESPONSE]: '待做饭人员响应',
          [orderStatus.ORDER_STATUS.WAITING_PAY]: '待用户支付',
          [orderStatus.ORDER_STATUS.PRICE_OBJECTION]: '报价异议中',
          [orderStatus.ORDER_STATUS.WAITING_SERVICE]: '待服务',
          [orderStatus.ORDER_STATUS.WAITING_CONFIRM]: '待用户确认',
          [orderStatus.ORDER_STATUS.COMPLETED]: '已完成',
          WAITING_RESPONSE: '待做饭人员响应',
          REJECTED_CLOSED: '做饭人员已拒绝',
          RESPONSE_TIMEOUT_CLOSED: '响应超时关闭',
          WAITING_PAY: '待用户支付',
          PRICE_OBJECTION: '报价异议中',
          OBJECTION_TIMEOUT_CLOSED: '异议超时关闭',
          PAY_TIMEOUT_CLOSED: '支付超时关闭',
          WAITING_SERVICE: '待服务',
          WAITING_CONFIRM: '待用户确认',
          COMPLETED: '已完成',
          CANCELED: '已取消',
          REFUNDING: '退款中',
          REFUNDED: '已退款',
          REFUND_FAILED: '退款失败'
        }
        return map[normalized] || map[rawStatus] || normalized || status || '未知状态'
      },
      pay() {
        payOrderSuccess({ orderId: this.order.id }).then(() => {
          this.$modal.msgSuccess('已模拟支付成功')
          this.loadOrder()
        })
      },
      cancel() {
        uni.showModal({
          title: '取消订单',
          content: '服务开始后不可取消，确定继续吗？',
          success: res => {
            if (!res.confirm) return
            cancelOrder({ orderId: this.order.id, cancelReason: '用户主动取消' }).then(() => {
              this.$modal.msgSuccess('订单已取消')
              this.loadOrder()
            })
          }
        })
      },
      confirm() {
        confirmOrder({ orderId: this.order.id }).then(() => {
          this.$modal.msgSuccess('已确认完成')
          this.loadOrder()
        })
      },
      openObjection() {
        this.panel = 'objection'
        this.form.content = ''
      },
      openReview() {
        this.panel = 'review'
        this.form.content = ''
        this.form.rating = 5
      },
      openComplaint() {
        this.panel = 'complaint'
        this.form.content = ''
      },
      changeRating(e) {
        this.form.rating = e.detail.value
      },
      submitPanel() {
        if (!this.form.content.trim()) {
          this.$modal.msg('请先填写内容')
          return
        }
        const payload = {
          orderId: this.order.id,
          content: this.form.content
        }
        let action = null
        if (this.panel === 'objection') {
          action = submitObjection({
            ...payload,
            objectionRemark: this.form.content
          })
        } else if (this.panel === 'review') {
          action = submitReview({
            ...payload,
            rating: this.form.rating
          })
        } else if (this.panel === 'complaint') {
          action = submitComplaint({
            ...payload,
            complaintType: 'SERVICE',
            content: this.form.content
          })
        }
        if (!action) return
        action.then(() => {
          this.$modal.msgSuccess('提交成功')
          this.panel = ''
          this.loadOrder()
        })
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

  .summary-card,
  .card {
    border-radius: 8rpx;
    background: #fff;
    box-shadow: 0 8rpx 26rpx rgba(31, 41, 37, .06);
  }

  .summary-card {
    padding: 28rpx;
    border-top: 8rpx solid #f06a3a;
  }

  .order-no {
    color: #1d2b26;
    font-size: 34rpx;
    font-weight: 700;
  }

  .status {
    display: inline-flex;
    margin-top: 14rpx;
    padding: 6rpx 12rpx;
    border-radius: 6rpx;
    color: #2f7d58;
    background: #eaf7f0;
    font-size: 24rpx;
  }

  .time,
  .address,
  .quote-remark {
    margin-top: 14rpx;
    color: #66716b;
    font-size: 25rpx;
    line-height: 1.5;
  }

  .card {
    margin-top: 20rpx;
    padding: 26rpx;
  }

  .card-title {
    color: #1d2b26;
    font-size: 30rpx;
    font-weight: 700;
    margin-bottom: 12rpx;
  }

  .row,
  .field {
    display: flex;
    align-items: center;
    justify-content: space-between;
    min-height: 76rpx;
    border-bottom: 1rpx solid #f0f2ef;
    color: #4e5a55;
    font-size: 26rpx;
  }

  .row text:last-child {
    max-width: 430rpx;
    color: #26322d;
    text-align: right;
  }

  .price {
    color: #f06a3a !important;
    font-weight: 700;
  }

  .actions {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 16rpx;
  }

  .actions button,
  .submit-btn {
    height: 76rpx;
    line-height: 76rpx;
    padding: 0;
    border-radius: 8rpx;
    font-size: 26rpx;
  }

  .primary,
  .submit-btn {
    color: #fff;
    background: #f06a3a;
  }

  .plain {
    color: #2f7d58;
    background: #eaf7f0;
  }

  .danger {
    color: #d84a35;
    background: #fff0e8;
  }

  .textarea {
    width: 100%;
    min-height: 150rpx;
    box-sizing: border-box;
    padding: 18rpx;
    border-radius: 8rpx;
    color: #26322d;
    background: #fbfcfa;
    font-size: 26rpx;
  }

  .submit-btn {
    margin-top: 20rpx;
  }
</style>
