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
        <picker
          mode="multiSelector"
          :range="regionColumns"
          :value="regionValue"
          @click="onRegionPickerOpen"
          @columnchange="onRegionColumnChange"
          @change="changeRegion"
          @cancel="onRegionCancel"
        >
          <view
            :class="['picker-value', { placeholder: !form.region }, regionPickerOpen ? 'top' : 'bottom']"
            @click="onRegionPickerOpen"
          >
            <text>{{ form.region || '请选择省/市/区' }}</text>
            <text class="picker-arrow"></text>
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
        <text class="default-switch-label">设为默认地址</text>
        <switch class="blue" :class="{ checked: form.isDefault }" :checked="form.isDefault" color="#2f7dff" @change="changeDefault" />
      </view>
      <button class="save-btn" :disabled="saving" @click="save">保存地址</button>
    </view>
  </view>
</template>

<script>
  import { listAddresses, addAddress, updateAddress, deleteAddress } from '@/api/cooking/user'
  import regionData from '@/utils/region-data'

  export default {
    data() {
      return {
        loading: false,
        saving: false,
        regionValue: [0, 0, 0],
        regionPickerOpen: false,
        addresses: [],
        form: this.blankForm()
      }
    },
    computed: {
      regionColumns() {
        const provinceList = this.getProvinceList()
        const cityList = this.getCityList(this.regionValue[0])
        const districtList = this.getDistrictList(this.regionValue[0], this.regionValue[1])
        return [
          provinceList.map(item => item.name),
          cityList.map(item => item.name),
          districtList.map(item => typeof item === 'string' ? item : item.name)
        ]
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
        const region = item.region || item.areaName || item.area || item.district || ''
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
        if (!region) return [0, 0, 0]
        if (Array.isArray(region)) return this.normalizeRegionValue(region)
        const parts = String(region).split(/[\s/,-]+/).filter(Boolean)
        return parts.length >= 3 ? this.findRegionValue(parts.slice(0, 3)) : [0, 0, 0]
      },
      startAdd() {
        this.form = this.blankForm()
        this.regionValue = [0, 0, 0]
        this.regionPickerOpen = false
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
      changeRegion(e) {
        this.regionPickerOpen = false
        const value = this.normalizeRegionValue(e.detail && e.detail.value ? e.detail.value : this.regionValue)
        this.regionValue = value
        this.form.region = this.getRegionName(value)
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
        const nextValue = Array.isArray(value) ? value : []
        const provinceList = this.getProvinceList()
        const provinceIndex = this.clampIndex(nextValue[0], provinceList.length)
        const cityList = this.getCityList(provinceIndex)
        const cityIndex = this.clampIndex(nextValue[1], cityList.length)
        const districtList = this.getDistrictList(provinceIndex, cityIndex)
        const districtIndex = this.clampIndex(nextValue[2], districtList.length)
        return [provinceIndex, cityIndex, districtIndex]
      },
      clampIndex(index, length) {
        const value = Number(index || 0)
        if (!length || value < 0) return 0
        return value >= length ? length - 1 : value
      },
      getRegionName(value) {
        const regionValue = this.normalizeRegionValue(value)
        const province = this.getProvinceList()[regionValue[0]]
        const city = this.getCityList(regionValue[0])[regionValue[1]]
        const district = this.getDistrictList(regionValue[0], regionValue[1])[regionValue[2]]
        const districtName = typeof district === 'string' ? district : district && district.name
        return [province && province.name, city && city.name, districtName].filter(Boolean).join(' ')
      },
      findRegionValue(parts) {
        const provinceIndex = this.getProvinceList().findIndex(item => item.name === parts[0])
        if (provinceIndex < 0) return [0, 0, 0]
        const cityIndex = this.getCityList(provinceIndex).findIndex(item => item.name === parts[1])
        if (cityIndex < 0) return [provinceIndex, 0, 0]
        const districtIndex = this.getDistrictList(provinceIndex, cityIndex).findIndex(item => {
          const name = typeof item === 'string' ? item : item && item.name
          return name === parts[2]
        })
        return this.normalizeRegionValue([provinceIndex, cityIndex, districtIndex < 0 ? 0 : districtIndex])
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
      buildPayload() {
        return {
          addressId: this.form.id || null,
          contactName: this.form.contactName,
          contactPhone: this.form.phone,
          areaName: this.form.region,
          detailAddress: this.form.detailAddress,
          houseNumber: this.form.houseNumber,
          defaultFlag: this.form.isDefault ? 'Y' : 'N'
        }
      },
      save() {
        if (!this.validate()) return
        this.saving = true
        const action = this.form.id ? updateAddress : addAddress
        const payload = this.buildPayload()
        action(payload).then(() => {
          this.$modal.msgSuccess('地址已保存')
          this.form = this.blankForm()
          this.regionValue = [0, 0, 0]
          this.regionPickerOpen = false
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

  .default-switch-label {
    color: #2f7dff;
    font-weight: 600;
  }

  .field picker {
    flex: 1;
    margin-left: 24rpx;
  }

  .picker-value {
    display: flex;
    align-items: center;
    justify-content: flex-end;
    gap: 12rpx;
    min-height: 68rpx;
    line-height: 68rpx;
    color: #26322d;
    text-align: right;
    font-size: 27rpx;
  }

  .picker-value.placeholder {
    color: #b6bdb9;
  }

  .picker-arrow {
    width: 12rpx;
    height: 12rpx;
    border-right: 2rpx solid #8a8f98;
    border-bottom: 2rpx solid #8a8f98;
    transition: transform .2s ease;
  }

  .picker-value.bottom .picker-arrow {
    transform: rotate(45deg);
  }

  .picker-value.top .picker-arrow {
    transform: rotate(225deg);
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
