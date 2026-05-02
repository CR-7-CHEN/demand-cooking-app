<template>
  <view class="page">
    <view class="head-card">
      <view>
        <text class="sub">月度结算</text>
        <view class="title">{{ settlement.month || queryMonth }}</view>
      </view>
      <picker mode="date" fields="month" :value="queryMonth" @change="onMonthChange">
        <view class="month-btn">切换月份</view>
      </picker>
    </view>

    <view class="amount-card">
      <text class="amount-label">应发金额</text>
      <view class="amount">{{ money(payableAmount) }}</view>
      <text class="amount-tip">平台线下打款，实际以后台结算确认为准</text>
    </view>

    <view class="grid">
      <view class="metric">
        <text class="num">{{ value('completeCount', 'completedOrderCount', 'finishedCount') }}</text>
        <text class="name">完成单数</text>
      </view>
      <view class="metric">
        <text class="num">{{ money(value('orderCommission', 'chefCommission', 'commissionAmount')) }}</text>
        <text class="name">单子提成</text>
      </view>
      <view class="metric">
        <text class="num">{{ value('breachCount', 'defaultCount', 'violationCount') }}</text>
        <text class="name">违约次数</text>
      </view>
      <view class="metric">
        <text class="num">{{ money(value('breachDeduction', 'defaultDeduction', 'penaltyAmount')) }}</text>
        <text class="name">违约扣款</text>
      </view>
      <view class="metric">
        <text class="num">{{ money(value('baseSalary', 'personalBaseSalary')) }}</text>
        <text class="name">个人底薪</text>
      </view>
      <view class="metric">
        <text class="num">{{ money(value('afterDeductionCommission', 'netCommission')) }}</text>
        <text class="name">扣款后提成</text>
      </view>
    </view>

    <view class="rule-card">
      <view class="rule-title">结算口径</view>
      <view class="rule-line">已完成且未退款订单计入结算；退款中、已退款、退款失败和做饭人员原因取消订单不计入。</view>
      <view class="rule-line">当月违约达到 5 次且单子提成不少于 200 元时，从当月提成扣除 200 元，不扣个人底薪。</view>
    </view>
  </view>
</template>

<script>
  import { getChefSettlementMonth } from '@/api/cooking/chef'

  export default {
    data() {
      return {
        queryMonth: '',
        settlement: {}
      }
    },
    computed: {
      payableAmount() {
        return this.value('payableAmount', 'salaryAmount', 'totalPayable', 'monthIncome')
      }
    },
    onLoad() {
      this.queryMonth = this.currentMonth()
      this.load()
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
        getChefSettlementMonth({ month: this.queryMonth }).then(res => {
          this.settlement = res && res.data !== undefined ? res.data : res || {}
        }).catch(() => {
          this.settlement = {}
        })
      },
      value() {
        for (let i = 0; i < arguments.length; i++) {
          const key = arguments[i]
          if (this.settlement[key] !== undefined && this.settlement[key] !== null && this.settlement[key] !== '') {
            return this.settlement[key]
          }
        }
        return 0
      },
      money(value) {
        return '¥' + Number(value || 0).toFixed(2)
      }
    }
  }
</script>

<style lang="scss" scoped>
  page {
    background: #f5f7f5;
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
  .rule-card {
    border-radius: 14rpx;
    box-shadow: 0 8rpx 28rpx rgba(20, 35, 27, 0.06);
  }

  .head-card {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 28rpx;
    background: #17211b;
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

  .amount-card {
    margin-top: 22rpx;
    padding: 34rpx 28rpx;
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

  .amount-tip {
    display: block;
    margin-top: 10rpx;
    color: #87938b;
    font-size: 24rpx;
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

  .rule-card {
    margin-top: 24rpx;
    padding: 26rpx;
    background: #fff;
  }

  .rule-title {
    font-size: 30rpx;
    font-weight: 700;
  }

  .rule-line {
    margin-top: 14rpx;
    color: #526158;
    font-size: 26rpx;
    line-height: 1.55;
  }
</style>
