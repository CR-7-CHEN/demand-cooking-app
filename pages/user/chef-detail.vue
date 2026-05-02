<template>
  <view class="page">
    <view class="chef-hero">
      <image class="avatar" :src="chef.avatar" mode="aspectFill"></image>
      <view class="chef-info">
        <view class="name-row">
          <text class="name">{{ chef.name }}</text>
          <text v-if="chef.recommended" class="badge">推荐</text>
        </view>
        <view class="summary">评分 {{ chef.rating }} · 完成 {{ chef.completedCount }} 单</view>
        <view class="tags">
          <text v-for="item in chef.cuisines" :key="item" class="tag">{{ item }}</text>
        </view>
        <view class="area">服务区域：{{ chef.serviceAreaText }}</view>
      </view>
    </view>

    <view class="card">
      <view class="card-title">做饭人员介绍</view>
      <view class="desc">{{ chef.description || '这位做饭人员还没有填写详细介绍，可先根据评分、菜系和服务区域判断是否适合。' }}</view>
    </view>

    <view class="card">
      <view class="card-head">
        <view class="card-title">预约信息</view>
        <button class="text-btn" @click="goAddress">管理地址</button>
      </view>

      <picker :range="addressOptions" @change="selectAddress">
        <view class="select-box">
          <view v-if="selectedAddress">
            <view class="select-title">{{ selectedAddress.contactName }} {{ selectedAddress.phone }}</view>
            <view class="select-sub">{{ selectedAddress.fullAddress }}</view>
          </view>
          <view v-else class="placeholder">请选择上门地址</view>
          <uni-icons type="right" size="16" color="#9aa19c"></uni-icons>
        </view>
      </picker>

      <view class="form-row">
        <view class="label">上门日期</view>
        <picker mode="date" :start="today" :end="maxDate" :value="form.date" @change="changeDate">
          <view class="picker-value">{{ form.date || '选择未来 3 天内日期' }}</view>
        </picker>
      </view>
      <view class="form-row">
        <view class="label">上门时间</view>
        <picker mode="time" :value="form.time" @change="changeTime">
          <view class="picker-value">{{ form.time || '选择整点/半点或自定义时间' }}</view>
        </picker>
      </view>
      <view class="hint">系统会从上门开始时间起锁定 3 小时，食材默认由用户自备。</view>
    </view>

    <view class="card">
      <view class="card-title">菜品需求</view>
      <view v-if="dishes.length" class="dish-list">
        <checkbox-group @change="changeDishes">
          <label v-for="dish in dishes" :key="dish.id" class="dish-item">
            <checkbox :value="String(dish.id)" :checked="selectedDishIds.indexOf(String(dish.id)) !== -1" color="#f06a3a" />
            <view>
              <view class="dish-name">{{ dish.name }}</view>
              <view class="dish-meta">{{ dish.category }} {{ dish.cuisine }}</view>
            </view>
          </label>
        </checkbox-group>
      </view>
      <view v-else class="empty">暂无菜品库，可填写自定义菜名。</view>

      <textarea v-model="form.customDish" class="textarea" placeholder="自定义菜名，如番茄牛腩、清炒时蔬"></textarea>
      <textarea v-model="form.tasteRemark" class="textarea" placeholder="口味备注，如少辣、不放香菜"></textarea>
      <textarea v-model="form.materialRemark" class="textarea" placeholder="食材和厨具备注，如牛肉已备好、没有葱姜蒜"></textarea>
    </view>

    <view class="bottom-bar">
      <button class="submit-btn" :disabled="submitting" @click="submit">提交预约</button>
    </view>
  </view>
</template>

