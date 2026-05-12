const { readFileSync } = require('node:fs')
const { resolve } = require('node:path')
const test = require('node:test')
const assert = require('node:assert/strict')
const vm = require('node:vm')

const pagePath = resolve(__dirname, '..', 'pages', 'work', 'profile-time.vue')
const source = readFileSync(pagePath, 'utf8')

function loadComponentOptions() {
  const match = source.match(/<script>([\s\S]*?)<\/script>/)
  assert.ok(match, 'expected profile time page to contain a script block')

  const script = match[1]
    .replace(/import\s+\{\s*getChefTime,\s*deleteChefTime\s*\}\s+from\s+'@\/api\/cooking\/chef'\s*/, "const getChefTime = () => Promise.resolve([])\nconst deleteChefTime = () => Promise.resolve()\n")
    .replace(/export default/, 'module.exports =')

  const sandbox = {
    module: { exports: {} },
    exports: {},
    require,
    console,
    Promise,
    Date,
    uni: {
      getStorageSync() {
        return []
      },
      setStorageSync() {},
      removeStorageSync() {},
      navigateBack() {}
    }
  }

  vm.runInNewContext(script, sandbox, { filename: pagePath })
  return sandbox.module.exports
}

test('profile time page validates a single available slot must be at least 3 hours', () => {
  const component = loadComponentOptions()
  const mealOptions = component.data().mealOptions
  const message = component.methods.validateTime.call({
    mealOptions,
    isHalfHourClock: component.methods.isHalfHourClock,
    timeForm: {
      date: '2026-05-11',
      startTime: '10:00',
      endTime: '12:30',
      remark: mealOptions[1]
    },
    normalizeMealRemark: component.methods.normalizeMealRemark
  })

  assert.match(message, /3/)
})

test('profile time page uses half-hour picker options instead of free time mode', () => {
  assert.match(source, /<picker :range="halfHourOptions" :value="startTimeIndex" @change="onStartTimeChange">/)
  assert.match(source, /<picker :range="halfHourOptions" :value="endTimeIndex" @change="onEndTimeChange">/)
  assert.doesNotMatch(source, /<picker mode="time" :value="timeForm\.startTime" @change="onStartTimeChange">/)
  assert.doesNotMatch(source, /<picker mode="time" :value="timeForm\.endTime" @change="onEndTimeChange">/)
})

test('profile time page only accepts half-hour start and end times', () => {
  const component = loadComponentOptions()
  const mealOptions = component.data().mealOptions
  const message = component.methods.validateTime.call({
    mealOptions,
    timeForm: {
      date: '2026-05-11',
      startTime: '10:10',
      endTime: '13:30',
      remark: mealOptions[1]
    },
    normalizeMealRemark: component.methods.normalizeMealRemark,
    isHalfHourClock: component.methods.isHalfHourClock
  })

  assert.equal(message, '请选择 30 分钟粒度的开始和结束时间')
})
