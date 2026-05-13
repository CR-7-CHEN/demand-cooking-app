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

test('available time popup uses full availableTimes data and sorts display in descending order', () => {
  const component = loadComponentOptions()
  const ctx = {
    chef: {
      availableTimeText: '2026-05-11 17:00 - 2026-05-11 21:00; 2026-05-12 07:00 - 2026-05-12 11:00; 2026-05-12 10:00 - 2026-05-12 14:00',
      availableTimes: [
        { startTime: '2026-05-11 17:00:00', endTime: '2026-05-11 21:00:00', status: '0' },
        { startTime: '2026-05-12 07:00:00', endTime: '2026-05-12 11:00:00', status: '0' },
        { startTime: '2026-05-12 10:00:00', endTime: '2026-05-12 14:00:00', status: '0' },
        { startTime: '2026-05-12 17:00:00', endTime: '2026-05-12 21:00:00', status: '0' }
      ]
    }
  }
  Object.assign(ctx, component.methods)

  const lines = component.computed.availableTimeLines.call(ctx)

  assert.deepEqual(Array.from(lines), [
    '2026-05-12 17:00 - 2026-05-12 21:00',
    '2026-05-12 10:00 - 2026-05-12 14:00',
    '2026-05-12 07:00 - 2026-05-12 11:00',
    '2026-05-11 17:00 - 2026-05-11 21:00'
  ])
})
