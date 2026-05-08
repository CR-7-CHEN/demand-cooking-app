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
    .replace(/import\s+regionData\s+from\s+'@\/utils\/region-data'\s*/, "const regionData = []\n")
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
  return ctx
}

test('common address page maps save payload to backend field names', () => {
  const component = loadComponentOptions()
  const ctx = createPageContext(component)

  ctx.form = {
    id: '88',
    contactName: '张三',
    phone: '13800000000',
    region: '浙江省 杭州市 西湖区',
    detailAddress: '文三路 99 号',
    houseNumber: '2 单元 1201',
    isDefault: true
  }

  const payload = component.methods.buildPayload.call(ctx)
  assert.deepEqual(JSON.parse(JSON.stringify(payload)), {
    addressId: '88',
    contactName: '张三',
    contactPhone: '13800000000',
    areaName: '浙江省 杭州市 西湖区',
    detailAddress: '文三路 99 号',
    houseNumber: '2 单元 1201',
    defaultFlag: 'Y'
  })

  ctx.form.id = ''
  ctx.form.isDefault = false
  const addPayload = component.methods.buildPayload.call(ctx)
  assert.equal(addPayload.addressId, null)
  assert.equal(addPayload.defaultFlag, 'N')
})
