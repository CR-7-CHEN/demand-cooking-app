<template>
  <view class="page">
    <view class="form-card">
      <view class="section-head">
        <view>
          <view class="section-title">可预约时间</view>
          <view class="section-desc">设置后会和入驻资料一起提交审核</view>
        </view>
      </view>

      <view v-if="chefTimes.length" class="time-list">
        <view v-for="item in chefTimes" :key="item.localId || item.timeId" class="time-row">
          <view class="time-info">
            <text class="time-range">{{ formatTimeRange(item) }}</text>
            <text :class="['time-status', item.status === '1' ? 'off' : 'on']">{{ timeStatusText(item.status) }}</text>
            <text v-if="item.remark" class="time-remark">{{ item.remark }}</text>
          </view>
          <view class="time-actions">
            <text class="text-action" @click="editTime(item)">编辑</text>
            <text class="text-action danger" @click="removeTime(item)">删除</text>
          </view>
        </view>
      </view>
      <view v-else class="empty-time">暂无可预约时间，请选择下方日期和时间</view>

      <view class="time-form">
        <view class="field">
          <text class="label">日期</text>
          <picker mode="date" :value="timeForm.date" @change="onTimeDateChange">
            <view class="input picker">{{ timeForm.date || '请选择日期' }}</view>
          </picker>
        </view>
        <view class="time-grid">
          <view class="field">
            <text class="label">开始</text>
            <picker mode="time" :value="timeForm.startTime" @change="onStartTimeChange">
              <view class="input picker">{{ timeForm.startTime || '请选择' }}</view>
            </picker>
          </view>
          <view class="field">
            <text class="label">结束</text>
            <picker mode="time" :value="timeForm.endTime" @change="onEndTimeChange">
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

    <button class="submit" @click="confirmTimes">确认</button>
  </view>
</template>

<script>
  const AVAILABLE_TIME_DRAFT_KEY = 'work_profile_available_time_draft'
  const AVAILABLE_TIME_RESULT_KEY = 'work_profile_available_time_result'
  const MEAL_OPTIONS = ['早餐', '午餐', '晚餐']

  export default {
    data() {
      return {
        chefTimes: [],
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
      timeStatusIndex() {
        const index = this.timeStatusOptions.findIndex(item => item.value === this.timeForm.status)
        return index > -1 ? index : 0
      },
      mealOptionIndex() {
        const index = this.mealOptions.findIndex(item => item === this.timeForm.remark)
        return index > -1 ? index : 0
      }
    },
    onLoad() {
      this.loadDraft()
    },
    methods: {
      loadDraft() {
        const draft = uni.getStorageSync(AVAILABLE_TIME_DRAFT_KEY)
        this.chefTimes = this.toTimeList(Array.isArray(draft) ? draft : [])
      },
      toTimeList(list) {
        return list.map(item => this.normalizeTimeItem(item))
          .filter(item => item.startTime && item.endTime)
          .sort((a, b) => String(a.startTime || '').localeCompare(String(b.startTime || '')))
      },
      normalizeTimeItem(item) {
        const localId = item.localId || item.timeId || this.createLocalId()
        return {
          localId: String(localId),
          timeId: item.timeId || null,
          startTime: item.startTime || '',
          endTime: item.endTime || '',
          status: item.status || '0',
          remark: this.normalizeMealRemark(item.remark)
        }
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
      timeStatusText(status) {
        return status === '1' ? '停用' : '启用'
      },
      onTimeDateChange(e) {
        this.timeForm.date = e.detail.value
      },
      onStartTimeChange(e) {
        this.timeForm.startTime = e.detail.value
      },
      onEndTimeChange(e) {
        this.timeForm.endTime = e.detail.value
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
        const start = new Date(`${this.timeForm.date.replace(/-/g, '/')} ${this.timeForm.startTime}:00`)
        const end = new Date(`${this.timeForm.date.replace(/-/g, '/')} ${this.timeForm.endTime}:00`)
        if (!start.getTime() || !end.getTime()) return '请选择有效时间'
        if (end.getTime() <= start.getTime()) return '结束时间必须晚于开始时间'
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
      removeTime(item) {
        this.$modal.confirm('确认删除该可预约时间段吗？').then(() => {
          this.chefTimes = this.chefTimes.filter(time => time.localId !== item.localId)
        })
      },
      flushTimeFormBeforeConfirm() {
        if (!this.hasTimeFormInput()) return true
        return this.upsertTimeForm()
      },
      confirmTimes() {
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
