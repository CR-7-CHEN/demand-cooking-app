<template>
  <view class="page">
    <view class="head-card">
      <view>
        <text class="sub">月度结算</text>
        <view class="title">{{ headerMonthText }}</view>
      </view>
      <picker mode="date" fields="month" :value="pickerValue" @change="onMonthChange">
        <view class="month-btn">{{ monthButtonText }}</view>
      </picker>
    </view>

    <view v-if="queryMonth" class="toolbar">
      <text class="toolbar-clear" @click="clearMonthFilter">查看全部</text>
    </view>

    <scroll-view
      class="list-scroll"
      scroll-y
      refresher-enabled="true"
      :refresher-triggered="refreshing"
      @refresherrefresh="onPullDownRefresh"
      @scrolltolower="loadNextPage"
    >
      <view v-if="loading && !settlementList.length" class="state-card">
        <view class="state-title">结算列表加载中...</view>
        <view class="state-text">正在获取月度结算记录。</view>
      </view>

      <view v-else-if="!settlementList.length" class="state-card">
        <view class="state-title">暂无结算记录</view>
        <view class="state-text">当前没有可显示的月度结算数据。</view>
      </view>

      <view v-else class="card-list">
        <view
          v-for="item in settlementList"
          :key="item.key"
          class="settlement-card"
          @click="goDetail(item)"
        >
          <view class="card-top">
            <text class="month">{{ item.month }}</text>
            <text :class="['status', item.statusTone]">{{ item.settlementStatus }}</text>
          </view>

          <view class="metrics">
            <view class="metric">
              <text class="metric-label">完成单数</text>
              <text class="metric-value">{{ item.completeCount }}</text>
            </view>
            <view class="metric">
              <text class="metric-label">应发金额</text>
              <text class="metric-value money">{{ formatMoney(item.payableAmount) }}</text>
            </view>
          </view>

          <view class="card-bottom">
            <text class="card-meta">结算编号 {{ item.displayId }}</text>
            <text class="card-meta muted">{{ item.statusHint }}</text>
          </view>
        </view>
      </view>

      <view v-if="settlementList.length && !hasNextPage" class="end-tip">没有更多结算记录了</view>
    </scroll-view>
  </view>
</template>

