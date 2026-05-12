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
        <view class="area">{{ chef.serviceAreaText }}</view>
      </view>
    </view>

    <view class="card">
      <view class="card-title">服务厨师介绍</view>
      <view class="desc">{{ chef.description || '这位服务厨师还没有填写详细介绍，可以先根据评分、菜系和服务区域判断是否适合。' }}</view>
    </view>

    <view v-if="chef.workImages && chef.workImages.length" class="card">
      <view class="card-title">作品展示</view>
      <view class="work-gallery">
        <image
          v-for="(img, idx) in chef.workImages"
          :key="idx"
          class="work-img"
          :src="img"
          mode="aspectFill"
          @click="previewWorkImage(idx)"
        ></image>
      </view>
    </view>

    <view v-if="chef.healthCertExpireText" class="card">
      <view class="card-title">资质信息</view>
      <view class="info-row">
        <text class="info-label">健康证到期</text>
        <text :class="['info-value', chef.healthCertExpired ? 'info-value--warn' : '']">{{ chef.healthCertExpireText }}</text>
      </view>
    </view>

    <view class="card">
      <view class="card-title">预约参考</view>
      <view class="info-row info-row--link" @click="openAvailableTimePopup">
        <text class="info-label">可预约时间</text>
        <view class="info-action">
          <text class="info-value info-value--action">点击查看</text>
          <uni-icons type="right" size="16" color="#9aa19c"></uni-icons>
        </view>
      </view>
      <view class="info-row">
        <text class="info-label">价格预估</text>
        <text class="info-value">{{ chef.priceEstimateText }}</text>
      </view>
    </view>

    <view class="card">
      <view class="card-head">
        <view class="card-title">预约信息</view>
        <button class="text-btn" @click="goAddress">选择地址</button>
      </view>

      <view v-if="addresses.length" class="select-box">
        <view v-if="selectedAddress">
          <view class="select-title">{{ selectedAddress.contactName }} {{ selectedAddress.phone }}</view>
          <view class="select-sub">{{ selectedAddress.fullAddress }}</view>
        </view>
        <view v-else class="placeholder">请选择上门地址</view>
      </view>
      <view v-else class="select-box address-empty" @click="goAddress">
        <view>
          <view class="select-title">暂无上门地址</view>
          <view class="select-sub">请先新增地址后再提交预约</view>
        </view>
        <uni-icons type="right" size="16" color="#9aa19c"></uni-icons>
      </view>

      <view class="form-row">
        <view class="label">上门日期</view>
        <picker :range="bookingDateOptions" :value="bookingDateIndex" @change="changeBookingDate">
          <view class="picker-value">{{ form.date || '选择可预约日期' }}</view>
        </picker>
      </view>
      <view class="form-row">
        <view class="label">上门时间</view>
        <picker :range="bookingTimeOptions" :value="bookingTimeIndex" @change="changeBookingTime">
          <view class="picker-value">{{ form.time || '选择可预约开始时间' }}</view>
        </picker>
      </view>
    </view>

    <view class="card">
      <view class="card-head card-head--toggle" hover-class="card-head--hover" :hover-stay-time="150" @click="dishExpanded = !dishExpanded">
        <view class="card-title">菜品需求</view>
        <view class="toggle-arrow">
          <uni-icons :type="dishExpanded ? 'up' : 'down'" size="18" color="#9aa19c"></uni-icons>
        </view>
      </view>
      <view v-show="dishExpanded">
        <view v-if="dishes.length" class="dish-list">
          <view
            v-for="dish in dishes"
            :key="dish.id"
            class="dish-item"
            :class="{ 'is-selected': isDishSelected(dish.id) }"
            @tap="toggleDishSelection(dish)"
          >
            <checkbox
              :value="String(dish.id)"
              :checked="isDishSelected(dish.id)"
              color="#f06a3a"
              @tap.stop="toggleDishSelection(dish)"
            />
            <view>
              <view class="dish-name">{{ dish.name }}</view>
              <view class="dish-meta">{{ dish.category }} {{ dish.cuisine }}</view>
            </view>
          </view>
        </view>
        <view v-else class="empty">暂无菜品库，可填写自定义菜名。</view>
      </view>

      <textarea v-model="form.customDish" class="textarea" placeholder="自定义菜名，如番茄牛腩、清炒时蔬"></textarea>
      <textarea v-model="form.tasteRemark" class="textarea" placeholder="口味备注，如少辣、不放香菜"></textarea>
      <textarea v-model="form.materialRemark" class="textarea" placeholder="食材和厨具备注，如牛肉已备好、没有葱姜蒜"></textarea>
    </view>

    <view class="bottom-bar">
      <button class="submit-btn" :class="{ 'is-disabled': submitting }" :loading="submitting" :disabled="submitting" @click="submit">
        {{ submitting ? '提交中...' : '提交预约' }}
      </button>
    </view>

    <uni-popup ref="availableTimePopup" type="dialog">
      <view class="time-dialog">
        <view class="time-dialog__title">可预约时间</view>
        <view class="time-dialog__content">
          <view v-for="item in availableTimeLines" :key="item" class="time-dialog__line">{{ item }}</view>
        </view>
        <button class="time-dialog__btn" @click="closeAvailableTimePopup">知道了</button>
      </view>
    </uni-popup>
  </view>
