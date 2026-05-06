<template>
  <view class="cook-home">
    <view class="hero">
      <view class="hero-top">
        <view>
          <view class="title">把一餐家常饭交给可靠的人</view>
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
      </view>
    </view>

    <view class="quick-actions">
      <view v-if="!isCurrentChef" class="quick-item" @click="goAddress">
        <uni-icons type="location-filled" size="24" color="#f06a3a"></uni-icons>
        <text>地址管理</text>
      </view>
      <view class="quick-item" @click="goOrders">
        <uni-icons type="calendar-filled" size="24" color="#20a779"></uni-icons>
        <text>我的订单</text>
      </view>
      <view v-if="showChefRecommendations" class="quick-item" @click="loadChefs">
        <uni-icons type="refresh" size="24" color="#2f7d58"></uni-icons>
        <text>刷新推荐</text>
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
            <text>评分 {{ chef.rating }}</text>
            <text>{{ chef.completedCount }} 单</text>
          </view>
          <view class="tag-row">
            <text v-for="item in chef.cuisines" :key="item" class="tag">{{ item }}</text>
          </view>
          <view class="area-row">
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
  import { getChefMy } from '@/api/cooking/chef'
  import regionData from '@/utils/region-data'
  const chefStatus = require('@/utils/chef-status')

  const defaultAvatar = '/static/images/profile.jpg'

  export default {
    data() {
      return {
        loading: false,
        query: {
          keyword: '',
          serviceArea: ''
        },
        serviceAreaLabel: '',
        regionValue: [],
        regionIndex: [0, 0, 0],
        regionColumns: [[], [], []],
        regionPickerOpen: false,
        chefProfile: {},
        chefs: []
      }
    },
    computed: {
      isCurrentChef() {
        return chefStatus.isChefWorkbenchAvailable(this.chefProfile)
      },
      showChefRecommendations() {
        return chefStatus.shouldShowChefRecommendations(this.chefProfile)
      }
    },
    onLoad() {
      this.initRegionPicker()
      this.loadPage()
    },
    methods: {
      loadPage() {
        return this.loadCurrentChef().finally(() => this.loadChefs())
      },
      loadCurrentChef() {
        if (!getToken()) {
          this.chefProfile = {}
          return Promise.resolve()
        }
        return getChefMy().then(res => {
          this.chefProfile = this.unwrap(res) || {}
        }).catch(() => {
          this.chefProfile = {}
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
          serviceArea: this.query.serviceArea
        }).then(res => {
          this.chefs = this.pickList(res).map(this.normalizeChef)
        }).catch(() => {
          this.chefs = []
        }).finally(() => {
          this.loading = false
        })
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
      normalizeChef(item) {
        const cuisines = this.toArray(item.cuisines || item.cuisine || item.specialties || item.goodAt)
        const areas = this.toArray(item.serviceAreas || item.serviceArea || item.serviceAreaNames || item.area)
        return {
          raw: item,
          id: item.id || item.chefId || item.userChefId,
          name: item.name || item.chefName || item.realName || '做饭人员',
          avatar: item.avatar || item.avatarUrl || item.photo || defaultAvatar,
          rating: item.rating || item.score || '5.0',
          completedCount: item.completedCount || item.completeCount || item.orderCount || item.finishedOrderCount || 0,
          cuisines,
          serviceAreaText: areas.length ? areas.join('、') : '服务区域待完善',
          recommended: item.recommended || item.recommendFlag || item.isRecommended
        }
      },
      toArray(value) {
        if (!value) return []
        if (Array.isArray(value)) return value.filter(Boolean)
        return String(value).split(/[、,，\s]+/).filter(Boolean)
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

  .quick-actions {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 18rpx;
    padding: 24rpx 32rpx 8rpx;
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

  .section-head {
    padding: 28rpx 32rpx 12rpx;
    text-align: center;
  }

  .section-title {
    display: block;
    color: #1d2b26;
    font-size: 34rpx;
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