<script>
  import { getToken } from '@/utils/auth'
  import { getChef, listAddresses, listDishes, submitOrder } from '@/api/cooking/user'

  const defaultAvatar = '/static/images/profile.jpg'

  export default {
    data() {
      const now = new Date()
      return {
        chefId: '',
        chef: {
          avatar: defaultAvatar,
          name: '做饭人员',
          cuisines: [],
          serviceAreaText: ''
        },
        addresses: [],
        selectedAddressIndex: -1,
        dishes: [],
        selectedDishIds: [],
        today: this.formatDate(now),
        maxDate: this.formatDate(new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000)),
        form: {
          date: '',
          time: '',
          customDish: '',
          tasteRemark: '',
          materialRemark: ''
        },
        submitting: false
      }
    },
    computed: {
      selectedAddress() {
        return this.selectedAddressIndex >= 0 ? this.addresses[this.selectedAddressIndex] : null
      },
      addressOptions() {
        if (!this.addresses.length) return ['暂无地址，请先新增']
        return this.addresses.map(item => item.fullAddress)
      }
    },
    onLoad(option) {
      this.chefId = option.id || ''
      this.loadPage()
    },
    onShow() {
      if (this.chefId) this.loadAddresses()
    },
    methods: {
      loadPage() {
        this.loadChef()
        this.loadAddresses()
        this.loadDishes()
      },
      loadChef() {
        if (!this.chefId) return
        getChef(this.chefId).then(res => {
          const data = res.data || res.chef || res
          this.chef = this.normalizeChef(data)
        })
      },
      loadAddresses() {
        listAddresses().then(res => {
          this.addresses = this.pickList(res).map(this.normalizeAddress)
          const defaultIndex = this.addresses.findIndex(item => item.isDefault)
          this.selectedAddressIndex = defaultIndex >= 0 ? defaultIndex : (this.addresses.length ? 0 : -1)
        }).catch(() => {
          this.addresses = []
          this.selectedAddressIndex = -1
        })
      },
      loadDishes() {
        listDishes().then(res => {
          this.dishes = this.pickList(res).map(this.normalizeDish)
        }).catch(() => {
          this.dishes = []
        })
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
          id: item.id || item.chefId || this.chefId,
          name: item.name || item.chefName || item.realName || '做饭人员',
          avatar: item.avatar || item.avatarUrl || item.photo || defaultAvatar,
          rating: item.rating || item.score || '5.0',
          completedCount: item.completedCount || item.completeCount || item.orderCount || item.finishedOrderCount || 0,
          cuisines,
          serviceAreaText: areas.length ? areas.join('、') : '服务区域待完善',
          recommended: item.recommended || item.recommendFlag || item.isRecommended,
          description: item.description || item.introduction || item.profile || item.remark || ''
        }
      },
      normalizeAddress(item) {
        const region = item.region || item.area || item.district || ''
        const detail = item.detailAddress || item.address || item.detail || ''
        const house = item.houseNumber || item.doorNo || item.houseNo || ''
        return {
          id: item.id || item.addressId,
          contactName: item.contactName || item.name || item.receiver || '联系人',
          phone: item.phone || item.mobile || item.contactPhone || '',
          region,
          detailAddress: detail,
          houseNumber: house,
          fullAddress: [region, detail, house].filter(Boolean).join(' '),
          isDefault: item.isDefault || item.defaultFlag
        }
      },
      normalizeDish(item) {
        return {
          id: item.id || item.dishId,
          name: item.name || item.dishName || '菜品',
          category: item.category || item.categoryName || '',
          cuisine: item.cuisine || item.cuisineName || ''
        }
      },
      toArray(value) {
        if (!value) return []
        if (Array.isArray(value)) return value.filter(Boolean)
        return String(value).split(/[、,，\s]+/).filter(Boolean)
      },
      selectAddress(e) {
        if (!this.addresses.length) {
          this.goAddress()
          return
        }
        this.selectedAddressIndex = Number(e.detail.value)
      },
      changeDate(e) {
        this.form.date = e.detail.value
      },
      changeTime(e) {
        this.form.time = e.detail.value
      },
      changeDishes(e) {
        this.selectedDishIds = e.detail.value || []
      },
      formatDate(date) {
        const month = String(date.getMonth() + 1).padStart(2, '0')
        const day = String(date.getDate()).padStart(2, '0')
        return `${date.getFullYear()}-${month}-${day}`
      },
      buildStartTime() {
        if (!this.form.date || !this.form.time) return ''
        return `${this.form.date} ${this.form.time}:00`
      },
      validateTime(startText) {
        const start = new Date(startText.replace(/-/g, '/')).getTime()
        const now = Date.now()
        const max = now + 3 * 24 * 60 * 60 * 1000
        if (!start || start <= now) {
          this.$modal.msg('上门开始时间必须晚于当前时间')
          return false
        }
        if (start > max) {
          this.$modal.msg('最多只能预约未来 3 天内的时间')
          return false
        }
        return true
      },
      submit() {
        if (!getToken()) {
          this.$modal.msg('提交预约前请先登录')
          this.$tab.navigateTo('/pages/login')
          return
        }
        if (!this.selectedAddress) {
          this.$modal.msg('请选择上门地址')
          return
        }
        const startTime = this.buildStartTime()
        if (!this.validateTime(startTime)) return
        const selectedDishes = this.dishes.filter(item => this.selectedDishIds.indexOf(String(item.id)) !== -1)
        if (!selectedDishes.length && !this.form.customDish.trim()) {
          this.$modal.msg('请选择菜品或填写自定义菜名')
          return
        }
        const startMs = new Date(startTime.replace(/-/g, '/')).getTime()
        const endTime = this.formatDateTime(new Date(startMs + 3 * 60 * 60 * 1000))
        const payload = {
          chefId: this.chef.id || this.chefId,
          addressId: this.selectedAddress.id,
          appointmentStartTime: startTime,
          appointmentEndTime: endTime,
          dishIds: selectedDishes.map(item => item.id),
          dishes: selectedDishes,
          customDishNames: this.form.customDish,
          tasteRemark: this.form.tasteRemark,
          materialRemark: this.form.materialRemark,
          addressSnapshot: this.selectedAddress
        }
        this.submitting = true
        submitOrder(payload).then(res => {
          const data = res.data || res
          const orderId = data.id || data.orderId
          this.$modal.msgSuccess('预约已提交')
          if (orderId) {
            this.$tab.redirectTo(`/pages/user/order-detail?id=${orderId}`)
          } else {
            this.$tab.redirectTo('/pages/user/orders')
          }
        }).finally(() => {
          this.submitting = false
        })
      },
      formatDateTime(date) {
        const month = String(date.getMonth() + 1).padStart(2, '0')
        const day = String(date.getDate()).padStart(2, '0')
        const hour = String(date.getHours()).padStart(2, '0')
        const minute = String(date.getMinutes()).padStart(2, '0')
        return `${date.getFullYear()}-${month}-${day} ${hour}:${minute}:00`
      },
      goAddress() {
        this.$tab.navigateTo('/pages/user/address')
      }
    }
  }
