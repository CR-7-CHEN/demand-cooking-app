<template>
  <view class="cook-home">
    <view class="hero">
      <view class="hero-top">
        <view>
          <view class="title">把一餐家常饭交给可靠的人</view>
        </view>
      </view>
      <view v-if="!isCurrentChef" class="quick-actions hero-actions">
        <view class="quick-item" @click="goAddress">
          <uni-icons type="location-filled" size="24" color="#f06a3a"></uni-icons>
          <text>地址管理</text>
        </view>
        <view class="quick-item" @click="goOrders">
          <uni-icons type="calendar-filled" size="24" color="#20a779"></uni-icons>
          <text>我的订单</text>
        </view>
      </view>
      <view v-if="showChefRecommendations" class="search-panel">
        <view class="search-row">
          <uni-icons type="search" size="18" color="#f06a3a"></uni-icons>
          <input v-model="query.keyword" confirm-type="search" placeholder="搜索姓名、菜系、区域" @confirm="loadChefs" />
        </view>
        <view class="filter-row">
          <picker
            class="region-picker"
            mode="multiSelector"
            :value="regionIndex"
            :range="regionColumns"
            @click="onRegionPickerTap"
            @columnchange="onRegionColumnChange"
            @change="onRegionChange"
            @cancel="onRegionCancel"
          >
            <view class="region-select" @tap="onRegionPickerTap">
              <text class="region-value" :class="{ placeholder: !query.serviceArea }">
                {{ serviceAreaLabel || query.serviceArea || '选择服务区域' }}
              </text>
              <uni-icons :type="regionPickerOpen ? 'top' : 'bottom'" size="14" color="#8a8f98"></uni-icons>
            </view>
          </picker>
          <button @click="loadChefs">筛选</button>
        </view>
        <view class="meal-period-row">
          <text
            v-for="item in mealPeriodOptions"
            :key="item.value"
            class="meal-period-option"
            :class="{ active: query.mealPeriod === item.value }"
            @click="selectMealPeriod(item.value)"
          >
            {{ item.label }}
          </text>
        </view>
      </view>
    </view>

    <view v-if="isCurrentChef" class="chef-dashboard">
      <view class="dashboard-card status-card">
        <view>
          <view class="status-label">接单状态</view>
          <view class="status-title">{{ isTakingOrders ? '营业中' : '暂停中' }}</view>
        </view>
        <button
          class="status-button"
          :class="{ paused: !isTakingOrders }"
          :loading="statusSwitching"
          :disabled="statusSwitching"
          @click="toggleTakingOrders"
        >
          {{ isTakingOrders ? '暂停接单' : '恢复接单' }}
        </button>
      </view>

      <view class="dashboard-head">
        <text class="dashboard-title">收益概览</text>
        <text class="dashboard-link" @click="goOrders">我的订单 ></text>
      </view>
      <view class="revenue-grid">
        <view
          v-for="item in revenueCards"
          :key="item.label"
          class="revenue-card"
          :class="{ clickable: item.action === 'commission' }"
          @click="onRevenueCardTap(item)"
        >
          <text class="revenue-label">{{ item.label }}</text>
          <text class="revenue-value">{{ item.value }}</text>
          <text v-if="item.extra" class="revenue-extra">{{ item.extra }}</text>
        </view>
      </view>

      <view class="dashboard-card alerts-card">
        <view class="dashboard-head inner">
          <text class="dashboard-title">工作提醒</text>
        </view>
        <view v-if="limitedAlerts.length === 0" class="empty-alert">暂无工作提醒</view>
        <view v-else class="alert-list">
          <view v-for="item in limitedAlerts" :key="item.key || item.title" class="alert-item" :class="item._toneClass">
            <view class="alert-main">
              <view class="alert-title">{{ item.title }}</view>
              <view class="alert-content">{{ item.content }}</view>
            </view>
            <view v-if="item.count" class="alert-count">{{ item.count }}</view>
          </view>
        </view>
      </view>

      <view class="dashboard-card trend-card">
        <view class="dashboard-head inner">
          <text class="dashboard-title">收入趋势</text>
        </view>
        <view v-if="revenueTrend.length === 0" class="empty-alert">暂无收入趋势</view>
        <view v-else class="trend-list">
          <view v-for="item in revenueTrend" :key="item.date || item.label" class="trend-item">
            <text class="trend-label">{{ item.label || item.date }}</text>
            <view class="trend-track">
              <view class="trend-bar" :style="item._barStyle"></view>
            </view>
            <text class="trend-amount">{{ formatMoney(item.amount) }}</text>
          </view>
        </view>
      </view>
    </view>

    <view v-if="showChefRecommendations" class="section-head">
      <text class="section-title">推荐做饭人员</text>
    </view>

    <view v-if="showChefRecommendations && loading" class="state-box">正在寻找合适的做饭人员...</view>
    <view v-else-if="showChefRecommendations && chefs.length === 0" class="state-box">暂无可预约人员，可更换区域后再试</view>

    <view v-else-if="showChefRecommendations" class="chef-list">
      <view v-for="chef in chefs" :key="chef.id" class="chef-card" @click="openChef(chef)">
        <image class="avatar" :src="chef.avatar" mode="aspectFill"></image>
        <view class="chef-main">
          <view class="chef-line">
            <view class="chef-name">{{ chef.name }}</view>
            <view v-if="chef.recommended" class="recommend-tag">推荐</view>
          </view>
          <view class="meta-row">
            <text v-if="chef.genderText">{{ chef.genderText }}</text>
            <text v-if="chef.ageText">{{ chef.ageText }}</text>
            <text>评分 {{ chef.rating }}</text>
            <text>{{ chef.completedCount }} 单</text>
          </view>
          <view class="tag-row">
            <text v-for="item in chef.cuisines" :key="item" class="tag">{{ item }}</text>
          </view>
          <view v-if="chef.serviceAreaText" class="area-row">
            <uni-icons type="location" size="14" color="#8a8f98"></uni-icons>
            <text>{{ chef.serviceAreaText }}</text>
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<script>
  import { getToken } from '@/utils/auth'
  import { listChefs } from '@/api/cooking/user'
  import { getChefMy, getChefWorkbench, pauseChef, resumeChef } from '@/api/cooking/chef'
  import regionData from '@/utils/region-data'
  const chefStatus = require('@/utils/chef-status')

  const defaultAvatar = '/static/images/profile.jpg'
  const mealPeriodOptions = [
    { label: '早餐', value: 'breakfast' },
    { label: '午餐', value: 'lunch' },
    { label: '晚餐', value: 'dinner' }
  ]

  export default {
    data() {
      return {
        loading: false,
        query: {
          keyword: '',
          serviceArea: '',
          mealPeriod: ''
        },
        mealPeriodOptions,
        serviceAreaLabel: '',
        regionValue: [],
        regionIndex: [0, 0, 0],
        regionColumns: [[], [], []],
        regionPickerOpen: false,
        chefProfile: {},
        chefWorkbench: {},
        statusSwitching: false,
        chefs: []
      }
    },
    computed: {
      isCurrentChef() {
        return chefStatus.isChefWorkbenchAvailable(this.chefProfile)
      },
      showChefRecommendations() {
        return chefStatus.shouldShowChefRecommendations(this.chefProfile)
      },
      isTakingOrders() {
        const value = this.chefWorkbench.takingOrders
        if (value !== undefined && value !== null && value !== '') {
          return value === true || value === 1 || String(value) === '1' || String(value).toLowerCase() === 'true'
        }
        return chefStatus.isChefNormal(this.chefProfile)
      },
      revenueOverview() {
        return this.chefWorkbench.revenueOverview || {}
      },
      revenueCards() {
        return [
          { label: '今日收入', value: this.formatMoney(this.revenueOverview.todayIncome) },
          {
            label: '本月提成',
            value: this.formatMoney(this.revenueOverview.monthCommissionAmount),
            extra: '查看每单明细',
            action: 'commission'
          },
          { label: '本月完成', value: `${this.formatCount(this.revenueOverview.monthCompletedOrders)} 单` },
          {
            label: '应发金额',
            value: this.formatMoney(this.revenueOverview.monthPayableAmount),
            extra: `扣款 ${this.formatMoney(this.revenueOverview.monthDeduction)}`
          }
        ]
      },
      limitedAlerts() {
        const alerts = Array.isArray(this.chefWorkbench.alerts) ? this.chefWorkbench.alerts : []
        return alerts.slice(0, 3).map(item => {
          const tone = String(item.tone || '').toLowerCase()
          let cls = 'warning'
          if (tone === 'danger' || tone === 'error') cls = 'danger'
          else if (tone === 'success') cls = 'success'
          return { ...item, _toneClass: cls }
        })
      },
      revenueTrend() {
        const trend = Array.isArray(this.chefWorkbench.revenueTrend) ? this.chefWorkbench.revenueTrend : []
        const maxTrendAmount = trend.reduce((max, item) => {
          const amount = Number(item.amount) || 0
          return amount > max ? amount : max
        }, 0)
        return trend.map(item => {
          const amount = Number(item.amount) || 0
          const percent = amount > 0 && maxTrendAmount > 0 ? Math.max(8, Math.round((amount / maxTrendAmount) * 100)) : 0
          return {
            ...item,
            _barStyle: `width: ${percent}%;`
          }
        })
      }
    },
    onLoad() {
      this.initRegionPicker()
      this.loadPage()
    },
    methods: {
      loadPage() {
        return this.loadCurrentChef().finally(() => {
          if (this.isCurrentChef) {
            this.chefs = []
            return this.loadChefWorkbench()
          }
          this.chefWorkbench = {}
          return this.loadChefs()
        })
      },
      loadCurrentChef() {
        if (!getToken()) {
          this.chefProfile = {}
          this.chefWorkbench = {}
          return Promise.resolve()
        }
        return getChefMy().then(res => {
          this.chefProfile = this.unwrap(res) || {}
        }).catch(() => {
          this.chefProfile = {}
          this.chefWorkbench = {}
        })
      },
      loadChefWorkbench() {
        if (!this.isCurrentChef) {
          this.chefWorkbench = {}
          return Promise.resolve()
        }
        return getChefWorkbench().then(res => {
          this.chefWorkbench = this.unwrap(res) || {}
        }).catch(() => {
          this.chefWorkbench = {}
        })
      },
      loadChefs() {
        if (!this.showChefRecommendations) {
          this.chefs = []
          this.loading = false
          return Promise.resolve()
        }
        this.loading = true
        listChefs({
          keyword: this.query.keyword,
          serviceArea: this.query.serviceArea,
          mealPeriod: this.query.mealPeriod
        }).then(res => {
          this.chefs = this.pickList(res).map(this.normalizeChef)
        }).catch(() => {
          this.chefs = []
        }).finally(() => {
          this.loading = false
        })
      },
      selectMealPeriod(value) {
        this.query.mealPeriod = this.query.mealPeriod === value ? '' : value
        this.loadChefs()
      },
      unwrap(res) {
        if (!res) return null
        if (res.data !== undefined) return res.data
        return res
      },
      initRegionPicker() {
        this.regionColumns = this.buildRegionColumns(this.regionIndex)
      },
      onRegionPickerTap() {
        this.regionPickerOpen = true
      },
      onRegionCancel() {
        this.regionPickerOpen = false
      },
      onRegionColumnChange(event) {
        const detail = event.detail || {}
        const nextIndex = this.regionIndex.slice()
        nextIndex[detail.column] = detail.value
        if (detail.column === 0) {
          nextIndex[1] = 0
          nextIndex[2] = 0
        }
        if (detail.column === 1) {
          nextIndex[2] = 0
        }
        this.regionIndex = this.normalizeRegionIndex(nextIndex)
        this.regionColumns = this.buildRegionColumns(this.regionIndex)
      },
      onRegionChange(event) {
        this.regionPickerOpen = false
        this.regionIndex = this.normalizeRegionIndex(event.detail && event.detail.value ? event.detail.value : this.regionIndex)
        this.regionColumns = this.buildRegionColumns(this.regionIndex)
        const region = this.getRegionNames(this.regionIndex)
        this.regionValue = region
        this.serviceAreaLabel = region.filter(Boolean).join(' ')
        this.query.serviceArea = region[2] || region[1] || region[0] || ''
        this.loadChefs()
      },
      buildRegionColumns(index) {
        const province = regionData[index[0]] || regionData[0]
        const cities = this.getChildren(province)
        const city = cities[index[1]] || cities[0]
        const districts = this.getChildren(city)
        return [
          regionData.map(item => item.name),
          cities.map(item => item.name),
          districts.map(item => typeof item === 'string' ? item : item.name)
        ]
      },
      getRegionNames(index) {
        const province = regionData[index[0]] || regionData[0]
        const cities = this.getChildren(province)
        const city = cities[index[1]] || cities[0]
        const districts = this.getChildren(city)
        const district = districts[index[2]] || districts[0]
        return [
          province && province.name,
          city && city.name,
          typeof district === 'string' ? district : district && district.name
        ].filter(Boolean)
      },
      getChildren(item) {
        return item && Array.isArray(item.children) ? item.children : []
      },
      normalizeRegionIndex(value) {
        const nextIndex = (Array.isArray(value) ? value : []).map(item => Number(item) || 0)
        const provinceIndex = this.clampIndex(nextIndex[0], regionData.length)
        const cities = this.getChildren(regionData[provinceIndex])
        const cityIndex = this.clampIndex(nextIndex[1], cities.length)
        const districts = this.getChildren(cities[cityIndex])
        const districtIndex = this.clampIndex(nextIndex[2], districts.length)
        return [provinceIndex, cityIndex, districtIndex]
      },
      clampIndex(index, length) {
        if (!length || index < 0) return 0
        return index >= length ? length - 1 : index
      },
      pickList(res) {
        if (Array.isArray(res)) return res
        if (Array.isArray(res.rows)) return res.rows
        if (Array.isArray(res.records)) return res.records
        if (Array.isArray(res.data)) return res.data
        if (res.data && Array.isArray(res.data.rows)) return res.data.rows
        if (res.data && Array.isArray(res.data.records)) return res.data.records
        if (res.data && Array.isArray(res.data.list)) return res.data.list
        return []
      },
      pickChefRating(item) {
        const rating = item.rating
        if (rating !== undefined && rating !== null && rating !== '') return rating
        const score = item.score
        if (score !== undefined && score !== null && score !== '') return score
        return '5.0'
      },
      formatChefRating(value) {
        const rating = Number(value)
        if (Number.isFinite(rating)) {
          return rating.toFixed(1)
        }
        return value
      },
      normalizeChef(item) {
        const cuisines = this.toArray(item.cuisines || item.cuisine || item.specialties || item.goodAt)
        const areas = this.toArray(item.serviceAreas || item.serviceArea || item.serviceAreaNames || item.area)
        const rawGender = item.gender === undefined || item.gender === null ? item.sex : item.gender
        const rawAge = item.age === undefined || item.age === null ? (item.ageText === undefined || item.ageText === null ? item.ageValue : item.ageText) : item.age
        return {
          raw: item,
          id: item.id || item.chefId || item.userChefId,
          name: item.name || item.chefName || item.realName || '做饭人员',
          avatar: item.avatar || item.avatarUrl || item.photo || defaultAvatar,
          rating: this.formatChefRating(this.pickChefRating(item)),
          completedCount: item.completedCount || item.completeCount || item.orderCount || item.finishedOrderCount || item.completedOrders || 0,
          genderText: this.formatChefGender(rawGender),
          ageText: this.formatChefAge(rawAge),
          cuisines,
          serviceAreaText: areas.length ? areas.join('、') : '',
          recommended: this.isRecommendedChef(item.recommended, item.recommendFlag, item.isRecommended)
        }
      },
      formatChefGender(value) {
        const text = String(value === undefined || value === null ? '' : value).trim()
        if (!text) return ''
        const normalized = text.toLowerCase()
        if (['0', 'male', 'man', 'm', '男'].includes(normalized) || text === '男') return '男'
        if (['1', 'female', 'woman', 'f', '女'].includes(normalized) || text === '女') return '女'
        if (['2', 'other', 'unknown', '其他', '未知'].includes(normalized) || text === '其他' || text === '未知') return '其他'
        return text
      },
      formatChefAge(value) {
        if (value === undefined || value === null || value === '') return ''
        const age = Number(value)
        if (Number.isFinite(age) && age > 0) {
          return `${Math.round(age)}岁`
        }
        const text = String(value).trim()
        if (!text) return ''
        return text.endsWith('岁') ? text : `${text}岁`
      },
      isRecommendedChef(...values) {
        return values.some(value => {
          if (value === true || value === 1) return true
          const text = String(value === undefined || value === null ? '' : value).trim().toLowerCase()
          return ['1', 'true', 'y', 'yes'].includes(text)
        })
      },
      toArray(value) {
        if (!value) return []
        if (Array.isArray(value)) return value.filter(Boolean)
        return String(value).split(/[、,，\s]+/).filter(Boolean)
      },
      formatMoney(value) {
        const amount = Number(value)
        if (!Number.isFinite(amount)) return '¥0.00'
        return `¥${amount.toFixed(2)}`
      },
      formatCount(value) {
        const count = Number(value)
        if (!Number.isFinite(count)) return 0
        return count
      },
      alertToneClass(tone) {
        const value = String(tone || '').toLowerCase()
        if (value === 'danger' || value === 'error') return 'danger'
        if (value === 'success') return 'success'
        return 'warning'
      },
      onRevenueCardTap(item) {
        if (item && item.action === 'commission') {
          this.goCommission()
        }
      },
      goCommission() {
        if (!this.isCurrentChef) return
        this.requireLogin('/pages/work/commission')
      },
      toggleTakingOrders() {
        if (this.statusSwitching) return
        const wasTakingOrders = this.isTakingOrders
        if (wasTakingOrders) {
          uni.showModal({
            title: '暂停接单',
            content: '暂停后将不会收到新的预约订单，确认暂停吗？',
            cancelText: '取消',
            confirmText: '确认暂停',
            success: (res) => {
              if (res.confirm) {
                this.doToggle(wasTakingOrders)
              }
            }
          })
        } else {
          this.doToggle(wasTakingOrders)
        }
      },
      doToggle(wasTakingOrders) {
        this.statusSwitching = true
        const action = wasTakingOrders ? pauseChef : resumeChef
        action({}).then(() => {
          this.$modal.msg(wasTakingOrders ? '已暂停接单' : '已恢复接单')
          return this.loadCurrentChef().then(() => this.loadChefWorkbench())
        }).catch(() => {
          this.$modal.msg('接单状态切换失败，请稍后再试')
        }).finally(() => {
          this.statusSwitching = false
        })
      },
      openChef(chef) {
        if (!chef.id) {
          this.$modal.msg('人员信息缺少编号，暂不能预约')
          return
        }
        this.$tab.navigateTo(`/pages/user/chef-detail?id=${chef.id}`)
      },
      requireLogin(nextUrl) {
        if (!getToken()) {
          this.$modal.msg('请先登录后继续')
          this.$tab.navigateTo('/pages/login')
          return
        }
        this.$tab.navigateTo(nextUrl)
      },
      goAddress() {
        this.requireLogin('/pages/user/address')
      },
      goOrders() {
        this.requireLogin(chefStatus.resolveOrderPage(this.chefProfile))
      }
    }
  }