<script>
  import { getChefSettlementMonth } from '@/api/cooking/chef'

  const PAGE_SIZE = 8

  const STATUS_TEXT_MAP = {
    SETTLED: '已结算',
    FINISHED: '已结算',
    COMPLETED: '已结算',
    DONE: '已结算',
    PROCESSING: '结算中',
    PENDING: '待结算',
    WAITING: '待结算',
    WAIT: '待结算',
    FAILED: '结算失败',
    REJECTED: '已驳回',
    CANCELLED: '已取消',
    CANCELED: '已取消'
  }

  const STATUS_TONE_MAP = {
    SETTLED: 'success',
    FINISHED: 'success',
    COMPLETED: 'success',
    DONE: 'success',
    PROCESSING: 'info',
    PENDING: 'warning',
    WAITING: 'warning',
    WAIT: 'warning',
    FAILED: 'danger',
    REJECTED: 'danger',
    CANCELLED: 'muted',
    CANCELED: 'muted'
  }

  export default {
    data() {
      return {
        loading: false,
        refreshing: false,
        loadingMore: false,
        queryMonth: '',
        pageNum: 1,
        pageSize: PAGE_SIZE,
        total: 0,
        hasMore: true,
        settlementList: []
      }
    },
    computed: {
      hasNextPage() {
        return this.hasMore && !this.loading && !this.refreshing
      },
      headerMonthText() {
        return this.queryMonth || '结算列表'
      },
      pickerValue() {
        return this.queryMonth || this.currentMonth()
      },
      monthButtonText() {
        return this.queryMonth ? '切换月份' : '选择月份'
      }
    },
    onLoad() {
      this.loadFirstPage()
    },
    onPullDownRefresh() {
      this.refreshing = true
      this.loadPage(1, { append: false, isRefresh: true }).finally(() => {
        this.refreshing = false
        uni.stopPullDownRefresh()
      })
    },
    methods: {
      currentMonth() {
        const now = new Date()
        const month = now.getMonth() + 1
        return `${now.getFullYear()}-${month < 10 ? '0' + month : month}`
      },
      loadFirstPage() {
        return this.loadPage(1, { append: false })
      },
      onMonthChange(e) {
        this.queryMonth = e && e.detail ? e.detail.value : ''
        return this.loadPage(1, { append: false })
      },
      clearMonthFilter() {
        if (!this.queryMonth) return
        this.queryMonth = ''
        return this.loadPage(1, { append: false })
      },
      loadNextPage() {
        if (!this.hasNextPage || this.loadingMore || this.loading || this.refreshing) {
          return Promise.resolve()
        }
        return this.loadPage(this.pageNum + 1, { append: true })
      },
      loadPage(pageNum, options) {
        const append = options && options.append
        const isRefresh = options && options.isRefresh
        const isInitialLoad = pageNum === 1 && !append && !isRefresh

        if (isInitialLoad) {
          this.loading = true
        } else {
          this.loadingMore = true
        }

        return getChefSettlementMonth({
          settlementMonth: this.queryMonth || undefined,
          month: this.queryMonth || undefined,
          pageNum,
          pageSize: this.pageSize
        }).then(res => {
          const list = this.toList(res).map((item, index) => this.normalizeItem(item, pageNum, index))
          const total = this.pickTotal(res)

          this.pageNum = pageNum
          this.total = total || 0
          this.hasMore = this.resolveHasMore(list, total, pageNum)
          this.settlementList = append ? this.settlementList.concat(list) : list
        }).catch(() => {
          if (!append) {
            this.settlementList = []
            this.pageNum = 1
            this.total = 0
          }
          this.hasMore = false
        }).finally(() => {
          this.loading = false
          this.loadingMore = false
        })
      },
      unwrap(res) {
        if (!res) return null
        if (res.data !== undefined) return res.data
        return res
      },
      toList(res) {
        const data = this.unwrap(res)
        if (Array.isArray(data)) return data
        if (data && Array.isArray(data.rows)) return data.rows
        if (data && Array.isArray(data.records)) return data.records
        if (data && Array.isArray(data.list)) return data.list
        if (res && Array.isArray(res.rows)) return res.rows
        return []
      },
      pickTotal(res) {
        const data = this.unwrap(res) || {}
        const candidates = [
          data.total,
          data.totalCount,
          data.totalNum,
          data.count,
          data.recordsTotal,
          res && res.total,
          res && res.totalCount
        ]

        for (let i = 0; i < candidates.length; i += 1) {
          const value = Number(candidates[i])
          if (!Number.isNaN(value) && value >= 0) return value
        }
        return 0
      },
      resolveHasMore(list, total, pageNum) {
        if (typeof total === 'number' && total > 0) {
          return pageNum * this.pageSize < total
        }
        return list.length >= this.pageSize
      },
      normalizeItem(item, pageNum, index) {
        const rawMonth = this.firstValue(item, [
          'settlementMonth',
          'month',
          'settleMonth',
          'statMonth',
          'billingMonth',
          'monthKey'
        ])
        const month = this.formatMonth(rawMonth)
        const id = this.firstValue(item, [
          'id',
          'settlementId',
          'recordId',
          'monthId',
          'monthRecordId'
        ]) || month || `page-${pageNum}-${index}`
        const statusRaw = this.firstValue(item, [
          'settlementStatus',
          'status',
          'statusCode',
          'settleStatus'
        ])
        const statusKey = this.normalizeStatus(statusRaw)

        return {
          key: `${id}-${month || index}`,
          id,
          month: month || '未知月份',
          completeCount: this.normalizeNumber(this.firstValue(item, [
            'completeCount',
            'completedOrderCount',
            'finishedCount',
            'orderCount'
          ])),
          payableAmount: this.normalizeNumber(this.firstValue(item, [
            'payableAmount',
            'salaryAmount',
            'totalPayable',
            'monthIncome',
            'totalAmount'
          ])),
          settlementStatus: this.statusText(item, statusKey),
          statusText: this.statusText(item, statusKey),
          statusTone: this.statusTone(statusKey),
          statusHint: this.statusHint(item, statusKey),
          displayId: id
        }
      },
      firstValue(item, keys) {
        for (let i = 0; i < keys.length; i += 1) {
          const value = item && item[keys[i]]
          if (value !== undefined && value !== null && value !== '') {
            return value
          }
        }
        return ''
      },
      normalizeNumber(value) {
        const number = Number(value)
        return Number.isNaN(number) ? 0 : number
      },
      normalizeStatus(status) {
        return String(status || '').trim().toUpperCase()
      },
      statusText(item, statusKey) {
        const direct = this.firstValue(item, [
          'settlementStatusText',
          'statusName',
          'settlementStatusName',
          'statusText'
        ])
        if (direct) return String(direct)
        return STATUS_TEXT_MAP[statusKey] || '待确认'
      },
      statusTone(statusKey) {
        return STATUS_TONE_MAP[statusKey] || 'muted'
      },
      statusHint(item, statusKey) {
        const direct = this.firstValue(item, [
          'settlementHint',
          'statusHint',
          'remark',
          'note'
        ])
        if (direct) return String(direct)
        if (statusKey === 'SETTLED' || statusKey === 'FINISHED' || statusKey === 'COMPLETED' || statusKey === 'DONE') {
          return '点击查看结算详情'
        }
        if (statusKey === 'PROCESSING') {
          return '结算处理中'
        }
        if (statusKey === 'FAILED' || statusKey === 'REJECTED') {
          return '结算结果待处理'
        }
        return '点击查看结算详情'
      },
      formatMonth(value) {
        if (!value) return ''
        const text = String(value).trim()
        if (/^\d{4}-\d{2}$/.test(text)) return text
        if (/^\d{4}\/\d{2}$/.test(text)) return text.replace('/', '-')

        const normalized = text.replace(/\./g, '-').replace(/\//g, '-')
        const date = new Date(normalized.replace(/-/g, '/'))
        if (Number.isNaN(date.getTime())) return text.slice(0, 7).replace('/', '-')

        const month = date.getMonth() + 1
        return `${date.getFullYear()}-${month < 10 ? '0' + month : month}`
      },
      formatMoney(value) {
        const number = Number(value)
        const safeNumber = Number.isNaN(number) ? 0 : number
        return `￥${safeNumber.toFixed(2)}`
      },
      goDetail(item) {
        if (!item || !item.id) {
          uni.showToast({
            title: '缺少结算单 ID',
            icon: 'none'
          })
          return
        }

        uni.navigateTo({
          url: '/pages/work/settlement-detail?id=' + item.id + '&month=' + item.month
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
    display: flex;
    flex-direction: column;
    min-height: 100vh;
    box-sizing: border-box;
    color: #17211b;
  }

  .head-card {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 20rpx;
    padding: 28rpx 24rpx;
    background: #6a3a2b;
    color: #fff;
  }

  .sub {
    color: rgba(255, 255, 255, 0.7);
    font-size: 24rpx;
  }

  .title {
    margin-top: 10rpx;
    font-size: 36rpx;
    font-weight: 700;
  }

  .month-btn {
    flex-shrink: 0;
    padding: 12rpx 18rpx;
    border-radius: 999rpx;
    background: rgba(255, 255, 255, 0.14);
    color: #fff;
    font-size: 24rpx;
  }

  .toolbar {
    display: flex;
    align-items: center;
    justify-content: flex-end;
    gap: 16rpx;
    padding: 18rpx 24rpx 12rpx;
  }

  .toolbar-clear {
    flex-shrink: 0;
    color: #c1732d;
    font-size: 24rpx;
  }

  .list-scroll {
    flex: 1;
    min-height: 0;
    padding: 0 0 24rpx;
  }

  .state-card,
  .settlement-card {
    margin: 0 24rpx 18rpx;
    border-radius: 12rpx;
    background: #fff;
    box-shadow: 0 8rpx 28rpx rgba(20, 35, 27, 0.06);
  }

  .state-card {
    padding: 34rpx 28rpx;
  }

  .state-title {
    font-size: 30rpx;
    font-weight: 700;
  }

  .state-text {
    margin-top: 10rpx;
    color: #7e8b83;
    font-size: 24rpx;
    line-height: 1.5;
  }

  .card-list {
    padding-top: 4rpx;
  }

  .settlement-card {
    padding: 24rpx;
  }

  .card-top,
  .metrics,
  .card-bottom {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16rpx;
  }

  .month {
    min-width: 0;
    font-size: 32rpx;
    font-weight: 700;
    color: #17211b;
  }

  .status {
    flex-shrink: 0;
    padding: 6rpx 12rpx;
    border-radius: 999rpx;
    font-size: 22rpx;
  }

  .status.success {
    color: #176c35;
    background: #dcf4e1;
  }

  .status.warning {
    color: #8f5b10;
    background: #faeedc;
  }

  .status.info {
    color: #15638a;
    background: #dceff7;
  }

  .status.danger {
    color: #a82819;
    background: #fde1dc;
  }

  .status.muted {
    color: #4e5a52;
    background: #edf0ee;
  }

  .metrics {
    margin-top: 18rpx;
  }

  .metric {
    flex: 1;
    min-width: 0;
    padding: 18rpx 16rpx;
    border-radius: 10rpx;
    background: #fff7f0;
  }

  .metric + .metric {
    margin-left: 16rpx;
  }

  .metric-label {
    display: block;
    color: #607066;
    font-size: 24rpx;
  }

  .metric-value {
    display: block;
    margin-top: 8rpx;
    font-size: 32rpx;
    font-weight: 700;
  }

  .money {
    color: #c1732d;
  }

  .card-bottom {
    margin-top: 16rpx;
    flex-wrap: wrap;
    justify-content: space-between;
  }

  .card-meta {
    color: #607066;
    font-size: 22rpx;
  }

  .card-meta.muted {
    color: #8a968f;
  }

  .end-tip {
    padding: 8rpx 24rpx 0;
    color: #87938b;
    font-size: 22rpx;
    text-align: center;
  }
</style>
