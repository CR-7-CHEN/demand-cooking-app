<template>
  <view class="page">
    <view class="head-card">
      <view>
        <text class="sub">入驻/资料维护</text>
        <view class="title">{{ statusText }}</view>
      </view>
      <text :class="['chip', statusTone]">{{ chipText }}</text>
    </view>

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
        <text class="label">头像</text>
        <view class="upload-row">
          <view class="avatar-uploader" @click="chooseAvatar">
            <image v-if="form.avatarUrl" class="avatar-preview" :src="form.avatarUrl" mode="aspectFill"></image>
            <view v-if="form.avatarUrl" class="image-remove" @click.stop="removeAvatar">×</view>
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
            <view class="image-remove" @click.stop="removeWorkImage(index)">×</view>
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
        <picker mode="region" :value="regionValue" @change="onRegionChange">
          <view class="input picker add-region">{{ serviceAreaList.length ? '继续添加服务区域' : '请选择省 / 市 / 区' }}</view>
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
        <picker mode="date" :value="form.healthCertificateExpireDate" @change="onDateChange">
          <view class="input picker">{{ form.healthCertificateExpireDate || '请选择有效期' }}</view>
        </picker>
      </view>
      <view class="field">
        <text class="label">健康证图片</text>
        <view class="image-grid">
          <view v-if="form.healthCertificateImageUrl" class="work-image">
            <image :src="form.healthCertificateImageUrl" mode="aspectFill" @click="previewImage(form.healthCertificateImageUrl)"></image>
            <view class="image-remove" @click.stop="removeHealthCertificateImage">×</view>
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
    </view>

    <button class="submit" :loading="submitting" @click="submit">{{ submitText }}</button>
  </view>
</template>

