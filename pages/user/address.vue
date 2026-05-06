<template>
  <view class="page">
    <view v-if="loading" class="state">地址加载中...</view>
    <view v-else-if="addresses.length === 0" class="state">还没有地址，先新增一个上门地址</view>
    <view v-else class="list">
      <view
        v-for="item in addresses"
        :key="item.id || item.fullAddress"
        class="address-card"
        :class="{ default: item.isDefault }"
      >
        <view class="card-main">
          <view class="name-row">
            <text class="name">{{ item.contactName }}</text>
            <text class="phone">{{ item.phone }}</text>
            <text v-if="item.isDefault" class="default-tag">默认</text>
          </view>
          <view class="address">{{ item.fullAddress }}</view>
        </view>
        <view class="actions">
          <text @click="startEdit(item)">编辑</text>
          <text class="danger" @click="remove(item)">删除</text>
        </view>
      </view>
    </view>

    <view class="form-card">
      <view class="form-title">{{ form.id ? '编辑地址' : '新增地址' }}</view>
      <view class="field">
        <text>联系人</text>
        <input v-model="form.contactName" placeholder="请输入联系人" />
      </view>
      <view class="field">
        <text>手机号</text>
        <input v-model="form.phone" type="number" maxlength="11" placeholder="请输入手机号" />
      </view>
      <view class="field">
        <text>所在区域</text>
        <picker mode="region" :value="regionValue" @change="changeRegion">
          <view class="picker-value" :class="{ placeholder: !form.region }">
            {{ form.region || '请选择省/市/区' }}
          </view>
        </picker>
      </view>
      <view class="field">
        <text>详细地址</text>
        <input v-model="form.detailAddress" placeholder="街道、小区、楼栋" />
      </view>
      <view class="field">
        <text>门牌号</text>
        <input v-model="form.houseNumber" placeholder="如 2 单元 1201" />
      </view>
      <view class="switch-row">
        <text>设为默认地址</text>
        <switch :checked="form.isDefault" color="#2f7dff" @change="changeDefault" />
      </view>
      <button class="save-btn" :disabled="saving" @click="save">保存地址</button>
    </view>
  </view>
</template>

