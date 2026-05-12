<template>
  <view class="page">
    <view class="form-card">
      <view class="section-head">
        <view>
          <view class="section-title">{{ sectionTitle }}</view>
          <view v-if="sectionDesc" class="section-desc">{{ sectionDesc }}</view>
        </view>
      </view>
      <view v-if="loading" class="empty-time">正在加载可预约时间...</view>
      <view v-else-if="chefTimes.length" class="time-list">
        <view v-for="item in chefTimes" :key="item.localId || item.timeId" class="time-row">
          <view class="time-info">
            <text class="time-range">{{ formatTimeRange(item) }}</text>
            <view class="time-badges">
              <text :class="['time-status', item.status === '1' ? 'off' : 'on']">{{ timeStatusText(item.status) }}</text>
              <text v-if="isExpiredTime(item)" class="time-expired-tag">已过期</text>
            </view>
            <text v-if="item.remark" class="time-remark">{{ item.remark }}</text>
          </view>
          <view class="time-actions">
            <view v-if="!isManageMode" class="text-action" @tap.stop="editTime(item)">编辑</view>
            <view v-if="!isManageMode || isExpiredTime(item)" class="text-action danger" @tap.stop="removeTime(item)">删除</view>
          </view>
        </view>
      </view>
      <view v-else class="empty-time">{{ emptyTimeText }}</view>

      <view v-if="!isManageMode" class="time-form">
        <view class="field">
          <text class="label">日期</text>
          <picker mode="date" :value="timeForm.date" @change="onTimeDateChange">
            <view class="input picker">{{ timeForm.date || '请选择日期' }}</view>
          </picker>
        </view>
        <view class="time-grid">
          <view class="field">
            <text class="label">开始</text>
            <picker :range="halfHourOptions" :value="startTimeIndex" @change="onStartTimeChange">
              <view class="input picker">{{ timeForm.startTime || '请选择' }}</view>
            </picker>
          </view>
          <view class="field">
            <text class="label">结束</text>
            <picker :range="halfHourOptions" :value="endTimeIndex" @change="onEndTimeChange">
              <view class="input picker">{{ timeForm.endTime || '请选择' }}</view>
            </picker>
          </view>
        </view>
        <view class="field">
          <text class="label">状态</text>
          <picker :range="timeStatusOptions" range-key="label" :value="timeStatusIndex" @change="onTimeStatusChange">
            <view class="input picker">{{ timeStatusOptions[timeStatusIndex].label }}</view>
          </picker>
        </view>
        <view class="field">
          <text class="label">三餐选择</text>
          <picker :range="mealOptions" :value="mealOptionIndex" @change="onMealOptionChange">
            <view class="input picker">{{ timeForm.remark || '请选择三餐' }}</view>
          </picker>
        </view>
      </view>
    </view>

    <button v-if="!isManageMode" class="submit" @click="confirmTimes">确认</button>
  </view>
</template>

