const { readFileSync } = require('node:fs')
const { resolve } = require('node:path')
const test = require('node:test')
const assert = require('node:assert/strict')
const vm = require('node:vm')

const pagePath = resolve(__dirname, '..', 'pages', 'user', 'chef-detail.vue')
const source = readFileSync(pagePath, 'utf8')

function loadComponentOptions() {
  const match = source.match(/<script>([\s\S]*?)<\/script>/)
  assert.ok(match, 'expected chef detail page to contain a script block')

  const script = match[1]
    .replace(/import\s+\{\s*getToken\s*\}\s+from\s+'@\/utils\/auth'\s*/, "const getToken = () => ''\n")
    .replace(/import\s+\{\s*getChef,\s*listAddresses,\s*listDishes,\s*submitOrder\s*\}\s+from\s+'@\/api\/cooking\/user'\s*/, "const getChef = () => Promise.resolve({})\nconst listAddresses = () => Promise.resolve([])\nconst listDishes = () => Promise.resolve([])\nconst submitOrder = () => Promise.resolve({})\n")
    .replace(/import appConfig from '@\/config'\s*/, 'const appConfig = { baseUrl: "http://localhost:8080" }\n')
    .replace(/export default/, 'module.exports =')

  const sandbox = {
    module: { exports: {} },
    exports: {},
    require,
    console,
    Promise,
    Date
  }

  vm.runInNewContext(script, sandbox, { filename: pagePath })
  return sandbox.module.exports
}

test('chef detail shows available time through a popup opened by click', () => {
  assert.match(source, /<uni-popup\s+ref="availableTimePopup"/)
  assert.match(source, /@click="openAvailableTimePopup"/)
  assert.match(source, /time-dialog__content[\s\S]*availableTimeLines/)
})

test('chef detail address block is not wrapped in a picker', () => {
  assert.doesNotMatch(source, /<picker\s+v-if="addresses\.length"[^>]*addressOptions/)
  assert.match(source, /<view\s+v-if="addresses\.length"\s+class="select-box"/)
})

test('chef detail address action is labeled select address', () => {
  assert.match(source, /<button class="text-btn" @click="goAddress">/)
  assert.doesNotMatch(source, />缁狅紕鎮婇崷鏉挎絻<\/button>/)
})

test('available time popup renders time segments as separate lines', () => {
  assert.match(source, /v-for="item in availableTimeLines"/)
  assert.match(source, /formatAvailableTimeLines\(text\)/)
})

test('dish items can be selected by tapping the row', () => {
  assert.match(source, /@tap="toggleDishSelection\(dish\)"/)
  assert.match(source, /isDishSelected\(dish\.id\)/)
  assert.match(source, /'is-selected': isDishSelected\(dish\.id\)/)
  assert.match(source, /@tap\.stop="toggleDishSelection\(dish\)"/)
  assert.doesNotMatch(source, /<checkbox-group/)
})

test('open available time popup calls the popup ref', () => {
  const component = loadComponentOptions()
  let opened = false
  const ctx = {
    $refs: {
      availableTimePopup: {
        open() {
          opened = true
        }
      }
    }
  }

  component.methods.openAvailableTimePopup.call(ctx)

  assert.equal(opened, true)
})

test('toggle dish selection adds and removes dish ids', () => {
  const component = loadComponentOptions()
  const ctx = { selectedDishIds: [] }

  component.methods.toggleDishSelection.call(ctx, { id: 7 })
  assert.deepEqual(ctx.selectedDishIds, ['7'])

  component.methods.toggleDishSelection.call(ctx, { id: 7 })
  assert.deepEqual(ctx.selectedDishIds, [])
})

test('format available time lines splits colon and semicolon separated segments', () => {
  const component = loadComponentOptions()
  const lines = component.methods.formatAvailableTimeLines.call({}, '閺冣晠顦? 08:00-09:00; 閸楀牓顦? 11:00-12:00')

  assert.deepEqual(Array.from(lines), ['閺冣晠顦? 08:00-09:00', '閸楀牓顦? 11:00-12:00'])
})

test('available time popup uses full availableTimes data and sorts by start time descending', () => {
  const component = loadComponentOptions()
  const ctx = {
    chef: {
      availableTimes: [
        { startTime: '2026-05-11 08:00:00', endTime: '2026-05-11 12:00:00', status: '0' },
        { startTime: '2026-05-12 17:00:00', endTime: '2026-05-12 21:00:00', status: '0' },
        { startTime: '2026-05-10 09:00:00', endTime: '2026-05-10 13:00:00', status: '0' }
      ],
      availableTimeText: '2026-05-11 08:00-12:00'
    }
  }
  Object.assign(ctx, component.methods)

  const lines = component.computed.availableTimeLines.call(ctx)

  assert.deepEqual(Array.from(lines), [
    '2026-05-12 17:00 - 2026-05-12 21:00',
    '2026-05-11 08:00 - 2026-05-11 12:00',
    '2026-05-10 09:00 - 2026-05-10 13:00'
  ])
})

test('chef detail booking uses range pickers backed by valid booking options', () => {
  assert.match(source, /<picker :range="bookingDateOptions" :value="bookingDateIndex" @change="changeBookingDate"/)
  assert.match(source, /<picker :range="bookingTimeOptions" :value="bookingTimeIndex" @change="changeBookingTime"/)
  assert.match(source, /bookingDateOptions\(\)/)
  assert.match(source, /bookingTimeOptions\(\)/)
  assert.doesNotMatch(source, /<picker mode="date"/)
  assert.doesNotMatch(source, /<picker mode="time"/)
})

