<template>
  <view class="page">
    <view v-if="rejectReason" class="warn-card">
      <view class="warn-title">驳回原因</view>
      <view class="warn-text">{{ rejectReason }}</view>
    </view>

    <view class="form-card">
      <view class="field">
        <text class="label">真实姓名</text>
        <input class="input" v-model.trim="form.realName" placeholder="请输入真实姓名" />
      </view>
      <view class="field">
        <text class="label">手机号</text>
        <input class="input" v-model.trim="form.phone" type="number" maxlength="11" placeholder="请输入 11 位手机号" />
      </view>
      <view class="field">
        <text class="label">年龄</text>
        <input class="input" v-model.trim="form.age" type="number" maxlength="3" placeholder="请输入年龄" />
      </view>
      <view class="field">
        <text class="label">性别</text>
        <radio-group class="gender-options" @change="onGenderChange">
          <label
            v-for="item in genderOptions"
            :key="item.value"
            :class="['gender-option', form.gender === item.value ? 'active' : '']"
          >
            <radio class="gender-radio" :value="item.value" :checked="form.gender === item.value" color="#2f8f55" />
            <text>{{ item.label }}</text>
          </label>
        </radio-group>
      </view>
      <view class="field">
        <text class="label">头像</text>
        <view class="upload-row">
          <view class="avatar-uploader" @click="chooseAvatar">
            <image v-if="form.avatarUrl" class="avatar-preview" :src="form.avatarUrl" mode="aspectFill"></image>
            <view v-if="form.avatarUrl" class="image-tap-layer" @tap.stop="openImagePreview(form.avatarUrl)"></view>
            <view v-if="form.avatarUrl" class="image-remove" @tap.stop="removeAvatar">×</view>
            <view v-else class="upload-placeholder">
              <text class="upload-plus">+</text>
              <text>上传头像</text>
            </view>
          </view>
          <text class="upload-tip">建议使用清晰正方形图片</text>
        </view>
      </view>
      <view class="field">
        <text class="label">作品图</text>
        <view class="image-grid">
          <view v-for="(item, index) in workImageList" :key="item + index" class="work-image">
            <image :src="item" mode="aspectFill"></image>
            <view class="image-tap-layer" @tap.stop="previewWorkImage(index)"></view>
            <view class="image-remove" @tap.stop="removeWorkImage(index)">×</view>
          </view>
          <view v-if="canAddWorkImage" class="image-add" @click="chooseWorkImages">
            <text class="upload-plus">+</text>
            <text>上传作品</text>
          </view>
        </view>
      </view>
      <view class="field">
        <text class="label">擅长菜系</text>
        <input class="input" v-model.trim="form.cuisineTags" placeholder="如 川菜、粤菜、家常菜" />
      </view>
      <view class="field">
        <text class="label">服务区域</text>
        <picker
          mode="multiSelector"
          :range="regionRange"
          :value="regionValue"
          @click="onRegionPickerOpen"
          @columnchange="onRegionColumnChange"
          @change="onRegionChange"
          @cancel="onRegionCancel"
        >
          <view :class="['input', 'picker', 'add-region', regionPickerOpen ? 'top' : 'bottom']" @click="onRegionPickerOpen">
            <text>{{ serviceAreaList.length ? '继续添加服务区域' : '请选择省 / 市 / 区' }}</text>
            <text class="picker-arrow"></text>
          </view>
        </picker>
        <view v-if="serviceAreaList.length" class="area-list">
          <view v-for="(item, index) in serviceAreaList" :key="item + index" class="area-tag">
            <text>{{ item }}</text>
            <text class="area-remove" @click.stop="removeServiceArea(index)">×</text>
          </view>
        </view>
      </view>
      <view class="field">
        <text class="label">健康证有效期</text>
        <picker
          mode="date"
          :value="form.healthCertificateExpireDate"
          @click="onHealthCertificatePickerOpen"
          @change="onDateChange"
          @cancel="onHealthCertificatePickerCancel"
        >
          <view :class="['input', 'picker', 'health-certificate-picker', healthCertificatePickerOpen ? 'top' : 'bottom']" @click="onHealthCertificatePickerOpen">
            <text>{{ form.healthCertificateExpireDate || '请选择有效期' }}</text>
            <text class="picker-arrow"></text>
          </view>
        </picker>
      </view>
      <view class="field">
        <text class="label">健康证图片</text>
        <view class="image-grid">
          <view v-if="form.healthCertificateImageUrl" class="work-image">
            <image :src="form.healthCertificateImageUrl" mode="aspectFill"></image>
            <view class="image-tap-layer" @tap.stop="openImagePreview(form.healthCertificateImageUrl)"></view>
            <view class="image-remove" @tap.stop="removeHealthCertificateImage">×</view>
          </view>
          <view v-else class="image-add" @click="chooseHealthCertificateImage">
            <text class="upload-plus">+</text>
            <text>上传健康证</text>
          </view>
        </view>
      </view>
      <view class="field">
        <text class="label">个人简介</text>
        <textarea class="textarea intro" v-model.trim="form.introduction" placeholder="介绍服务经验、拿手菜和服务风格"></textarea>
      </view>
      <view class="field">
        <text class="label">可预约时间</text>
        <view class="input picker available-time-entry" @click="openAvailableTimePage">
          <view class="available-time-main">
            <text class="available-time-title">{{ availableTimeSummary }}</text>
            <text v-if="chefTimes.length" class="available-time-sub">{{ formatTimeRange(chefTimes[0]) }}</text>
          </view>
          <text class="entry-arrow"></text>
        </view>
      </view>
    </view>

    <button class="submit" :loading="submitting" @click="submit">{{ submitText }}</button>

    <view v-if="imagePreviewVisible" class="image-preview-mask" @click="closeImagePreview">
      <view class="image-preview-panel" @click.stop>
        <view class="preview-close" @click="closeImagePreview">×</view>
        <image class="preview-image" :src="previewImageUrl" mode="aspectFit"></image>
      </view>
    </view>
  </view>
