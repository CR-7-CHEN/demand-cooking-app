const { readFileSync } = require('node:fs')
const { resolve } = require('node:path')
const test = require('node:test')
const assert = require('node:assert/strict')
const vm = require('node:vm')

const pagePath = resolve(__dirname, '..', 'pages', 'user', 'address.vue')
const source = readFileSync(pagePath, 'utf8')

function loadComponentOptions() {
  const match = source.match(/<script>([\s\S]*?)<\/script>/)
  assert.ok(match, 'expected address page to contain a script block')

  const script = match[1]
    .replace(/import\s+\{\s*listAddresses,\s*addAddress,\s*updateAddress,\s*deleteAddress\s*\}\s+from\s+'@\/api\/cooking\/user'\s*/, "const listAddresses = () => Promise.resolve([])\nconst addAddress = () => Promise.resolve({})\nconst updateAddress = () => Promise.resolve({})\nconst deleteAddress = () => Promise.resolve({})\n")
    .replace(/import\s+regionData\s+from\s+'@\/utils\/region-data'\s*/, `const regionData = [
      { name: '浙江省', children: [{ name: '杭州市', children: ['西湖区', '滨江区'] }] },
      { name: '上海市', children: [{ name: '市辖区', children: ['浦东新区'] }] }
    ]\n`)
    .replace(/export default/, 'module.exports =')

  const sandbox = {
    module: { exports: {} },
    exports: {},
    require,
    console,
    Promise
  }

  vm.runInNewContext(script, sandbox, { filename: pagePath })
  return sandbox.module.exports
}

function createPageContext(component) {
  const ctx = Object.assign({}, component.methods)
  Object.assign(ctx, component.data ? component.data.call(ctx) : {})
  Object.entries(component.computed || {}).forEach(([key, getter]) => {
    Object.defineProperty(ctx, key, { get: () => getter.call(ctx) })
  })
  return ctx
}

test('common address page uses local multi-column region data and shows open-close arrows', () => {
  assert.match(source, /import regionData from '@\/utils\/region-data'/)
  assert.match(source, /mode="multiSelector"/)
  assert.match(source, /:range="regionColumns"/)
  assert.match(source, /@columnchange="onRegionColumnChange"/)
  assert.match(source, /@cancel="onRegionCancel"/)
  assert.match(source, /:class="\['picker-value'[\s\S]*regionPickerOpen \? 'top' : 'bottom'/)
  assert.match(source, /<text class="picker-arrow"><\/text>/)
})

test('common address page builds province city district columns and updates selected region text', () => {
  const component = loadComponentOptions()
  const ctx = createPageContext(component)

  assert.deepEqual(JSON.parse(JSON.stringify(ctx.regionColumns)), [
    ['浙江省', '上海市'],
    ['杭州市'],
    ['西湖区', '滨江区']
  ])

  component.methods.onRegionColumnChange.call(ctx, { detail: { column: 2, value: 1 } })
  component.methods.changeRegion.call(ctx, { detail: { value: [0, 0, 1] } })

  assert.deepEqual(JSON.parse(JSON.stringify(ctx.regionValue)), [0, 0, 1])
  assert.equal(ctx.form.region, '浙江省 杭州市 滨江区')
  assert.equal(ctx.regionPickerOpen, false)
})
