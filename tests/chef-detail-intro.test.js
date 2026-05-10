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

test('chef detail description prefers backend intro field', () => {
  const component = loadComponentOptions()
  const dataCtx = { ...component.methods }
  const ctx = component.data.call(dataCtx)
  Object.assign(ctx, component.methods)
  ctx.chefId = 12

  const chef = component.methods.normalizeChef.call(ctx, {
    chefId: 12,
    chefName: 'Chef',
    intro: '后台服务厨师简介',
    description: '旧描述字段',
    introduction: '旧介绍字段',
    remark: '备注字段'
  })

  assert.equal(chef.description, '后台服务厨师简介')
})
