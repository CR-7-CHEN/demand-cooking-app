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
  assert.match(source, /time-dialog__content[\s\S]*chef\.availableTimeText/)
})

test('chef detail address block is not wrapped in a picker', () => {
  assert.doesNotMatch(source, /<picker\s+v-if="addresses\.length"[^>]*addressOptions/)
  assert.match(source, /<view\s+v-if="addresses\.length"\s+class="select-box"/)
})

test('chef detail address action is labeled select address', () => {
  assert.match(source, /<button class="text-btn" @click="goAddress">选择地址<\/button>/)
  assert.doesNotMatch(source, />管理地址<\/button>/)
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
  const lines = component.methods.formatAvailableTimeLines.call({}, '早餐: 08:00-09:00; 午餐: 11:00-12:00')

  assert.deepEqual(Array.from(lines), ['早餐 08:00-09:00', '午餐 11:00-12:00'])
})
