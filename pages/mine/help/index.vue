<template>
  <view class="help-container">
    <view v-for="(item, findex) in list" :key="findex" :title="item.title" class="list-title">
      <view class="text-title">
        <view :class="item.icon"></view>{{ item.title }}
      </view>
      <view class="childList">
        <view v-for="(child, zindex) in item.childList" :key="zindex" class="question" hover-class="hover"
          @click="handleText(child)">
          <view class="text-item">{{ child.title }}</view>
          <view class="line" v-if="zindex !== item.childList.length - 1"></view>
        </view>
      </view>
    </view>
  </view>
</template>

<script>
  export default {
    data() {
      return {
        list: [{
            icon: 'iconfont icon-help',
            title: '预约服务',
            childList: [{
              title: '如何预约上门家厨？',
              content: '进入首页选择服务类型、用餐时间、用餐人数和地址，提交订单后等待服务厨师接单。'
            }, {
              title: '可以提前多久预约？',
              content: '建议至少提前1天预约，节假日或多人聚餐建议更早提交，方便平台匹配合适人员。'
            }, {
              title: '食材由谁准备？',
              content: '下单时可选择用户自备食材，或按页面支持的服务说明由服务厨师协助采购。具体以订单确认信息为准。'
            }, {
              title: '可以备注口味和忌口吗？',
              content: '可以。提交订单时填写口味偏好、忌口、过敏源、厨房条件等信息，服务厨师会按备注准备服务。'
            }]
          },
          {
            icon: 'iconfont icon-help',
            title: '订单与售后',
            childList: [{
              title: '如何查看订单状态？',
              content: '进入我的订单，可查看待接单、待服务、服务中、已完成等状态，以及服务厨师信息和预约时间。'
            }, {
              title: '服务完成后如何评价？',
              content: '订单完成后可在订单详情中提交评分和评价，评价会用于后续服务人员匹配和服务质量改进。'
            }, {
              title: '订单取消、退款或投诉怎么处理？',
              content: '请在订单详情发起取消、退款或投诉申请，平台会根据服务进度、取消原因和规则进行处理。'
            }, {
              title: '如何成为服务厨师？',
              content: '进入入驻申请页面，按要求填写身份、服务区域、擅长菜系和资质信息，审核通过后即可接收平台订单。'
            }]
          }
        ]
      }
    },
    methods: {
      handleText(item) {
        this.$tab.navigateTo(`/pages/common/textview/index?title=${item.title}&content=${item.content}`)
      }
    }
  }
</script>

<style lang="scss" scoped>
  page {
    background-color: #fff7f0;
  }

  .help-container {
    margin-bottom: 100rpx;
    padding: 30rpx;
  }

  .list-title {
    margin-bottom: 30rpx;
  }

  .childList {
    background: #ffffff;
    box-shadow: 0px 0px 10rpx rgba(193, 193, 193, 0.2);
    border-radius: 16rpx;
    margin-top: 10rpx;
  }

  .line {
    width: 100%;
    height: 1rpx;
    background-color: #F5F5F5;
  }

  .text-title {
    color: #303133;
    font-size: 32rpx;
    font-weight: bold;
    margin-left: 10rpx;

    .iconfont {
      font-size: 16px;
      margin-right: 10rpx;
    }
  }

  .text-item {
    font-size: 28rpx;
    padding: 24rpx;
  }

  .question {
    color: #606266;
    font-size: 28rpx;
  }
</style>