<script>
  import { listAddresses, addAddress, updateAddress, deleteAddress } from '@/api/cooking/user'

  export default {
    data() {
      return {
        loading: false,
        saving: false,
        regionValue: [],
        addresses: [],
        form: this.blankForm()
      }
    },
    onShow() {
      this.load()
    },
    methods: {
      blankForm() {
        return {
          id: '',
          contactName: '',
          phone: '',
          region: '',
          detailAddress: '',
          houseNumber: '',
          isDefault: false
        }
      },
      load() {
        this.loading = true
        listAddresses().then(res => {
          this.addresses = this.pickList(res).map(this.normalizeAddress)
        }).catch(() => {
          this.addresses = []
        }).finally(() => {
          this.loading = false
        })
      },
      pickList(res) {
        if (Array.isArray(res)) return res
        if (Array.isArray(res.rows)) return res.rows
        if (Array.isArray(res.data)) return res.data
        if (res.data && Array.isArray(res.data.rows)) return res.data.rows
        if (res.data && Array.isArray(res.data.list)) return res.data.list
        return []
      },
      normalizeAddress(item) {
        const region = item.region || item.area || item.district || ''
        const detail = item.detailAddress || item.address || item.detail || ''
        const house = item.houseNumber || item.doorNo || item.houseNo || ''
        const isDefault = this.normalizeDefault(item.isDefault, item.defaultFlag)
        return {
          id: item.id || item.addressId,
          contactName: item.contactName || item.name || item.receiver || '',
          phone: item.phone || item.mobile || item.contactPhone || '',
          region,
          detailAddress: detail,
          houseNumber: house,
          fullAddress: [region, detail, house].filter(Boolean).join(' '),
          isDefault
        }
      },
      normalizeDefault(...values) {
        return values.some(value => value === true || value === 1 || value === '1' || value === 'true' || value === 'Y')
      },
      parseRegionValue(region) {
        if (!region) return []
        if (Array.isArray(region)) return region.filter(Boolean)
        const parts = String(region).split(/[\s/,-]+/).filter(Boolean)
        return parts.length === 3 ? parts : []
      },
      startAdd() {
        this.form = this.blankForm()
        this.regionValue = []
      },
      startEdit(item) {
        this.form = {
          id: item.id,
          contactName: item.contactName,
          phone: item.phone,
          region: item.region,
          detailAddress: item.detailAddress,
          houseNumber: item.houseNumber,
          isDefault: !!item.isDefault
        }
        this.regionValue = this.parseRegionValue(item.region)
      },
      changeRegion(e) {
        const value = e.detail.value || []
        this.regionValue = value
        this.form.region = value.filter(Boolean).join(' ')
      },
      changeDefault(e) {
        this.form.isDefault = e.detail.value
      },
      validate() {
        if (!this.form.contactName.trim()) {
          this.$modal.msg('请填写联系人')
          return false
        }
        if (!/^1\d{10}$/.test(this.form.phone)) {
          this.$modal.msg('请填写 11 位手机号')
          return false
        }
        if (!this.form.region.trim()) {
          this.$modal.msg('请选择所在区域')
          return false
        }
        if (!this.form.detailAddress.trim()) {
          this.$modal.msg('请填写详细地址')
          return false
        }
        return true
      },
      save() {
        if (!this.validate()) return
        this.saving = true
        const action = this.form.id ? updateAddress : addAddress
        const payload = {
          ...this.form,
          defaultFlag: this.form.isDefault ? 1 : 0
        }
        action(payload).then(() => {
          this.$modal.msgSuccess('地址已保存')
          this.form = this.blankForm()
          this.regionValue = []
          this.load()
        }).finally(() => {
          this.saving = false
        })
      },
      remove(item) {
        if (!item.id) {
          this.$modal.msg('地址缺少编号，无法删除')
          return
        }
        uni.showModal({
          title: '删除地址',
          content: '删除常用地址不会影响已提交订单的地址快照，确定删除吗？',
          success: res => {
            if (!res.confirm) return
            deleteAddress(item.id).then(() => {
              this.$modal.msgSuccess('地址已删除')
              this.load()
            })
          }
        })
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
    padding: 28rpx 24rpx 48rpx;
  }

  .name-row,
  .field,
  .switch-row,
  .actions {
    display: flex;
    align-items: center;
  }

  .field,
  .switch-row {
    justify-content: space-between;
  }

  .state,
  .address-card,
  .form-card {
    border-radius: 8rpx;
    background: #fff;
    box-shadow: 0 8rpx 26rpx rgba(31, 41, 37, .06);
  }

  .state {
    margin-top: 26rpx;
    padding: 56rpx 24rpx;
    color: #7b8580;
    text-align: center;
    font-size: 26rpx;
  }

  .list {
    margin-top: 24rpx;
  }

  .address-card {
    padding: 24rpx;
    margin-bottom: 18rpx;
  }

  .address-card.default {
    border: 1rpx solid #2f7dff;
    background: #f8fbff;
  }

  .name-row {
    gap: 14rpx;
  }

  .name {
    color: #1d2b26;
    font-size: 30rpx;
    font-weight: 700;
  }

  .phone,
  .address {
    color: #6f7974;
    font-size: 25rpx;
  }

  .default-tag {
    padding: 4rpx 10rpx;
    border-radius: 6rpx;
    color: #2f7dff;
    background: #eaf2ff;
    font-size: 22rpx;
  }

  .address {
    margin-top: 12rpx;
    line-height: 1.6;
  }

  .actions {
    justify-content: flex-end;
    gap: 28rpx;
    margin-top: 18rpx;
    color: #f06a3a;
    font-size: 26rpx;
  }

  .danger {
    color: #d84a35;
  }

  .form-card {
    margin-top: 28rpx;
    padding: 26rpx;
  }

  .form-title {
    color: #1d2b26;
    font-size: 32rpx;
    font-weight: 700;
    margin-bottom: 8rpx;
  }

  .field,
  .switch-row {
    min-height: 88rpx;
    border-bottom: 1rpx solid #f0f2ef;
    color: #4e5a55;
    font-size: 28rpx;
  }

  .field input {
    flex: 1;
    height: 68rpx;
    margin-left: 24rpx;
    color: #26322d;
    text-align: right;
    font-size: 27rpx;
  }

  .field picker {
    flex: 1;
    margin-left: 24rpx;
  }

  .picker-value {
    min-height: 68rpx;
    line-height: 68rpx;
    color: #26322d;
    text-align: right;
    font-size: 27rpx;
  }

  .picker-value.placeholder {
    color: #b6bdb9;
  }

  .save-btn {
    height: 84rpx;
    line-height: 84rpx;
    margin-top: 28rpx;
    border-radius: 8rpx;
    color: #fff;
    background: #f06a3a;
    font-size: 30rpx;
  }
</style>