</template>

<script>
  import {
    getChefMy,
    applyChef,
    updateChefMy,
    uploadChefImage,
    getChefTime
  } from '@/api/cooking/chef'
  import appConfig from '@/config'
  import regionData from '@/utils/region-data'
  const chefStatus = require('@/utils/chef-status')
  const AVAILABLE_TIME_DRAFT_KEY = 'work_profile_available_time_draft'
  const AVAILABLE_TIME_RESULT_KEY = 'work_profile_available_time_result'
  const MEAL_OPTIONS = ['早餐', '午餐', '晚餐']

  export default {
    data() {
      return {
        chef: {},
        profileInitialized: false,
        profileDirty: false,
        fillingProfile: false,
        submitting: false,
        uploadingAvatar: false,
        uploadingWorks: false,
        uploadingHealthCertificate: false,
        timeLoading: false,
        imagePreviewVisible: false,
        previewImageUrl: '',
        maxWorkImages: 5,
        workImageList: [],
        serviceAreaList: [],
        chefTimes: [],
        regionValue: [0, 0, 0],
        regionPickerOpen: false,
        healthCertificatePickerOpen: false,
        genderOptions: [
          { label: '男', value: '0' },
          { label: '女', value: '1' },
          { label: '其他', value: '2' }
        ],
        form: {
          realName: '',
          phone: '',
          age: '',
          gender: '',
          avatarUrl: '',
          workImageUrls: '',
          cuisineTags: '',
          serviceArea: '',
          healthCertificateImageUrl: '',
          healthCertificateExpireDate: '',
          introduction: ''
        }
      }
    },
    computed: {
      isNew() {
        return chefStatus.needChefApply(this.chef)
      },
      isRejected() {
        return chefStatus.isChefRejected(this.chef)
      },
      rejectReason() {
        return chefStatus.getChefRejectReason(this.chef)
      },
      submitText() {
        if (this.isNew) return '提交入驻申请'
        if (this.isRejected) return '重新提交审核'
        return '保存资料'
      },
      canAddWorkImage() {
        return this.workImageList.length < this.maxWorkImages
      },
      canManageTime() {
        return !!(this.chef && (this.chef.chefId || this.chef.id))
      },
      availableTimeSummary() {
        return this.chefTimes.length ? `已设置 ${this.chefTimes.length} 个时间段` : '点击设置可预约时间'
      },
      regionRange() {
        const provinceList = this.getProvinceList()
        const cityList = this.getCityList(this.regionValue[0])
        const districtList = this.getDistrictList(this.regionValue[0], this.regionValue[1])
        return [
          provinceList.map(item => item.name),
          cityList.map(item => item.name),
          districtList
        ]
      }
    },
    watch: {
      form: {
        deep: true,
        handler() {
          this.markDirty()
        }
      },
      workImageList: {
        deep: true,
        handler() {
          this.markDirty()
        }
      },
      serviceAreaList: {
        deep: true,
        handler() {
          this.markDirty()
        }
      }
    },
    onShow() {
      const consumed = this.consumeAvailableTimeDraft()
      if (consumed && this.profileInitialized) return
      this.load()
    },
    methods: {
      markDirty() {
        if (this.fillingProfile) return
        this.profileDirty = true
      },
      load(options = {}) {
        const force = !!options.force
        if (!force && this.profileInitialized && this.profileDirty) {
          if (this.canManageTime) {
            this.loadChefTimes()
          }
          return Promise.resolve()
        }
        return getChefMy().then(res => {
          const chef = this.unwrap(res) || {}
          this.chef = chef
          if (!force && this.profileDirty) {
            if (this.canManageTime) {
              this.loadChefTimes()
            }
            return
          }
          this.fill(chef)
          this.profileInitialized = true
          this.profileDirty = false
          if (Array.isArray(chef.availableTimes)) {
            this.chefTimes = this.toTimeList(chef.availableTimes)
          } else if (this.canManageTime) {
            this.loadChefTimes()
          } else {
            this.chefTimes = []
          }
        }).catch(() => {
          if (force || !this.profileInitialized || !this.profileDirty) {
            this.chef = {}
            this.chefTimes = []
          }
        })
      },
      loadChefTimes() {
        this.timeLoading = true
        return getChefTime({}).then(res => {
          this.chefTimes = this.toTimeList(res)
        }).catch(() => {
          this.chefTimes = []
        }).finally(() => {
          this.timeLoading = false
        })
      },
      unwrap(res) {
        return res && res.data !== undefined ? res.data : res
      },
      toTimeList(res) {
        const data = this.unwrap(res)
        const list = Array.isArray(data) ? data : (data && Array.isArray(data.rows) ? data.rows : [])
        return list.slice().sort((a, b) => String(a.startTime || '').localeCompare(String(b.startTime || '')))
      },
      stringify(value) {
        if (Array.isArray(value)) return value.join('、')
        return value || ''
      },
      toArray(value) {
        if (Array.isArray(value)) return value.filter(Boolean)
        return String(value || '')
          .split(/[,，、\n]/)
          .map(item => item.trim())
          .filter(Boolean)
      },
      formatDate(value) {
        if (!value) return ''
        return String(value).slice(0, 10)
      },
      formatTime(value) {
        if (!value) return ''
        const text = String(value).replace('T', ' ')
        const parts = text.split(' ')
        return parts.length > 1 ? parts[1].slice(0, 5) : text.slice(0, 5)
      },
      formatTimeRange(item) {
        const start = item.startTime || ''
        const end = item.endTime || ''
        return `${this.formatDate(start)} ${this.formatTime(start)}-${this.formatTime(end)}`
      },
      normalizeGender(value) {
        const text = String(value === undefined || value === null ? '' : value)
        if (['0', '1', '2'].includes(text)) return text
        if (text === '男') return '0'
        if (text === '女') return '1'
        if (text === '其他') return '2'
        return ''
      },
      timeStatusText(status) {
        return status === '1' ? '停用' : '启用'
      },
      fill(data) {
        this.fillingProfile = true
        try {
          this.healthCertificatePickerOpen = false
          this.form.realName = data.realName || data.name || data.chefName || ''
          this.form.phone = data.phone || data.mobile || ''
          this.form.age = data.age === undefined || data.age === null ? '' : String(data.age)
          const rawGender = data.gender === undefined || data.gender === null ? data.sex : data.gender
          this.form.gender = this.normalizeGender(rawGender)
          this.form.avatarUrl = data.avatarUrl || data.avatar || ''
          this.workImageList = this.toArray(data.workImageUrls || data.workImages || data.works).slice(0, this.maxWorkImages)
          this.syncWorkImageUrls()
          this.form.cuisineTags = this.stringify(data.cuisineTags || data.cuisines || data.goodAtCuisine || data.skillTags)
          this.serviceAreaList = this.toServiceAreaList(data)
          this.syncServiceAreas()
          this.regionValue = this.toRegionValue(this.form.serviceArea)
          this.form.healthCertificateImageUrl = data.healthCertificateImageUrl || data.healthCertImageUrl || data.healthImageUrl || ''
          this.form.healthCertificateExpireDate = this.formatDate(data.healthCertificateExpireDate || data.healthCertExpireDate || data.healthExpireDate)
          this.form.introduction = data.introduction || data.profile || data.description || data.intro || ''
          this.$nextTick(() => {
            this.fillingProfile = false
          })
        } catch (error) {
          this.fillingProfile = false
          throw error
        }
      },
      onDateChange(e) {
        this.healthCertificatePickerOpen = false
        this.form.healthCertificateExpireDate = e.detail.value
      },
      onHealthCertificatePickerOpen() {
        this.healthCertificatePickerOpen = true
      },
      onHealthCertificatePickerCancel() {
        this.healthCertificatePickerOpen = false
      },
      onGenderChange(event) {
        this.form.gender = event.detail.value || ''
      },
      onRegionPickerOpen() {
        this.regionPickerOpen = true
      },
      onRegionCancel() {
        this.regionPickerOpen = false
      },
      onRegionColumnChange(e) {
        const detail = e.detail || {}
        const column = Number(detail.column || 0)
        const value = Number(detail.value || 0)
        const nextValue = this.regionValue.slice()
        nextValue[column] = value
        if (column === 0) {
          nextValue[1] = 0
          nextValue[2] = 0
        } else if (column === 1) {
          nextValue[2] = 0
        }
        this.regionValue = this.normalizeRegionValue(nextValue)
      },
      onRegionChange(e) {
        this.regionPickerOpen = false
        const value = this.normalizeRegionValue(e.detail.value || this.regionValue)
        this.regionValue = value
        const areaName = this.getRegionName(value)
        if (areaName && this.serviceAreaList.indexOf(areaName) === -1) {
          this.serviceAreaList.push(areaName)
          this.syncServiceAreas()
        }
      },
      toRegionValue(value) {
        const parts = String(value || '').split(/\s+/).filter(Boolean)
        return parts.length >= 3 ? this.findRegionValue(parts.slice(0, 3)) : [0, 0, 0]
      },
      getProvinceList() {
        return Array.isArray(regionData) ? regionData : []
      },
      getCityList(provinceIndex) {
        const province = this.getProvinceList()[Number(provinceIndex || 0)] || {}
        return Array.isArray(province.children) ? province.children : []
      },
      getDistrictList(provinceIndex, cityIndex) {
        const city = this.getCityList(provinceIndex)[Number(cityIndex || 0)] || {}
        return Array.isArray(city.children) ? city.children : []
      },
      normalizeRegionValue(value) {
        const provinceList = this.getProvinceList()
        const provinceIndex = Math.min(Math.max(Number(value[0] || 0), 0), Math.max(provinceList.length - 1, 0))
        const cityList = this.getCityList(provinceIndex)
        const cityIndex = Math.min(Math.max(Number(value[1] || 0), 0), Math.max(cityList.length - 1, 0))
        const districtList = this.getDistrictList(provinceIndex, cityIndex)
        const districtIndex = Math.min(Math.max(Number(value[2] || 0), 0), Math.max(districtList.length - 1, 0))
        return [provinceIndex, cityIndex, districtIndex]
      },
      getRegionName(value) {
        const regionValue = this.normalizeRegionValue(value)
        const province = this.getProvinceList()[regionValue[0]]
        const city = this.getCityList(regionValue[0])[regionValue[1]]
        const district = this.getDistrictList(regionValue[0], regionValue[1])[regionValue[2]]
        return [province && province.name, city && city.name, district].filter(Boolean).join(' ')
      },
      findRegionValue(parts) {
        const provinceIndex = this.getProvinceList().findIndex(item => item.name === parts[0])
        if (provinceIndex < 0) return [0, 0, 0]
        const cityIndex = this.getCityList(provinceIndex).findIndex(item => item.name === parts[1])
        if (cityIndex < 0) return [provinceIndex, 0, 0]
        const districtIndex = this.getDistrictList(provinceIndex, cityIndex).findIndex(item => item === parts[2])
        return this.normalizeRegionValue([provinceIndex, cityIndex, districtIndex < 0 ? 0 : districtIndex])
      },
      toServiceAreaList(data) {
        const raw = data.serviceAreas || data.serviceArea || data.area || data.areaName || ''
        if (Array.isArray(raw)) return raw.filter(Boolean)
        return String(raw || '')
          .split(/[,，、;\n；]/)
          .map(item => item.trim())
          .filter(Boolean)
      },
      chooseAvatar() {
        if (this.uploadingAvatar) return
        uni.chooseImage({
          count: 1,
          sizeType: ['compressed'],
          sourceType: ['album', 'camera'],
          success: res => {
            const filePath = res.tempFilePaths && res.tempFilePaths[0]
            if (filePath) this.uploadAvatar(filePath)
          }
        })
      },
      chooseWorkImages() {
        if (this.uploadingWorks) return
        const count = this.maxWorkImages - this.workImageList.length
        if (count <= 0) return
        uni.chooseImage({
          count,
          sizeType: ['compressed'],
          sourceType: ['album', 'camera'],
          success: res => {
            this.uploadWorkImages(res.tempFilePaths || [])
          }
        })
      },
      chooseHealthCertificateImage() {
        if (this.uploadingHealthCertificate) return
        uni.chooseImage({
          count: 1,
          sizeType: ['compressed'],
          sourceType: ['album', 'camera'],
          success: res => {
            const filePath = res.tempFilePaths && res.tempFilePaths[0]
            if (filePath) this.uploadHealthCertificateImage(filePath)
          }
        })
      },
      uploadAvatar(filePath) {
        this.uploadingAvatar = true
        uni.showLoading({ title: '上传中...' })
        uploadChefImage(filePath).then(res => {
          const url = this.resolveUploadUrl(res)
          if (url) {
            this.form.avatarUrl = url
          } else {
            this.showUploadError('头像上传失败，请重试')
          }
        }).catch(() => {
          this.showUploadError('头像上传失败，请重试')
        }).finally(() => {
          this.uploadingAvatar = false
          uni.hideLoading()
        })
      },
      async uploadWorkImages(filePaths) {
        if (!filePaths.length) return
        this.uploadingWorks = true
        uni.showLoading({ title: '上传中...' })
        try {
          for (const filePath of filePaths) {
            if (this.workImageList.length >= this.maxWorkImages) break
            const res = await uploadChefImage(filePath)
            const url = this.resolveUploadUrl(res)
            if (url && this.workImageList.indexOf(url) === -1) {
              this.workImageList.push(url)
            } else if (!url) {
              throw new Error('作品图上传失败')
            }
          }
          this.syncWorkImageUrls()
        } catch (error) {
          this.showUploadError('作品图上传失败，请重试')
        } finally {
          this.syncWorkImageUrls()
          this.uploadingWorks = false
          uni.hideLoading()
        }
      },
      uploadHealthCertificateImage(filePath) {
        this.uploadingHealthCertificate = true
        uni.showLoading({ title: '上传中...' })
        uploadChefImage(filePath).then(res => {
          const url = this.resolveUploadUrl(res)
          if (url) {
            this.form.healthCertificateImageUrl = url
          } else {
            this.showUploadError('健康证图片上传失败，请重试')
          }
        }).catch(() => {
          this.showUploadError('健康证图片上传失败，请重试')
        }).finally(() => {
          this.uploadingHealthCertificate = false
          uni.hideLoading()
        })
      },
      resolveUploadUrl(res) {
        const data = this.unwrap(res) || {}
        return data.url || data.imgUrl || data.fileUrl || ''
      },
      showUploadError(message) {
        if (this.$modal && this.$modal.showToast) {
          this.$modal.showToast(message)
          return
        }
        uni.showToast({ title: message, icon: 'none' })
      },
      removeAvatar() {
        this.form.avatarUrl = ''
      },
      removeWorkImage(index) {
        this.workImageList.splice(index, 1)
        this.syncWorkImageUrls()
      },
      removeHealthCertificateImage() {
        this.form.healthCertificateImageUrl = ''
      },
      removeServiceArea(index) {
        this.serviceAreaList.splice(index, 1)
        this.syncServiceAreas()
      },
      openAvailableTimePage() {
        uni.setStorageSync(AVAILABLE_TIME_DRAFT_KEY, this.chefTimes || [])
        uni.navigateTo({ url: '/pages/work/profile-time' })
      },
      consumeAvailableTimeDraft() {
        const draft = uni.getStorageSync(AVAILABLE_TIME_RESULT_KEY)
        if (!Array.isArray(draft)) return false
        uni.removeStorageSync(AVAILABLE_TIME_RESULT_KEY)
        this.chefTimes = this.toTimeList(draft)
        this.markDirty()
        return true
      },
      buildAvailableTimesPayload() {
        return (this.chefTimes || []).map(item => ({
          startTime: item.startTime,
          endTime: item.endTime,
          status: item.status || '0',
          remark: this.normalizeMealRemark(item.remark)
        })).filter(item => item.startTime && item.endTime)
      },
      normalizeMealRemark(value) {
        const remark = String(value || '').trim()
        return MEAL_OPTIONS.includes(remark) ? remark : ''
      },
      syncServiceAreas() {
        this.form.serviceArea = this.serviceAreaList.join('、')
      },
      syncWorkImageUrls() {
        this.form.workImageUrls = this.workImageList.join(',')
      },
      resolveFullUrl(path) {
        if (!path) return ''
        if (/^https?:\/\//.test(path)) return path
        return (appConfig.baseUrl || '') + path
      },
      previewWorkImage(index) {
        const url = this.workImageList[index]
        if (!url) return
        const urls = this.workImageList.filter(Boolean).map(item => this.resolveFullUrl(item))
        uni.previewImage({
          current: this.resolveFullUrl(url),
          urls: urls
        })
      },
      openImagePreview(url, urls = []) {
        if (!url) return
        const rawUrls = Array.isArray(urls) && urls.length ? urls.filter(Boolean) : [url]
        const previewUrls = rawUrls.map(item => this.resolveFullUrl(item))
        const current = this.resolveFullUrl(url)
        if (uni.previewImage) {
          uni.previewImage({
            current,
            urls: previewUrls
          })
          return
        }
        this.previewImageUrl = current
        this.imagePreviewVisible = true
      },
      closeImagePreview() {
        this.imagePreviewVisible = false
        this.previewImageUrl = ''
      },
      buildPayload() {
        this.syncWorkImageUrls()
        this.syncServiceAreas()
        return {
          chefName: this.form.realName,
          mobile: this.form.phone,
          age: Number(this.form.age),
          gender: this.form.gender,
          avatarUrl: this.form.avatarUrl,
          workImageUrls: this.form.workImageUrls,
          skillTags: this.form.cuisineTags,
          areaName: this.form.serviceArea,
          serviceArea: this.form.serviceArea,
          serviceAreas: this.serviceAreaList,
          healthCertificateImageUrl: this.form.healthCertificateImageUrl,
          healthCertImageUrl: this.form.healthCertificateImageUrl,
          healthCertExpireDate: this.form.healthCertificateExpireDate,
          intro: this.form.introduction,
          availableTimes: this.buildAvailableTimesPayload()
        }
      },
      validate() {
        if (!this.form.realName) return '请填写真实姓名'
        if (!/^1\d{10}$/.test(this.form.phone)) return '请填写 11 位手机号'
        if (!this.form.age) return '请填写年龄'
        if (!/^\d{1,3}$/.test(this.form.age) || Number(this.form.age) < 1 || Number(this.form.age) > 120) return '请填写有效年龄'
        if (!this.form.cuisineTags) return '请填写擅长菜系'
        if (!this.form.serviceArea) return '请填写服务区域'
        if (this.workImageList.length > this.maxWorkImages) return '作品图最多上传 5 张'
        if (!this.form.healthCertificateImageUrl) return '请上传健康证图片'
        if (!this.form.healthCertificateExpireDate) return '请选择健康证有效期'
        if ((this.chefTimes || []).some(item => !this.normalizeMealRemark(item.remark))) return '请完善可预约时间的三餐选择'
        return ''
      },
      submit() {
        if (chefStatus.isChefPending(this.chef)) {
          this.$modal.showToast('当前入驻申请正在审核中，请勿重复提交')
          return
        }
        const message = this.validate()
        if (message) {
          this.$modal.showToast(message)
          return
        }
        const payload = this.buildPayload()
        if (this.isRejected) {
          payload.auditStatus = '0'
          payload.auditReason = ''
        }
        const action = this.isNew ? applyChef : updateChefMy
        this.submitting = true
        action(payload).then(() => {
          this.$modal.msgSuccess(this.submitText + '成功')
          this.profileDirty = false
          this.$tab.switchTab('/pages/mine/index')
        }).finally(() => {
          this.submitting = false
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

  .warn-card,
  .form-card {
    border-radius: 14rpx;
    background: #fff;
    box-shadow: 0 8rpx 28rpx rgba(20, 35, 27, 0.06);
  }

  .warn-card {
    padding: 24rpx;
    border-left: 8rpx solid #c1732d;
  }

  .warn-title {
    font-size: 28rpx;
    font-weight: 700;
  }

  .warn-text {
    margin-top: 10rpx;
    color: #6c4b22;
    font-size: 26rpx;
    line-height: 1.55;
  }

  .form-card {
    margin-top: 22rpx;
    padding: 8rpx 26rpx 28rpx;
  }

  .section-head {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 20rpx;
  }

  .section-title {
    color: #17211b;
    font-size: 30rpx;
    font-weight: 700;
  }

  .section-desc {
    margin-top: 8rpx;
    color: #7b8780;
    font-size: 24rpx;
    line-height: 1.45;
  }

  .small-btn {
    flex: 0 0 auto;
    margin: 0;
    padding: 0 22rpx;
    border-radius: 8rpx;
    background: #ecf7ef;
    color: #2f8f55;
    font-size: 24rpx;
  }

  .time-list {
    margin-top: 22rpx;
    border-top: 1rpx solid #edf0ee;
  }

  .time-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 18rpx;
    padding: 20rpx 0;
    border-bottom: 1rpx solid #edf0ee;
  }

  .time-info {
    flex: 1;
    min-width: 0;
  }

  .time-range,
  .time-remark {
    display: block;
  }

  .time-range {
    color: #17211b;
    font-size: 27rpx;
    line-height: 1.4;
  }

  .time-status {
    display: inline-block;
    margin-top: 8rpx;
    padding: 4rpx 10rpx;
    border-radius: 6rpx;
    font-size: 22rpx;
    line-height: 1.2;
  }

  .time-status.on {
    background: #dcf4e1;
    color: #176c35;
  }

  .time-status.off {
    background: #edf0ee;
    color: #647068;
  }

  .time-remark {
    margin-top: 8rpx;
    color: #7b8780;
    font-size: 24rpx;
    line-height: 1.4;
  }

  .time-actions {
    display: flex;
    flex: 0 0 auto;
    align-items: center;
    gap: 18rpx;
  }

  .text-action {
    color: #2f8f55;
    font-size: 25rpx;
  }

  .text-action.danger {
    color: #a82819;
  }

  .empty-time {
    margin-top: 22rpx;
    padding: 22rpx;
    border-radius: 8rpx;
    background: #fbfcfb;
    color: #7b8780;
    font-size: 25rpx;
    text-align: center;
  }

  .time-form {
    margin-top: 10rpx;
  }

  .time-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 18rpx;
  }

  .field {
    padding-top: 24rpx;
  }

  .label {
    display: block;
    margin-bottom: 12rpx;
    color: #415047;
    font-size: 26rpx;
    font-weight: 600;
  }

  .upload-row {
    display: flex;
    align-items: center;
    gap: 18rpx;
  }

  .avatar-uploader,
  .image-add,
  .work-image {
    position: relative;
    width: 156rpx;
    height: 156rpx;
    border-radius: 8rpx;
    overflow: hidden;
    background: #fbfcfb;
    box-sizing: border-box;
  }

  .avatar-uploader,
  .image-add {
    border: 1rpx dashed #b8c7bd;
  }

  .avatar-preview,
  .work-image image {
    width: 100%;
    height: 100%;
    display: block;
  }

  .upload-placeholder,
  .image-add {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    color: #6d7b72;
    font-size: 24rpx;
  }

  .upload-placeholder {
    width: 100%;
    height: 100%;
    text-align: center;
  }

  .upload-plus {
    font-size: 42rpx;
    line-height: 1;
    color: #2f8f55;
  }

  .upload-tip {
    flex: 1;
    color: #7c8980;
    font-size: 24rpx;
    line-height: 1.45;
  }

  .gender-options {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 16rpx;
  }

  .gender-option {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8rpx;
    height: 76rpx;
    border: 1rpx solid #e2e8e4;
    border-radius: 8rpx;
    background: #fbfcfb;
    color: #415047;
    font-size: 28rpx;
    text-align: center;
    box-sizing: border-box;
  }

  .gender-option.active {
    border-color: #2f8f55;
    background: #ecf7ef;
    color: #176c35;
    font-weight: 700;
  }

  .gender-radio {
    transform: scale(.78);
  }

  .image-grid {
    display: grid;
    grid-template-columns: repeat(3, 156rpx);
    gap: 16rpx;
  }

  .image-tap-layer {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    z-index: 1;
  }

  .image-remove {
    z-index: 2;
    position: absolute;
    top: 0;
    right: 0;
    width: 40rpx;
    height: 40rpx;
    line-height: 36rpx;
    text-align: center;
    background: rgba(0, 0, 0, 0.55);
    color: #fff;
    font-size: 32rpx;
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
    height: 146rpx;
    line-height: 1.55;
  }

  .textarea.intro {
    height: 190rpx;
  }

  .available-time-entry {
    min-height: 92rpx;
  }

  .available-time-main {
    display: flex;
    flex: 1;
    min-width: 0;
    flex-direction: column;
    gap: 8rpx;
  }

  .available-time-title,
  .available-time-sub {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .available-time-title {
    color: #17211b;
    font-size: 28rpx;
    font-weight: 600;
  }

  .available-time-sub {
    color: #7b8780;
    font-size: 24rpx;
  }

  .entry-arrow {
    flex: 0 0 auto;
    width: 16rpx;
    height: 16rpx;
    border-top: 3rpx solid #7b8780;
    border-right: 3rpx solid #7b8780;
    transform: rotate(45deg);
  }

  .picker {
    display: flex;
    align-items: center;
    justify-content: space-between;
    line-height: 40rpx;
  }

  .add-region,
  .health-certificate-picker {
    color: #2f8f55;
  }

  .picker-arrow {
    width: 16rpx;
    height: 16rpx;
    border-top: 3rpx solid #2f8f55;
    border-right: 3rpx solid #2f8f55;
    transform: rotate(135deg);
  }

  .add-region.top .picker-arrow,
  .health-certificate-picker.top .picker-arrow {
    transform: rotate(-45deg);
  }

  .add-region.bottom .picker-arrow,
  .health-certificate-picker.bottom .picker-arrow {
    transform: rotate(135deg);
  }

  .area-list {
    display: flex;
    flex-wrap: wrap;
    gap: 12rpx;
    margin-top: 14rpx;
  }

  .area-tag {
    display: flex;
    align-items: center;
    max-width: 100%;
    padding: 10rpx 14rpx;
    border-radius: 8rpx;
    background: #fff7f0;
    color: #6a3a2b;
    font-size: 24rpx;
    line-height: 1.35;
  }

  .area-remove {
    margin-left: 10rpx;
    color: #a82819;
    font-size: 30rpx;
    line-height: 1;
  }

  .image-preview-mask {
    position: fixed;
    left: 0;
    right: 0;
    top: 0;
    bottom: 0;
    z-index: 999;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 56rpx 32rpx;
    box-sizing: border-box;
    background: rgba(0, 0, 0, .78);
  }

  .image-preview-panel {
    position: relative;
    width: 100%;
    height: 82vh;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .preview-close {
    position: absolute;
    top: 0;
    right: 0;
    z-index: 2;
    width: 72rpx;
    height: 72rpx;
    line-height: 66rpx;
    border-radius: 36rpx;
    color: #fff;
    text-align: center;
    font-size: 48rpx;
    background: rgba(0, 0, 0, .56);
  }

  .preview-image {
    width: 100%;
    height: 100%;
  }

  .submit {
    margin-top: 28rpx;
    height: 84rpx;
    line-height: 84rpx;
    border-radius: 8rpx;
    background: #2f8f55;
    color: #fff;
    font-size: 30rpx;
  }

  .time-submit {
    margin-top: 26rpx;
    width: 100%;
    height: 78rpx;
    line-height: 78rpx;
    border-radius: 8rpx;
    background: #2f8f55;
    color: #fff;
    font-size: 28rpx;
  }
</style>