<script>
  import { getChefTime, deleteChefTime } from '@/api/cooking/chef'

  const AVAILABLE_TIME_DRAFT_KEY = 'work_profile_available_time_draft'
  const AVAILABLE_TIME_RESULT_KEY = 'work_profile_available_time_result'
  const HALF_HOUR_OPTIONS = Array.from({ length: 48 }, (_, index) => {
    const hour = String(Math.floor(index / 2)).padStart(2, '0')
    const minute = index % 2 === 0 ? '00' : '30'
    return `${hour}:${minute}`
  })
  const MEAL_OPTIONS = ['早餐', '午餐', '晚餐']

  export default {
    data() {
      return {
        mode: 'draft',
        focus: '',
        loading: false,
        chefTimes: [],
        halfHourOptions: HALF_HOUR_OPTIONS,
        mealOptions: MEAL_OPTIONS,
        timeStatusOptions: [
          { label: '启用', value: '0' },
          { label: '停用', value: '1' }
        ],
        timeForm: {
          localId: '',
          timeId: null,
          date: '',
          startTime: '',
          endTime: '',
          status: '0',
          remark: ''
        }
      }
    },
    computed: {
      isManageMode() {
        return this.mode === 'manage'
      },
      sectionTitle() {
        return this.isManageMode ? '预约时间管理' : '可预约时间'
      },
      sectionDesc() {
        return this.isManageMode ? '' : '设置后会和入驻资料一起提交审核'
      },
      emptyTimeText() {
        return this.isManageMode ? '暂无可清理的预约时间段' : '暂无可预约时间，请选择下方日期和时间'
      },
      timeStatusIndex() {
        const index = this.timeStatusOptions.findIndex(item => item.value === this.timeForm.status)
        return index > -1 ? index : 0
      },
      mealOptionIndex() {
        const index = this.mealOptions.findIndex(item => item === this.timeForm.remark)
        return index > -1 ? index : 0
      },
      startTimeIndex() {
        const index = this.halfHourOptions.findIndex(item => item === this.timeForm.startTime)
        return index > -1 ? index : 0
      },
      endTimeIndex() {
        const index = this.halfHourOptions.findIndex(item => item === this.timeForm.endTime)
        return index > -1 ? index : 0
      }
    },
    onLoad(options = {}) {
      this.mode = options.mode === 'manage' ? 'manage' : 'draft'
      this.focus = options.focus || ''
      return this.loadPage()
    },
    methods: {
      loadPage() {
        return this.isManageMode ? this.loadManageTimes() : this.loadDraft()
      },
      loadDraft() {
        const draft = uni.getStorageSync(AVAILABLE_TIME_DRAFT_KEY)
        this.chefTimes = this.toTimeList(Array.isArray(draft) ? draft : [])
        return Promise.resolve(this.chefTimes)
      },
      loadManageTimes() {
        this.loading = true
        return getChefTime({}).then(res => {
          this.chefTimes = this.toTimeList(this.pickList(res))
        }).catch(() => {
          this.chefTimes = []
        }).finally(() => {
          this.loading = false
        })
      },
      toTimeList(list) {
        return list.map(item => this.normalizeTimeItem(item))
          .filter(item => item.startTime && item.endTime)
          .sort((a, b) => {
            if (this.isManageMode) {
              const aExpired = this.isExpiredTime(a)
              const bExpired = this.isExpiredTime(b)
              if (aExpired !== bExpired) return aExpired ? -1 : 1
            }
            return String(a.startTime || '').localeCompare(String(b.startTime || ''))
          })
      },
      normalizeTimeItem(item) {
        const localId = item.localId || item.timeId || item.id || this.createLocalId()
        return {
          localId: String(localId),
          timeId: item.timeId || item.id || null,
          startTime: item.startTime || '',
          endTime: item.endTime || '',
          status: item.status || '0',
          remark: this.normalizeMealRemark(item.remark)
        }
      },
      pickList(res) {
        if (Array.isArray(res)) return res
        if (res && Array.isArray(res.rows)) return res.rows
        if (res && Array.isArray(res.records)) return res.records
        if (res && Array.isArray(res.data)) return res.data
        if (res && res.data && Array.isArray(res.data.rows)) return res.data.rows
        if (res && res.data && Array.isArray(res.data.records)) return res.data.records
        if (res && res.data && Array.isArray(res.data.list)) return res.data.list
        return []
      },
      normalizeMealRemark(value) {
        const remark = String(value || '').trim()
        return this.mealOptions.includes(remark) ? remark : ''
      },
      createLocalId() {
        return `draft_${Date.now()}_${Math.random().toString(16).slice(2)}`
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
      isHalfHourClock(value) {
        return /^(?:[01]\d|2[0-3]):(?:00|30)$/.test(String(value || ''))
      },
      timeStatusText(status) {
        return status === '1' ? '停用' : '启用'
      },
      isExpiredTime(item) {
        const endTime = item && item.endTime
        if (!endTime) return false
        const end = new Date(String(endTime).replace(/-/g, '/')).getTime()
        return Number.isFinite(end) && end > 0 && end < Date.now()
      },
      onTimeDateChange(e) {
        this.timeForm.date = e.detail.value
      },
      onStartTimeChange(e) {
        const index = Number(e.detail.value || 0)
        this.timeForm.startTime = this.halfHourOptions[index] || ''
      },
      onEndTimeChange(e) {
        const index = Number(e.detail.value || 0)
        this.timeForm.endTime = this.halfHourOptions[index] || ''
      },
      onTimeStatusChange(e) {
        const index = Number(e.detail.value || 0)
        this.timeForm.status = this.timeStatusOptions[index].value
      },
      onMealOptionChange(e) {
        const index = Number(e.detail.value || 0)
        this.timeForm.remark = this.mealOptions[index] || ''
      },
      resetTimeForm() {
        this.timeForm = {
          localId: '',
          timeId: null,
          date: '',
          startTime: '',
          endTime: '',
          status: '0',
          remark: ''
        }
      },
      editTime(item) {
        this.timeForm = {
          localId: item.localId,
          timeId: item.timeId || null,
          date: this.formatDate(item.startTime),
          startTime: this.formatTime(item.startTime),
          endTime: this.formatTime(item.endTime),
          status: item.status || '0',
          remark: this.normalizeMealRemark(item.remark)
        }
      },
      buildTimePayload() {
        return {
          localId: this.timeForm.localId || this.createLocalId(),
          timeId: this.timeForm.timeId,
          startTime: `${this.timeForm.date} ${this.timeForm.startTime}:00`,
          endTime: `${this.timeForm.date} ${this.timeForm.endTime}:00`,
          status: this.timeForm.status,
          remark: this.normalizeMealRemark(this.timeForm.remark)
        }
      },
      validateTime() {
        if (!this.timeForm.date) return '请选择日期'
        if (!this.timeForm.startTime) return '请选择开始时间'
        if (!this.timeForm.endTime) return '请选择结束时间'
        if (!this.normalizeMealRemark(this.timeForm.remark)) return '请选择三餐'
        if (!this.isHalfHourClock(this.timeForm.startTime) || !this.isHalfHourClock(this.timeForm.endTime)) {
          return '请选择 30 分钟粒度的开始和结束时间'
        }
        const start = new Date(`${this.timeForm.date.replace(/-/g, '/')} ${this.timeForm.startTime}:00`)
        const end = new Date(`${this.timeForm.date.replace(/-/g, '/')} ${this.timeForm.endTime}:00`)
        if (!start.getTime() || !end.getTime()) return '请选择有效时间'
        if (end.getTime() <= start.getTime()) return '结束时间必须晚于开始时间'
        if (end.getTime() - start.getTime() < 3 * 60 * 60 * 1000) return '单个可预约时间段不能少于 3 小时'
        return ''
      },
      hasTimeFormInput() {
        return !!(this.timeForm.date || this.timeForm.startTime || this.timeForm.endTime || this.timeForm.remark)
      },
      upsertTimeForm() {
        const message = this.validateTime()
        if (message) {
          this.$modal.showToast(message)
          return false
        }
        const payload = this.buildTimePayload()
        const index = this.chefTimes.findIndex(item => item.localId === payload.localId)
        if (index > -1) {
          this.chefTimes.splice(index, 1, payload)
        } else {
          this.chefTimes.push(payload)
        }
        this.chefTimes = this.toTimeList(this.chefTimes)
        this.resetTimeForm()
        return true
      },
      async removeTime(item) {
        if (this.isManageMode && !this.isExpiredTime(item)) return
        try {
          await this.$modal.confirm('确认删除该可预约时间段吗？')
          if (this.isManageMode && item.timeId) {
            this.chefTimes = this.chefTimes.filter(time => time.localId !== item.localId)
            await deleteChefTime(item.timeId)
            await this.loadManageTimes()
            return
          } else {
            this.chefTimes = this.chefTimes.filter(time => time.localId !== item.localId)
          }
        } catch (error) {
          if (this.isManageMode && item.timeId && Array.isArray(this.chefTimes) && !this.chefTimes.some(time => time.localId === item.localId)) {
            await this.loadManageTimes().catch(() => {})
          }
          if (error && this.$modal && this.$modal.showToast) {
            this.$modal.showToast('删除失败，请重试')
          }
        }
      },
      flushTimeFormBeforeConfirm() {
        if (!this.hasTimeFormInput()) return true
        return this.upsertTimeForm()
      },
      confirmTimes() {
        if (this.isManageMode) {
          uni.navigateBack()
          return
        }
        if (!this.flushTimeFormBeforeConfirm()) return
        uni.setStorageSync(AVAILABLE_TIME_RESULT_KEY, this.chefTimes)
        uni.removeStorageSync(AVAILABLE_TIME_DRAFT_KEY)
        uni.navigateBack()
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

  .form-card {
    border-radius: 14rpx;
    background: #fff;
    box-shadow: 0 8rpx 28rpx rgba(20, 35, 27, 0.06);
    padding: 26rpx;
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

  .manage-tip {
    margin-top: 18rpx;
    padding: 18rpx 20rpx;
    border-radius: 8rpx;
    background: #fff4e8;
    color: #9a4c1e;
    font-size: 24rpx;
    line-height: 1.45;
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

  .time-badges {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 10rpx;
    margin-top: 8rpx;
  }

  .time-range {
    color: #17211b;
    font-size: 27rpx;
    line-height: 1.4;
  }

  .time-status {
    display: inline-block;
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

  .time-expired-tag {
    display: inline-block;
    padding: 4rpx 10rpx;
    border-radius: 6rpx;
    background: #fff0ee;
    color: #c24838;
    font-size: 22rpx;
    line-height: 1.2;
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
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 52rpx;
    padding: 0 8rpx;
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

  .input {
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

  .picker {
    display: flex;
    align-items: center;
    justify-content: space-between;
    line-height: 40rpx;
  }

  .submit {
    margin-top: 24rpx;
    height: 84rpx;
    border-radius: 8rpx;
    background: #2f8f55;
    color: #fff;
    font-size: 28rpx;
    line-height: 84rpx;
  }

  .submit {
    margin-top: 28rpx;
  }
</style>