<script>
  import { getChefMy, applyChef, updateChefMy, uploadChefImage } from '@/api/cooking/chef'

  const ACTIVE = ['APPROVED', 'AUDIT_PASS', 'PASSED', 'NORMAL', 'ENABLED']
  const PENDING = ['PENDING', 'WAIT_AUDIT', 'AUDITING', 'APPLYING']
  const REJECTED = ['REJECTED', 'AUDIT_REJECTED', 'REFUSED']
  const PAUSED = ['PAUSED', 'PAUSE', 'SUSPENDED', 'STOP_TAKING']

  export default {
    data() {
      return {
        chef: {},
        submitting: false,
        uploadingAvatar: false,
        uploadingWorks: false,
        uploadingHealthCertificate: false,
        maxWorkImages: 5,
        workImageList: [],
        serviceAreaList: [],
        regionValue: [],
        form: {
          realName: '',
          phone: '',
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
      status() {
        return this.normalize(this.chef.status || this.chef.auditStatus || this.chef.chefStatus || this.chef.identityStatus)
      },
      isNew() {
        return !this.chef.id && !this.chef.chefId && !this.status
      },
      isRejected() {
        return REJECTED.indexOf(this.status) > -1
      },
      rejectReason() {
        return this.chef.rejectReason || this.chef.auditRejectReason || this.chef.reason || ''
      },
      statusText() {
        if (this.isNew) return '未申请入驻'
        if (ACTIVE.indexOf(this.status) > -1) return '审核通过'
        if (PAUSED.indexOf(this.status) > -1) return '暂停接单'
        if (PENDING.indexOf(this.status) > -1) return '待平台审核'
        if (this.isRejected) return '审核驳回'
        return this.chef.statusName || '资料待完善'
      },
      chipText() {
        if (this.isNew) return '可申请'
        if (this.isRejected) return '可重提'
        if (ACTIVE.indexOf(this.status) > -1 || PAUSED.indexOf(this.status) > -1) return '可维护'
        if (PENDING.indexOf(this.status) > -1) return '审核中'
        return '受限'
      },
      chipTone() {
        return this.statusTone
      },
      statusTone() {
        if (ACTIVE.indexOf(this.status) > -1 || PAUSED.indexOf(this.status) > -1) return 'ok'
        if (PENDING.indexOf(this.status) > -1) return 'warn'
        if (this.isRejected) return 'danger'
        return 'muted'
      },
      submitText() {
        if (this.isNew) return '提交入驻申请'
        if (this.isRejected) return '重新提交审核'
        return '保存资料'
      },
      canAddWorkImage() {
        return this.workImageList.length < this.maxWorkImages
      }
    },
    onShow() {
      this.load()
    },
    methods: {
      load() {
        getChefMy().then(res => {
          this.chef = this.unwrap(res) || {}
          this.fill(this.chef)
        }).catch(() => {
          this.chef = {}
        })
      },
      unwrap(res) {
        return res && res.data !== undefined ? res.data : res
      },
      normalize(value) {
        return String(value || '').trim().toUpperCase()
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
      fill(data) {
        this.form.realName = data.realName || data.name || data.chefName || ''
        this.form.phone = data.phone || data.mobile || ''
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
      },
      onDateChange(e) {
        this.form.healthCertificateExpireDate = e.detail.value
      },
      onRegionChange(e) {
        const value = e.detail.value || []
        this.regionValue = value
        const areaName = value.filter(Boolean).join(' ')
        if (areaName && this.serviceAreaList.indexOf(areaName) === -1) {
          this.serviceAreaList.push(areaName)
          this.syncServiceAreas()
        }
      },
      toRegionValue(value) {
        const parts = String(value || '').split(/\s+/).filter(Boolean)
        return parts.length >= 3 ? parts.slice(0, 3) : []
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
      syncServiceAreas() {
        this.form.serviceArea = this.serviceAreaList.join('、')
      },
      syncWorkImageUrls() {
        this.form.workImageUrls = this.workImageList.join(',')
      },
      previewImage(url) {
        if (!url) return
        uni.previewImage({
          current: url,
          urls: [url]
        })
      },
      buildPayload() {
        this.syncWorkImageUrls()
        this.syncServiceAreas()
        return {
          chefName: this.form.realName,
          mobile: this.form.phone,
          avatarUrl: this.form.avatarUrl,
          workImageUrls: this.form.workImageUrls,
          skillTags: this.form.cuisineTags,
          areaName: this.form.serviceArea,
          serviceArea: this.form.serviceArea,
          serviceAreas: this.serviceAreaList,
          healthCertificateImageUrl: this.form.healthCertificateImageUrl,
          healthCertImageUrl: this.form.healthCertificateImageUrl,
          healthCertExpireDate: this.form.healthCertificateExpireDate,
          intro: this.form.introduction
        }
      },
      validate() {
        if (!this.form.realName) return '请填写真实姓名'
        if (!/^1\d{10}$/.test(this.form.phone)) return '请填写 11 位手机号'
        if (!this.form.cuisineTags) return '请填写擅长菜系'
        if (!this.form.serviceArea) return '请填写服务区域'
        if (this.workImageList.length > this.maxWorkImages) return '作品图最多上传 5 张'
        if (!this.form.healthCertificateImageUrl) return '请上传健康证图片'
        if (!this.form.healthCertificateExpireDate) return '请选择健康证有效期'
        return ''
      },
      submit() {
        const message = this.validate()
        if (message) {
          this.$modal.showToast(message)
          return
        }
        const action = (this.isNew || this.isRejected) ? applyChef : updateChefMy
        this.submitting = true
        action(this.buildPayload()).then(() => {
          this.$modal.msgSuccess(this.submitText + '成功')
          this.load()
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

  .head-card,
  .warn-card,
  .form-card {
    border-radius: 14rpx;
    background: #fff;
    box-shadow: 0 8rpx 28rpx rgba(20, 35, 27, 0.06);
  }

  .head-card {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 28rpx;
    background: #6a3a2b;
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

  .chip {
    padding: 8rpx 16rpx;
    border-radius: 999rpx;
    font-size: 24rpx;
    background: #edf0ee;
    color: #4e5a52;
  }

  .chip.ok {
    background: #dcf4e1;
    color: #176c35;
  }

  .chip.warn {
    background: #fff0cb;
    color: #875800;
  }

  .chip.danger {
    background: #ffe0dc;
    color: #a82819;
  }

  .warn-card {
    margin-top: 20rpx;
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

  .image-grid {
    display: grid;
    grid-template-columns: repeat(3, 156rpx);
    gap: 16rpx;
  }

  .image-remove {
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

  .picker {
    line-height: 40rpx;
  }

  .add-region {
    color: #2f8f55;
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

  .submit {
    margin-top: 28rpx;
    height: 84rpx;
    line-height: 84rpx;
    border-radius: 8rpx;
    background: #2f8f55;
    color: #fff;
    font-size: 30rpx;
  }
</style>
