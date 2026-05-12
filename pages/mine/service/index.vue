<template>
  <view class="service-container">
    <view class="contact-card">
      <view class="contact-card__title">微信在线客服</view>
      <view class="contact-card__desc">
        点击下方按钮，直接进入微信客服会话。若当前账号有最近订单，会自动带上订单上下文，方便客服更快定位问题。
      </view>

      <!-- #ifdef MP-WEIXIN -->
      <button
        class="contact-button"
        open-type="contact"
        :session-from="contactSessionFrom"
        :send-message-title="contactMessageTitle"
        :send-message-path="contactMessagePath"
        :show-message-card="true"
        hover-class="none"
        @contact="handleContact"
      >
        联系在线客服
      </button>
      <view class="contact-card__tip">进入会话后可快捷发送当前页面卡片给客服。</view>
      <!-- #endif -->

      <!-- #ifndef MP-WEIXIN -->
      <view class="contact-card__fallback">请在微信小程序中使用在线客服能力。</view>
      <!-- #endif -->
    </view>
  </view>
</template>

<script>
import { listMyOrders } from '@/api/cooking/user'

export default {
  data() {
    return {
      orders: []
    }
  },
  computed: {
    latestOrder() {
      return this.orders[0] || {}
    },
    contactMessageTitle() {
      const orderNo = this.latestOrder.orderNo
      return orderNo ? `订单咨询｜${orderNo}` : '在线客服咨询'
    },
    contactMessagePath() {
      const orderId = this.latestOrderId()
      return orderId ? `/pages/user/order-detail?id=${orderId}` : '/pages/mine/service/index'
    },
    contactSessionFrom() {
      const order = this.latestOrder || {}
      const orderId = this.latestOrderId()
      const parts = [
        'scene=online-service',
        'page=mine-service',
        `hasOrder=${orderId ? 1 : 0}`
      ]

      if (orderId) {
        parts.push(`orderId=${encodeURIComponent(String(orderId))}`)
      }
      if (order.orderNo) {
        parts.push(`orderNo=${encodeURIComponent(String(order.orderNo))}`)
      }
      if (order.status !== undefined && order.status !== null && order.status !== '') {
        parts.push(`status=${encodeURIComponent(String(order.status))}`)
      }

      return parts.join('&').slice(0, 1024)
    }
  },
  onLoad() {
    this.loadOrders()
  },
  methods: {
    loadOrders() {
      listMyOrders({ pageNum: 1, pageSize: 5 }).then(res => {
        const rows = res.rows || (res.data && res.data.rows) || res.data || []
        this.orders = Array.isArray(rows) ? rows : []
      }).catch(() => {
        this.orders = []
      })
    },
    latestOrderId() {
      const order = this.latestOrder || {}
      return order.orderId || order.id || null
    },
    handleContact(e) {
      if (e && e.detail) {
        console.log('customer-contact', e.detail)
      }
    }
  }
}
</script>

<style lang="scss" scoped>
page {
  background-color: #fff7f0;
}

.service-container {
  min-height: 100vh;
  padding: 24rpx;
  box-sizing: border-box;
}

.contact-card {
  background: #fff;
  border-radius: 12rpx;
  padding: 28rpx 24rpx;
  box-shadow: 0 8rpx 24rpx rgba(31, 41, 37, 0.06);
}

.contact-card__title {
  font-size: 32rpx;
  font-weight: 600;
  color: #303133;
}

.contact-card__desc,
.contact-card__tip,
.contact-card__fallback {
  margin-top: 12rpx;
  font-size: 26rpx;
  line-height: 42rpx;
  color: #606266;
}

.contact-button {
  margin-top: 24rpx;
  height: 84rpx;
  line-height: 84rpx;
  border: none;
  border-radius: 10rpx;
  background: #07c160;
  color: #fff;
  font-size: 30rpx;
  font-weight: 600;
}

.contact-button::after {
  border: none;
}
</style>
