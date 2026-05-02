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
        <text class="label">头像 URL</text>
        <input class="input" v-model.trim="form.avatarUrl" placeholder="填写头像图片地址" />
      </view>
      <view class="field">
        <text class="label">作品图 URL 文本</text>
        <textarea class="textarea" v-model.trim="form.workImageUrls" placeholder="多张图片可用逗号或换行分隔" />
      </view>
      <view class="field">
        <text class="label">擅长菜系</text>
        <input class="input" v-model.trim="form.cuisineTags" placeholder="如 川菜、粤菜、家常菜" />
      </view>
      <view class="field">
        <text class="label">服务区域</text>
        <input class="input" v-model.trim="form.serviceArea" placeholder="如 西湖区、滨江区" />
      </view>
      <view class="field">
        <text class="label">健康证有效期</text>
        <picker mode="date" :value="form.healthCertificateExpireDate" @change="onDateChange">
          <view class="input picker">{{ form.healthCertificateExpireDate || '请选择有效期' }}</view>
        </picker>
      </view>
      <view class="field">
        <text class="label">个人简介</text>
        <textarea class="textarea intro" v-model.trim="form.introduction" placeholder="介绍服务经验、拿手菜和服务风格" />
      </view>
    </view>

    <button class="submit" :loading="submitting" @click="submit">{{ submitText }}</button>
  </view>
</template>

<script>
  import { getChefMy, applyChef, updateChefMy } from '@/api/cooking/chef'

  const ACTIVE = ['APPROVED', 'AUDIT_PASS', 'PASSED', 'NORMAL', 'ENABLED']
  const PENDING = ['PENDING', 'WAIT_AUDIT', 'AUDITING', 'APPLYING']
  const REJECTED = ['REJECTED', 'AUDIT_REJECTED', 'REFUSED']
  const PAUSED = ['PAUSED', 'PAUSE', 'SUSPENDED', 'STOP_TAKING']

  export default {
    data() {
      return {
        chef: {},
        submitting: false,
        form: {
          realName: '',
          phone: '',
          avatarUrl: '',
          workImageUrls: '',
          cuisineTags: '',
          serviceArea: '',
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
      fill(data) {
        this.form.realName = data.realName || data.name || ''
        this.form.phone = data.phone || data.mobile || ''
        this.form.avatarUrl = data.avatarUrl || data.avatar || ''
        this.form.workImageUrls = this.stringify(data.workImageUrls || data.workImages || data.works)
        this.form.cuisineTags = this.stringify(data.cuisineTags || data.cuisines || data.goodAtCuisine)
        this.form.serviceArea = this.stringify(data.serviceArea || data.serviceAreas || data.area)
        this.form.healthCertificateExpireDate = data.healthCertificateExpireDate || data.healthCertExpireDate || data.healthExpireDate || ''
        this.form.introduction = data.introduction || data.profile || data.description || ''
      },
      onDateChange(e) {
        this.form.healthCertificateExpireDate = e.detail.value
      },
      validate() {
        if (!this.form.realName) return '请填写真实姓名'
        if (!/^1\d{10}$/.test(this.form.phone)) return '请填写 11 位手机号'
        if (!this.form.cuisineTags) return '请填写擅长菜系'
        if (!this.form.serviceArea) return '请填写服务区域'
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
        action({ ...this.form }).then(() => {
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
    background: #f5f7f5;
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