</script>

<style lang="scss" scoped>
  page {
    background: #fff7f0;
  }

  .cook-home {
    min-height: 100vh;
    padding-bottom: 40rpx;
    background: #fff7f0;
  }

  .hero {
    padding: 72rpx 32rpx 36rpx;
    color: #fff;
    background: linear-gradient(135deg, #f05d3c 0%, #f58a4b 58%, #ffc46b 100%);
  }

  .hero-top {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 24rpx;
  }

  .title {
    max-width: 520rpx;
    font-size: 44rpx;
    line-height: 1.25;
    font-weight: 700;
  }

  .search-panel {
    margin-top: 34rpx;
    padding: 22rpx;
    border-radius: 12rpx;
    background: rgba(255, 255, 255, .96);
    box-shadow: 0 12rpx 32rpx rgba(114, 59, 24, .14);
  }

  .search-row,
  .filter-row {
    display: flex;
    align-items: center;
    gap: 16rpx;
  }

  .search-row {
    padding: 0 4rpx 18rpx;
    border-bottom: 1rpx solid #f1e7de;
  }

  .search-row input {
    flex: 1;
    height: 54rpx;
    color: #26332e;
    font-size: 28rpx;
  }

  .filter-row {
    padding-top: 18rpx;
  }

  .meal-period-row {
    display: flex;
    flex-wrap: wrap;
    gap: 12rpx;
    padding-top: 18rpx;
  }

  .region-picker {
    min-width: 0;
    flex: 1;
  }

  .region-select {
    display: flex;
    align-items: center;
    justify-content: space-between;
    height: 54rpx;
    gap: 12rpx;
  }

  .region-value {
    min-width: 0;
    flex: 1;
    color: #26332e;
    font-size: 28rpx;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .region-value.placeholder {
    color: #999;
  }

  .filter-row button {
    width: 120rpx;
    height: 56rpx;
    line-height: 56rpx;
    padding: 0;
    border-radius: 8rpx;
    color: #fff;
    font-size: 26rpx;
    background: #f06a3a;
  }

  .meal-period-option {
    min-width: 112rpx;
    height: 52rpx;
    line-height: 52rpx;
    padding: 0 20rpx;
    border-radius: 8rpx;
    color: #7b8580;
    text-align: center;
    font-size: 24rpx;
    background: #f6efe8;
  }

  .meal-period-option.active {
    color: #f06a3a;
    background: #fff0e8;
  }

  .quick-actions {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 18rpx;
    padding: 24rpx 32rpx 8rpx;
  }

  .hero-actions {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 20rpx;
    padding: 30rpx 0 6rpx;
  }

  .hero-actions .quick-item {
    height: 124rpx;
    background: rgba(255, 255, 255, .92);
    box-shadow: 0 10rpx 24rpx rgba(114, 59, 24, .12);
  }

  .quick-item {
    height: 122rpx;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 12rpx;
    border-radius: 8rpx;
    background: #fff;
    color: #2f3532;
    font-size: 24rpx;
  }


  .chef-dashboard {
    padding: 22rpx 32rpx 4rpx;
  }

  .dashboard-card {
    border-radius: 8rpx;
    background: #fff;
    box-shadow: 0 8rpx 28rpx rgba(31, 41, 37, .06);
  }

  .status-card {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 20rpx;
    padding: 28rpx;
    color: #7a351b;
    background: linear-gradient(135deg, #fff2e4 0%, #ffe1c8 100%);
  }

  .status-label {
    color: #b86a2f;
    font-size: 24rpx;
  }

  .status-title {
    margin-top: 8rpx;
    color: #4a2516;
    font-size: 36rpx;
    font-weight: 700;
  }


  .status-button {
    width: 176rpx;
    height: 68rpx;
    line-height: 68rpx;
    padding: 0;
    flex-shrink: 0;
    border-radius: 8rpx;
    color: #fff;
    font-size: 26rpx;
    background: #e85d34;
  }

  .status-button.paused {
    background: #2f7d58;
  }

  .dashboard-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 30rpx 0 18rpx;
  }

  .dashboard-head.inner {
    padding: 0 0 20rpx;
  }

  .dashboard-title {
    color: #1d2b26;
    font-size: 32rpx;
    font-weight: 700;
  }

  .dashboard-link {
    color: #f06a3a;
    font-size: 26rpx;
  }

  .revenue-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 18rpx;
  }

  .revenue-card {
    min-height: 128rpx;
    display: flex;
    flex-direction: column;
    justify-content: center;
    padding: 24rpx;
    border-radius: 8rpx;
    background: #fff;
    box-shadow: 0 8rpx 28rpx rgba(31, 41, 37, .06);
  }

  .revenue-card.clickable {
    position: relative;
    border: 2rpx solid rgba(240, 106, 58, .18);
    background: linear-gradient(135deg, #fff 0%, #fff4e7 100%);
  }

  .revenue-label,
  .revenue-extra {
    color: #7b8580;
    font-size: 24rpx;
  }

  .revenue-value {
    margin-top: 10rpx;
    color: #17231f;
    font-size: 34rpx;
    font-weight: 700;
  }

  .revenue-extra {
    margin-top: 8rpx;
  }

  .alerts-card,
  .trend-card {
    margin-top: 22rpx;
    padding: 26rpx;
  }

  .empty-alert {
    padding: 28rpx 0;
    color: #8a8f98;
    text-align: center;
    font-size: 26rpx;
  }

  .alert-list {
    display: flex;
    flex-direction: column;
    gap: 16rpx;
  }

  .alert-item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 18rpx;
    padding: 20rpx;
    border-radius: 8rpx;
    background: #fff8e8;
    border-left: 6rpx solid #f0a83a;
  }

  .alert-item.danger {
    background: #fff0ee;
    border-left-color: #e25545;
  }

  .alert-item.success {
    background: #edf8f1;
    border-left-color: #2f9b68;
  }

  .alert-main {
    min-width: 0;
    flex: 1;
  }

  .alert-title {
    color: #25302c;
    font-size: 28rpx;
    font-weight: 700;
  }

  .alert-content {
    margin-top: 8rpx;
    color: #7b8580;
    font-size: 24rpx;
    line-height: 1.45;
  }

  .alert-count {
    min-width: 48rpx;
    height: 48rpx;
    line-height: 48rpx;
    border-radius: 24rpx;
    color: #fff;
    text-align: center;
    font-size: 24rpx;
    background: #e85d34;
  }

  .trend-list {
    display: flex;
    flex-direction: column;
    gap: 18rpx;
  }

  .trend-item {
    display: grid;
    grid-template-columns: 112rpx minmax(0, 1fr) 128rpx;
    align-items: center;
    gap: 16rpx;
  }

  .trend-label,
  .trend-amount {
    color: #66716c;
    font-size: 24rpx;
  }

  .trend-label {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .trend-amount {
    text-align: right;
  }

  .trend-track {
    height: 18rpx;
    overflow: hidden;
    border-radius: 8rpx;
    background: #f0e7dd;
  }

  .trend-bar {
    height: 18rpx;
    border-radius: 8rpx;
    background: linear-gradient(90deg, #f06a3a 0%, #f4ad54 100%);
  }

  .section-head {
    padding: 32rpx 32rpx 16rpx;
    text-align: center;
  }

  .section-title {
    display: block;
    color: #1d2b26;
    font-size: 32rpx;
    font-weight: 700;
  }

  .state-box {
    margin: 24rpx 32rpx;
    padding: 52rpx 28rpx;
    border-radius: 8rpx;
    color: #7b8580;
    text-align: center;
    background: #fff;
  }

  .chef-list {
    padding: 0 32rpx;
  }

  .chef-card {
    display: flex;
    gap: 22rpx;
    padding: 24rpx;
    margin-bottom: 20rpx;
    border-radius: 8rpx;
    background: #fff;
    box-shadow: 0 8rpx 28rpx rgba(31, 41, 37, .06);
  }

  .avatar {
    width: 136rpx;
    height: 136rpx;
    border-radius: 8rpx;
    background: #f2f2f2;
    flex-shrink: 0;
  }

  .chef-main {
    min-width: 0;
    flex: 1;
  }

  .chef-line,
  .meta-row,
  .tag-row,
  .area-row {
    display: flex;
    align-items: center;
  }

  .chef-line {
    justify-content: space-between;
    gap: 16rpx;
  }

  .chef-name {
    color: #18231f;
    font-size: 32rpx;
    font-weight: 700;
  }

  .recommend-tag {
    padding: 6rpx 12rpx;
    border-radius: 6rpx;
    color: #f06a3a;
    background: #fff0e8;
    font-size: 22rpx;
  }

  .meta-row {
    gap: 24rpx;
    margin-top: 12rpx;
    color: #69736e;
    font-size: 24rpx;
  }

  .tag-row {
    flex-wrap: wrap;
    gap: 10rpx;
    margin-top: 14rpx;
  }

  .tag {
    padding: 6rpx 12rpx;
    border-radius: 6rpx;
    color: #2f7d58;
    background: #eaf7f0;
    font-size: 22rpx;
  }

  .area-row {
    gap: 6rpx;
    margin-top: 14rpx;
    color: #8a8f98;
    font-size: 24rpx;
  }
</style>