test('booking time options preserve ascending order for the selected date', () => {
  const component = loadComponentOptions()
  const ctx = {
    bookingStartOptions: [
      { date: '2026-05-12', time: '17:00' },
      { date: '2026-05-12', time: '17:30' },
      { date: '2026-05-12', time: '18:00' },
      { date: '2026-05-13', time: '09:00' }
    ],
    form: {
      date: '2026-05-12'
    }
  }

  const options = component.computed.bookingTimeOptions.call(ctx)

  assert.deepEqual(Array.from(options), ['17:00', '17:30', '18:00'])
})

test('chef detail template does not contain broken closing tags or unterminated placeholders', () => {
  assert.doesNotMatch(source, /\?\/view>/)
  assert.doesNotMatch(source, /\?\/text>/)
  assert.doesNotMatch(source, /\?\/button>/)
  assert.doesNotMatch(source, /placeholder="[^"]*<\/textarea>/)
})

test('collect booking slots keeps only half-hour valid starts within the next 3 days', () => {
  const component = loadComponentOptions()
  const slots = component.methods.collectBookingStartOptions.call({}, [
    { startTime: '2026-05-11 09:00:00', endTime: '2026-05-11 12:00:00', status: '0' },
    { startTime: '2026-05-11 10:20:00', endTime: '2026-05-11 14:20:00', status: '0' },
    { startTime: '2026-05-11 10:00:00', endTime: '2026-05-11 14:00:00', status: '0' },
    { startTime: '2026-05-15 10:00:00', endTime: '2026-05-15 15:00:00', status: '0' },
    { startTime: '2026-05-11 15:00:00', endTime: '2026-05-11 19:00:00', status: '1' }
  ], Date.parse('2026-05-11T09:30:00+08:00'))

  const values = Array.from(slots, item => item.startTime)
  assert.ok(values.includes('2026-05-11 10:30:00'))
  assert.ok(values.includes('2026-05-11 11:00:00'))
  assert.ok(!values.includes('2026-05-11 10:20:00'))
  assert.ok(!values.includes('2026-05-11 10:40:00'))
  assert.ok(!values.includes('2026-05-11 10:50:00'))
  assert.ok(!values.includes('2026-05-11 11:20:00'))
  assert.ok(!values.includes('2026-05-11 11:30:00'))
})

test('validate time rejects a start outside the computed booking options', () => {
  const component = loadComponentOptions()
  const validStart = new Date(Date.now() + 61 * 60 * 1000)
  const validEnd = new Date(validStart.getTime() + 3 * 60 * 60 * 1000)
  let message = ''
  const ctx = {
    chef: {
      availableTimes: [
        {
          startTime: component.methods.formatDateTime.call({}, validStart),
          endTime: component.methods.formatDateTime.call({}, validEnd),
          status: '0'
        }
      ]
    },
    bookingStartOptions: [],
    form: {
      date: '',
      time: ''
    },
    $modal: {
      msg(value) {
        message = value
      }
    }
  }
  Object.assign(ctx, component.methods)
  const result = component.methods.validateTime.call({
    ...ctx
  }, component.methods.formatDateTime.call({}, new Date(validStart.getTime() + 10 * 60 * 1000)))

  assert.equal(result, false)
  assert.ok(message)
})

test('validate time recomputes booking options to reject stale starts that are no longer 60 minutes ahead', () => {
  const component = loadComponentOptions()
  const realNow = Date.now
  const baseNow = realNow()
  const start = new Date(baseNow + 61 * 60 * 1000)
  const end = new Date(start.getTime() + 3 * 60 * 60 * 1000 + 10 * 60 * 1000)
  const ctx = {
    chef: {
      availableTimes: [
        {
          startTime: component.methods.formatDateTime.call({}, start),
          endTime: component.methods.formatDateTime.call({}, end),
          status: '0'
        }
      ]
    },
    bookingStartOptions: [
      {
        value: component.methods.formatDateTime.call({}, start),
        date: component.methods.formatDate.call({}, start),
        time: component.methods.formatClock.call({}, start)
      }
    ],
    form: {
      date: component.methods.formatDate.call({}, start),
      time: component.methods.formatClock.call({}, start)
    },
    $modal: {
      msg(value) {
        ctx.modalMessage = value
      }
    }
  }
  Object.assign(ctx, component.methods)

  Date.now = () => baseNow + 2 * 60 * 1000
  try {
    const result = component.methods.validateTime.call(ctx, component.methods.formatDateTime.call({}, start))
    const latestOptions = component.methods.collectBookingStartOptions.call(ctx, ctx.chef.availableTimes, baseNow + 2 * 60 * 1000)

    assert.equal(result, false)
    if (latestOptions.length) {
      assert.equal(ctx.form.date, latestOptions[0].date)
      assert.equal(ctx.form.time, latestOptions[0].time)
    } else {
      assert.equal(ctx.form.date, '')
      assert.equal(ctx.form.time, '')
    }
    assert.ok(ctx.modalMessage)
  } finally {
    Date.now = realNow
  }
})
