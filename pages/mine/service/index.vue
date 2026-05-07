<template>
  <view class="service-container">
    <view class="notice">
      <view class="notice-title">机器人客服</view>
      <view class="notice-text">常见问题会自动回复，订单问题会结合当前账号的订单状态判断。</view>
    </view>

    <view class="quick-section">
      <view class="section-title">快捷问题</view>
      <view class="quick-list">
        <view v-for="(item, index) in quickQuestions" :key="index" class="quick-item" @click="askQuick(item)">
          {{ item }}
        </view>
      </view>
    </view>

    <scroll-view class="chat-list" scroll-y :scroll-into-view="lastMessageId">
      <view v-for="(message, index) in messages" :key="index" :id="'msg-' + index" class="message-row"
        :class="message.role">
        <view class="message-bubble">{{ message.content }}</view>
      </view>
    </scroll-view>

  </view>
</template>

<script>
  import { listMyOrders } from '@/api/cooking/user'
  import { listCustomerFaq, askCustomerRobot } from '@/api/cooking/customer-service'

  const localFaqs = [{
    question: '如何预约上门做饭',
    answer: '进入首页选择做饭人员、服务时间、地址和菜品需求，提交后等待做饭人员响应。'
  }, {
    question: '食材由谁准备',
    answer: '第一版以下单页面的订单信息为准，通常可由用户自备食材，并在备注中说明口味、忌口和厨房条件。'
  }, {
    question: '怎么取消订单',
    answer: '可进入我的订单详情页取消符合条件的订单，系统会按订单当前状态处理。'
  }, {
    question: '怎么查看订单状态',
    answer: '进入我的订单即可查看待响应、待支付、待服务、待确认和已完成等状态。'
  }]

  export default {
    data() {
      return {
        loading: false,
        faqs: localFaqs,
        orders: [],
        messages: [{
          role: 'robot',
          content: '您好，我是上门做饭机器人客服。您可以咨询预约、食材、订单状态、取消等问题。'
        }]
      }
    },
    computed: {
      quickQuestions() {
        return ['如何预约上门做饭？', '食材由谁准备？', '我的订单现在是什么状态？', '我要取消订单怎么办？']
      },
      lastMessageId() {
        return `msg-${this.messages.length - 1}`
      }
    },
    onLoad() {
      this.loadFaqs()
      this.loadOrders()
    },
    methods: {
      loadFaqs() {
        listCustomerFaq({ status: '0' }).then(res => {
          if (!res || typeof res !== 'object') return
          const rows = res.rows || res.data || []
          if (Array.isArray(rows) && rows.length > 0) {
            this.faqs = rows.map(item => ({
              question: item.question || item.title || item.keyword || '',
              answer: item.answer || item.content || ''
            })).filter(item => item.question && item.answer)
          }
        }).catch(() => {})
      },
      loadOrders() {
        listMyOrders({ pageNum: 1, pageSize: 5 }).then(res => {
          const rows = res.rows || (res.data && res.data.rows) || res.data || []
          this.orders = Array.isArray(rows) ? rows : []
        }).catch(() => {
          this.orders = []
        })
      },
      askQuick(text) {
        this.askRobotQuestion(text)
      },
      askRobotQuestion(question) {
        const text = (question || '').trim()
        if (!text || this.loading) return
        this.messages.push({ role: 'user', content: text })
        this.loading = true

        askCustomerRobot({
          question: text,
          orderId: this.latestOrderId()
        }).then(res => {
          if (!res || typeof res !== 'object') {
            this.pushRobot(this.buildLocalAnswer(text))
            return
          }
          const data = res.data || res
          const answer = data.answer || data.content || data.reply
          this.pushRobot(answer || this.buildLocalAnswer(text))
        }).catch(() => {
          this.pushRobot(this.buildLocalAnswer(text))
        }).finally(() => {
          this.loading = false
        })
      },
      pushRobot(content) {
        this.messages.push({
          role: 'robot',
          content: content || '这个问题我暂时无法自动判断，请换一种问法或进入我的订单查看详情。'
        })
      },
      buildLocalAnswer(text) {
        const matched = this.faqs.find(item => text.indexOf(item.question.replace(/[？?]/g, '')) !== -1 ||
          item.question.indexOf(text.replace(/[？?]/g, '')) !== -1)
        if (matched) return matched.answer
        if (/订单|状态|进度|支付|取消|退款|报价/.test(text)) {
          return this.buildOrderAnswer()
        }
        return '这个问题我暂时无法自动判断，请换一种问法或进入我的订单查看详情。'
      },
      buildOrderAnswer() {
        if (!this.orders.length) {
          return '当前账号暂未查询到订单。如已经提交订单但这里未显示，请进入我的订单页面查看详情。'
        }
        const order = this.orders[0]
        const status = this.statusText(order.status || order.orderStatus)
        const orderNo = order.orderNo || order.id || order.orderId || '最近一笔订单'
        return `${orderNo} 当前状态为「${status}」。您也可以进入“我的订单”查看订单详情和可操作按钮。`
      },
      buildOrderSnapshot() {
        return this.orders.slice(0, 5).map(item => ({
          id: item.id || item.orderId,
          orderNo: item.orderNo,
          status: item.status || item.orderStatus,
          startTime: item.startTime || item.serviceStartTime || item.appointmentStartTime
        }))
      },
      latestOrderId() {
        const order = this.orders[0] || {}
        return order.orderId || order.id || null
      },
      statusText(status) {
        const map = {
          WAITING_RESPONSE: '待做饭人员响应',
          WAITING_PAY: '待支付',
          PRICE_OBJECTION: '报价异议处理中',
          WAITING_SERVICE: '待上门服务',
          IN_SERVICE: '服务中',
          WAITING_CONFIRM: '待确认完成',
          COMPLETED: '已完成',
          CANCELLED: '已取消'
        }
        return map[status] || status || '未知'
      }
    }
  }
</script>

<style lang="scss" scoped>
  page {
    background-color: #fff7f0;
  }

  .service-container {
    padding: 24rpx;
    padding-bottom: 40rpx;
  }

  .notice,
  .quick-section,
  .chat-list {
    background: #fff;
    border-radius: 8rpx;
    margin-bottom: 20rpx;
    padding: 24rpx;
  }

  .notice-title,
  .section-title {
    font-size: 32rpx;
    font-weight: 600;
    color: #303133;
    margin-bottom: 12rpx;
  }

  .notice-text {
    font-size: 26rpx;
    line-height: 42rpx;
    color: #606266;
  }

  .quick-list {
    display: flex;
    flex-wrap: wrap;
  }

  .quick-item {
    padding: 12rpx 18rpx;
    margin: 0 16rpx 16rpx 0;
    border: 1rpx solid #f06a3a;
    border-radius: 6rpx;
    color: #f06a3a;
    font-size: 26rpx;
  }

  .chat-list {
    height: 540rpx;
    box-sizing: border-box;
  }

  .message-row {
    display: flex;
    margin-bottom: 18rpx;
  }

  .message-row.user {
    justify-content: flex-end;
  }

  .message-bubble {
    max-width: 78%;
    padding: 18rpx 22rpx;
    border-radius: 8rpx;
    font-size: 28rpx;
    line-height: 42rpx;
    color: #303133;
    background: #f4f4f5;
  }

  .message-row.user .message-bubble {
    color: #fff;
    background: #f06a3a;
  }

</style>