</script>

<style lang="scss" scoped>
  page,
  .page {
    min-height: 100vh;
    background: #f7f8f5;
  }

  .page {
    padding: 24rpx 24rpx 150rpx;
  }

  .chef-hero,
  .card {
    border-radius: 8rpx;
    background: #fff;
    box-shadow: 0 8rpx 26rpx rgba(31, 41, 37, .06);
  }

  .chef-hero {
    display: flex;
    gap: 24rpx;
    padding: 28rpx;
  }

  .avatar {
    width: 156rpx;
    height: 156rpx;
    border-radius: 8rpx;
    background: #eee;
    flex-shrink: 0;
  }

  .chef-info {
    min-width: 0;
    flex: 1;
  }

  .name-row,
  .card-head,
  .select-box,
  .form-row {
    display: flex;
    align-items: center;
  }

  .name-row,
  .card-head,
  .select-box,
  .form-row {
    justify-content: space-between;
  }

  .name {
    color: #1d2b26;
    font-size: 36rpx;
    font-weight: 700;
  }

  .badge {
    padding: 6rpx 12rpx;
    border-radius: 6rpx;
    color: #f06a3a;
    background: #fff0e8;
    font-size: 22rpx;
  }

  .summary,
  .area,
  .desc,
  .hint,
  .empty,
  .select-sub,
  .dish-meta {
    color: #747d78;
    font-size: 24rpx;
    line-height: 1.6;
  }

  .summary,
  .area,
  .tags {
    margin-top: 12rpx;
  }

  .tags {
    display: flex;
    flex-wrap: wrap;
    gap: 10rpx;
  }

  .tag {
    padding: 6rpx 12rpx;
    border-radius: 6rpx;
    color: #2f7d58;
    background: #eaf7f0;
    font-size: 22rpx;
  }

  .card {
    margin-top: 20rpx;
    padding: 28rpx;
  }

  .card-title {
    color: #1d2b26;
    font-size: 30rpx;
    font-weight: 700;
  }

  .text-btn {
    width: 132rpx;
    height: 52rpx;
    line-height: 52rpx;
    padding: 0;
    border-radius: 8rpx;
    color: #f06a3a;
    background: #fff0e8;
    font-size: 24rpx;
  }

  .select-box {
    min-height: 106rpx;
    margin-top: 22rpx;
    padding: 18rpx;
    border: 1rpx solid #edf0ec;
    border-radius: 8rpx;
    background: #fbfcfa;
  }

  .select-title,
  .picker-value,
  .dish-name {
    color: #26322d;
    font-size: 28rpx;
  }

  .placeholder {
    color: #9aa19c;
    font-size: 28rpx;
  }

  .form-row {
    min-height: 88rpx;
    border-bottom: 1rpx solid #f0f2ef;
  }

  .label {
    color: #4e5a55;
    font-size: 28rpx;
  }

  .picker-value {
    min-width: 280rpx;
    text-align: right;
  }

  .hint {
    margin-top: 18rpx;
  }

  .dish-list {
    margin-top: 18rpx;
  }

  .dish-item {
    display: flex;
    align-items: center;
    gap: 16rpx;
    min-height: 76rpx;
    border-bottom: 1rpx solid #f0f2ef;
  }

  .textarea {
    width: 100%;
    min-height: 132rpx;
    box-sizing: border-box;
    margin-top: 18rpx;
    padding: 18rpx;
    border-radius: 8rpx;
    color: #26322d;
    background: #fbfcfa;
    font-size: 26rpx;
  }

  .bottom-bar {
    position: fixed;
    left: 0;
    right: 0;
    bottom: 0;
    padding: 20rpx 24rpx 34rpx;
    background: #fff;
    box-shadow: 0 -8rpx 24rpx rgba(31, 41, 37, .08);
  }

  .submit-btn {
    height: 88rpx;
    line-height: 88rpx;
    border-radius: 8rpx;
    color: #fff;
    background: #f06a3a;
    font-size: 30rpx;
    font-weight: 700;
  }
</style>