</template>

<script>
  import { getToken } from '@/utils/auth'
  import { getChef, listAddresses, listDishes, submitOrder } from '@/api/cooking/user'

  const defaultAvatar = '/static/images/profile.jpg'

  export default {
    data() {
      return {
        chefId: '',
        chef: {
          avatar: defaultAvatar,
          name: '服务厨师',
          cuisines: [],
          serviceAreaText: '',
          availableTimeText: '可预约时间待确认',
          priceEstimateText: '价格待报价，以报价为准'
        },
        addresses: [],
        selectedAddressIndex: -1,
        dishes: [],
        selectedDishIds: [],
        bookingStartOptions: [],
        form: {
          date: '',
          time: '',
          customDish: '',
          tasteRemark: '',
          materialRemark: ''
        },
        submitting: false,
        dishExpanded: false
      }
    },
    computed: {
      selectedAddress() {
        return this.selectedAddressIndex >= 0 ? this.addresses[this.selectedAddressIndex] : null
      },
      availableTimeLines() {
        return this.buildAvailableTimeLines(this.chef.availableTimes, this.chef.availableTimeText)
      },
      bookingDateOptions() {
        return Array.from(new Set(this.bookingStartOptions.map(item => item.date)))
      },
      bookingDateIndex() {
        const index = this.bookingDateOptions.indexOf(this.form.date)
        return index > -1 ? index : 0
      },
      bookingTimeOptions() {
        return this.bookingStartOptions
          .filter(item => item.date === this.form.date)
          .map(item => item.time)
      },
      bookingTimeIndex() {
        const index = this.bookingTimeOptions.indexOf(this.form.time)
        return index > -1 ? index : 0
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
          this.syncBookingStartOptions()
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
      pickChefRating(item) {
        const rating = item.rating
        if (rating !== undefined && rating !== null && rating !== '') return rating
        const score = item.score
        if (score !== undefined && score !== null && score !== '') return score
        return '5.0'
      },
      normalizeChef(item) {
        const cuisines = this.toArray(item.cuisines || item.cuisine || item.specialties || item.goodAt)
        const areas = this.toArray(item.serviceAreas || item.serviceArea || item.serviceAreaNames || item.area)
        const availableTimes = this.normalizeAvailableTimes(item)
        return {
          id: item.id || item.chefId || this.chefId,
          name: item.name || item.chefName || item.realName || '服务厨师',
          avatar: item.avatar || item.avatarUrl || item.photo || defaultAvatar,
          rating: this.pickChefRating(item),
          completedCount: item.completedCount || item.completeCount || item.orderCount || item.finishedOrderCount || 0,
          cuisines,
          serviceAreaText: areas.length ? areas.join('、') : '',
          recommended: item.recommended || item.recommendFlag || item.isRecommended,
          description: item.intro || item.description || item.introduction || item.profile || item.remark || '',
          workImages: this.parseWorkImages(item),
          healthCertExpireText: this.formatHealthCertExpire(item),
          healthCertExpired: this.isHealthCertExpired(item),
          availableTimes,
          availableTimeText: this.formatAvailableTime(item),
          priceEstimateText: this.formatPriceEstimate(item)
        }
      },
      normalizeAvailableTimes(item) {
        const keys = ['availableTimes', 'availableTimeList', 'serviceTimes', 'serviceTimeList', 'workTimes']
        for (let i = 0; i < keys.length; i += 1) {
          const value = item && item[keys[i]]
          if (Array.isArray(value)) {
            return value
              .map(time => this.normalizeAvailableTimeItem(time))
              .filter(time => time.startTime && time.endTime)
          }
        }
        return []
      },
      normalizeAvailableTimeItem(item) {
        if (!item || typeof item !== 'object') {
          return { startTime: '', endTime: '', status: '0' }
        }
        return {
          startTime: this.firstValue(item, ['startTime', 'serviceStartTime', 'availableStartTime', 'workStartTime']),
          endTime: this.firstValue(item, ['endTime', 'serviceEndTime', 'availableEndTime', 'workEndTime']),
          status: String(this.firstValue(item, ['status']) || '0')
        }
      },
      parseWorkImages(item) {
        const raw = item.workImageUrls || item.workImages || item.portfolioImages || ''
        if (Array.isArray(raw)) return raw.filter(Boolean)
        const text = String(raw).trim()
        if (!text) return []
        try {
          const parsed = JSON.parse(text)
          if (Array.isArray(parsed)) return parsed.filter(Boolean)
        } catch (e) {}
        return text.split(/[,;，；\s]+/).filter(Boolean)
      },
      formatHealthCertExpire(item) {
        const raw = item.healthCertExpireDate || item.healthCertExpire || ''
        if (!raw) return ''
        const text = String(raw).trim()
        if (!text) return ''
        const date = new Date(text.replace(/-/g, '/'))
        if (Number.isNaN(date.getTime())) return text.slice(0, 10)
        const month = String(date.getMonth() + 1).padStart(2, '0')
        const day = String(date.getDate()).padStart(2, '0')
        return `${date.getFullYear()}-${month}-${day}`
      },
      isHealthCertExpired(item) {
        const raw = item.healthCertExpireDate || item.healthCertExpire || ''
        if (!raw) return false
        const date = new Date(String(raw).trim().replace(/-/g, '/'))
        if (Number.isNaN(date.getTime())) return false
        return date.getTime() < Date.now()
      },
      previewWorkImage(index) {
        uni.previewImage({
          current: index,
          urls: this.chef.workImages || []
        })
      },
      formatAvailableTime(item) {
        const directText = this.firstValue(item, [
          'availableTimeText',
          'serviceTimeText',
          'scheduleText',
          'availableTime',
          'availableTimes',
          'serviceTime',
          'serviceTimes',
          'workTime',
          'workingTime',
          'businessHours',
          'openingHours'
        ])
        if (directText) return this.textValue(directText)

        const start = this.firstValue(item, ['serviceStartTime', 'workStartTime', 'availableStartTime', 'startTime'])
        const end = this.firstValue(item, ['serviceEndTime', 'workEndTime', 'availableEndTime', 'endTime'])
        if (start && end) return `${start}-${end}`
        return '可预约时间待确认'
      },
      formatAvailableTimeLines(text) {
        const value = String(text || '可预约时间待确认').trim()
        return value
          .split(/[;\n；]+/)
          .map(item => item.trim())
          .filter(Boolean)
          .map(item => {
            if (/^\d/.test(item)) return item
            const match = item.match(/^(.+?)\s*[:：]\s*(\d{1,2}:\d{2}.*)$/)
            if (!match) return item
            return `${match[1]} ${match[2]}`.trim()
          })
      },
      buildAvailableTimeLines(availableTimes, fallbackText) {
        const lines = (availableTimes || [])
          .filter(item => item && item.startTime && item.endTime)
          .slice()
          .sort((a, b) => this.parseDateTime(b.startTime) - this.parseDateTime(a.startTime))
          .map(item => this.formatAvailableTimeRange(item.startTime, item.endTime))
          .filter(Boolean)
        if (lines.length) return lines
        return this.formatAvailableTimeLines(fallbackText)
      },
      formatAvailableTimeRange(startTime, endTime) {
        const start = String(startTime || '').trim()
        const end = String(endTime || '').trim()
        if (!start || !end) return ''
        const normalizedStart = start.replace('T', ' ').replace(/:\d{2}$/, '')
        const normalizedEnd = end.replace('T', ' ').replace(/:\d{2}$/, '')
        return `${normalizedStart} - ${normalizedEnd}`
      },
      formatPriceEstimate(item) {
        const directText = this.firstValue(item, ['priceText', 'priceEstimate', 'priceDescription', 'feeDescription'])
        if (directText) return this.textValue(directText)

        const priceItems = [
          { label: '起步价', value: this.firstValue(item, ['startPrice', 'startingPrice', 'basePrice', 'minimumPrice']) },
          { label: '服务费', value: this.firstValue(item, ['servicePrice', 'serviceFee', 'price']) },
          { label: '小时费', value: this.firstValue(item, ['hourlyPrice', 'hourPrice', 'pricePerHour']) }
        ].filter(priceItem => priceItem.value !== undefined && priceItem.value !== null && priceItem.value !== '')

        const seen = []
        const texts = priceItems.map(priceItem => {
          const money = this.moneyText(priceItem.value)
          if (!money || seen.indexOf(`${priceItem.label}:${money}`) !== -1) return ''
          seen.push(`${priceItem.label}:${money}`)
          return `${priceItem.label}${money}${priceItem.label === '小时费' ? '/小时' : ''}`
        }).filter(Boolean)

        return texts.length ? texts.join('；') : '价格待报价，以报价为准'
      },
      firstValue(item, keys) {
        for (let i = 0; i < keys.length; i += 1) {
          const value = item[keys[i]]
          if (value !== undefined && value !== null && value !== '') return value
        }
        return ''
      },
      textValue(value) {
        if (Array.isArray(value)) {
          return value.map(this.textValue).filter(Boolean).join('、')
        }
        if (typeof value === 'object') {
          return Object.values(value).map(this.textValue).filter(Boolean).join('、')
        }
        return String(value).trim()
      },
      moneyText(value) {
        if (typeof value === 'number') return `¥${value}`
        const text = String(value).trim()
        if (!text) return ''
        return /[¥元]/.test(text) ? text : `¥${text}`
      },
      normalizeAddress(item) {
        const region = item.region || item.areaName || item.area || item.district || ''
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
          isDefault: this.normalizeDefault(item.isDefault, item.defaultFlag)
        }
      },
      normalizeDefault(...values) {
        return values.some(value => value === true || value === 1 || value === '1' || value === 'true' || value === 'Y')
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
        return String(value).split(/[、，,\s]+/).filter(Boolean)
      },
      openAvailableTimePopup() {
        if (this.$refs.availableTimePopup) {
          this.$refs.availableTimePopup.open()
        }
      },
      closeAvailableTimePopup() {
        if (this.$refs.availableTimePopup) {
          this.$refs.availableTimePopup.close()
        }
      },
      syncBookingStartOptions() {
        this.bookingStartOptions = this.collectBookingStartOptions(this.chef.availableTimes || [])
        if (!this.bookingStartOptions.length) {
          this.form.date = ''
          this.form.time = ''
          return
        }
        const currentStart = this.buildStartTime()
        const currentValid = this.bookingStartOptions.some(item => item.value === currentStart)
        if (currentValid) return
        const first = this.bookingStartOptions[0]
        this.form.date = first.date
        this.form.time = first.time
      },
      collectBookingStartOptions(availableTimes, nowMs = Date.now()) {
        const durationMs = 3 * 60 * 60 * 1000
        const stepMs = 30 * 60 * 1000
        const minStartMs = nowMs + 60 * 60 * 1000
        const maxStartMs = nowMs + 3 * 24 * 60 * 60 * 1000
        const seen = {}
        const result = []
        const parseDateTime = this && this.parseDateTime
          ? value => this.parseDateTime(value)
          : value => {
            const time = new Date(String(value || '').replace(/-/g, '/')).getTime()
            return Number.isFinite(time) ? time : 0
          }
        const formatDateTime = this && this.formatDateTime
          ? value => this.formatDateTime(value)
          : value => {
            const month = String(value.getMonth() + 1).padStart(2, '0')
            const day = String(value.getDate()).padStart(2, '0')
            const hour = String(value.getHours()).padStart(2, '0')
            const minute = String(value.getMinutes()).padStart(2, '0')
            return `${value.getFullYear()}-${month}-${day} ${hour}:${minute}:00`
          }
        const formatDate = this && this.formatDate
          ? value => this.formatDate(value)
          : value => {
            const month = String(value.getMonth() + 1).padStart(2, '0')
            const day = String(value.getDate()).padStart(2, '0')
            return `${value.getFullYear()}-${month}-${day}`
          }
        const formatClock = this && this.formatClock
          ? value => this.formatClock(value)
          : value => {
            const hour = String(value.getHours()).padStart(2, '0')
            const minute = String(value.getMinutes()).padStart(2, '0')
            return `${hour}:${minute}`
          }
        const alignToNextHalfHour = this && this.alignToNextHalfHour
          ? value => this.alignToNextHalfHour(value)
          : value => {
            if (!Number.isFinite(value) || value <= 0) return 0
            const remainder = value % stepMs
            return remainder === 0 ? value : value + (stepMs - remainder)
          }
        const pushOption = startMs => {
          if (startMs < minStartMs || startMs > maxStartMs) return
          const value = formatDateTime(new Date(startMs))
          if (seen[value]) return
          seen[value] = true
          result.push({
            value,
            startTime: value,
            date: formatDate(new Date(startMs)),
            time: formatClock(new Date(startMs))
          })
        }
        ;(availableTimes || []).forEach(item => {
          if (!item || String(item.status) === '1') return
          const rawStartMs = parseDateTime(item.startTime)
          const rawEndMs = parseDateTime(item.endTime)
          if (!rawStartMs || !rawEndMs || rawEndMs - rawStartMs < durationMs) return
          const minCandidateMs = alignToNextHalfHour(Math.max(rawStartMs, minStartMs))
          const maxCandidateMs = Math.min(maxStartMs, rawEndMs - durationMs)
          if (minCandidateMs > maxCandidateMs) return
          for (let startMs = minCandidateMs; startMs <= maxCandidateMs; startMs += stepMs) {
            pushOption(startMs)
          }
        })
        return result.sort((a, b) => a.value.localeCompare(b.value))
      },
      alignToNextHalfHour(value) {
        const stepMs = 30 * 60 * 1000
        if (!Number.isFinite(value) || value <= 0) return 0
        const remainder = value % stepMs
        return remainder === 0 ? value : value + (stepMs - remainder)
      },
      parseDateTime(value) {
        const time = new Date(String(value || '').replace(/-/g, '/')).getTime()
        return Number.isFinite(time) ? time : 0
      },
      formatClock(date) {
        const hour = String(date.getHours()).padStart(2, '0')
        const minute = String(date.getMinutes()).padStart(2, '0')
        return `${hour}:${minute}`
      },
      changeBookingDate(e) {
        const date = this.bookingDateOptions[Number(e.detail.value || 0)] || ''
        this.form.date = date
        const first = this.bookingStartOptions.find(item => item.date === date)
        this.form.time = first ? first.time : ''
      },
      changeBookingTime(e) {
        this.form.time = this.bookingTimeOptions[Number(e.detail.value || 0)] || ''
      },
      isDishSelected(id) {
        return this.selectedDishIds.indexOf(String(id)) !== -1
      },
      toggleDishSelection(dish) {
        const id = String(dish.id)
        const selectedDishIds = this.selectedDishIds.slice()
        const index = selectedDishIds.indexOf(id)
        if (index === -1) {
          selectedDishIds.push(id)
        } else {
          selectedDishIds.splice(index, 1)
        }
        this.selectedDishIds = selectedDishIds
      },
      buildDishSnapshot(selectedDishes) {
        const customDishNames = String(this.form.customDish || '')
          .split(/[,;\n，；、]+/)
          .map(item => item.trim())
          .filter(Boolean)
        return JSON.stringify({
          dishes: selectedDishes.map(item => ({
            id: item.id,
            name: item.name,
            category: item.category,
            cuisine: item.cuisine
          })),
          customDishNames,
          tasteRemark: String(this.form.tasteRemark || '').trim(),
          materialRemark: String(this.form.materialRemark || '').trim()
        })
      },
      buildUserRemark() {
        return [
          String(this.form.tasteRemark || '').trim(),
          String(this.form.materialRemark || '').trim()
        ].filter(Boolean).join('\n')
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
        const latestOptions = this.collectBookingStartOptions(this.chef.availableTimes || [])
        this.bookingStartOptions = latestOptions
        if (!latestOptions.length) {
          this.form.date = ''
          this.form.time = ''
          this.$modal.msg('当前没有可预约的上门时间')
          return false
        }
        if (!latestOptions.some(item => item.value === startText)) {
          const first = latestOptions[0]
          this.form.date = first.date
          this.form.time = first.time
          this.$modal.msg('预约时间已变化，请重新确认上门时间')
          return false
        }
        return true
      },
      submit() {
        if (this.submitting) return
        if (!getToken()) {
          this.$modal.msg('提交预约前请先登录')
          this.$tab.navigateTo('/pages/login')
          return
        }
        if (!this.selectedAddress) {
          this.$modal.msg('请先新增上门地址')
          this.goAddress()
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
          contactName: this.selectedAddress.contactName,
          contactPhone: this.selectedAddress.phone,
          serviceArea: this.selectedAddress.region,
          addressSnapshot: this.selectedAddress.fullAddress,
          serviceStartTime: startTime,
          serviceEndTime: endTime,
          dishSnapshot: this.buildDishSnapshot(selectedDishes),
          userRemark: this.buildUserRemark()
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
    background: #fff7f0;
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

  .work-gallery {
    display: flex;
    flex-wrap: wrap;
    gap: 12rpx;
    margin-top: 18rpx;
  }

  .work-img {
    width: 210rpx;
    height: 210rpx;
    border-radius: 8rpx;
    background: #f0f2ef;
  }

  .info-value--warn {
    color: #d84a35 !important;
  }

  .card-head--toggle {
    padding: 0;
  }

  .card-head--hover {
    opacity: 0.6;
  }

  .toggle-arrow {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 48rpx;
    height: 48rpx;
  }

  .card-title {
    color: #1d2b26;
    font-size: 30rpx;
    font-weight: 700;
  }

  .info-row {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 24rpx;
    padding-top: 20rpx;
  }

  .info-row--link {
    align-items: center;
  }

  .info-label {
    flex-shrink: 0;
    color: #4e5a55;
    font-size: 26rpx;
  }

  .info-action {
    display: flex;
    align-items: center;
    gap: 6rpx;
  }

  .info-value {
    min-width: 0;
    flex: 1;
    color: #26322d;
    font-size: 26rpx;
    line-height: 1.5;
    text-align: right;
    word-break: break-all;
  }

  .info-value--action {
    flex: none;
    color: #f06a3a;
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

  .address-empty {
    background: #fffaf6;
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
    padding: 8rpx 10rpx;
    border-radius: 8rpx;
    border-bottom: 1rpx solid #f0f2ef;
  }

  .dish-item.is-selected {
    background: #fff7f0;
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

  .submit-btn.is-disabled {
    background: #f4a484;
  }

  .time-dialog {
    width: 620rpx;
    box-sizing: border-box;
    padding: 34rpx 30rpx 28rpx;
    border-radius: 8rpx;
    background: #fff;
  }

  .time-dialog__title {
    color: #1d2b26;
    font-size: 32rpx;
    font-weight: 700;
    text-align: center;
  }

  .time-dialog__content {
    margin-top: 24rpx;
    padding: 22rpx;
    border-radius: 8rpx;
    color: #26322d;
    background: #fbfcfa;
    font-size: 28rpx;
    line-height: 1.6;
    word-break: break-all;
  }

  .time-dialog__line + .time-dialog__line {
    margin-top: 12rpx;
  }

  .time-dialog__btn {
    height: 76rpx;
    line-height: 76rpx;
    margin-top: 28rpx;
    border-radius: 8rpx;
    color: #fff;
    background: #f06a3a;
    font-size: 28rpx;
  }
</style>
