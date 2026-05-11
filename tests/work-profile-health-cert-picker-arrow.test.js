const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const vm = require('node:vm')

const pagePath = path.join(__dirname, '..', 'pages', 'work', 'profile.vue')
const source = fs.readFileSync(pagePath, 'utf8')

function loadComponentOptions() {
  const match = source.match(/<script>([\s\S]*?)<\/script>/)
  assert.ok(match, 'expected work profile page to contain a script block')

  const script = match[1]
    .replace(/import\s+\{[\s\S]*?\}\s+from\s+'@\/api\/cooking\/chef'/, 'const getChefMy = () => Promise.resolve({ data: {} }); const applyChef = () => Promise.resolve({}); const updateChefMy = () => Promise.resolve({}); const uploadChefImage = () => Promise.resolve({}); const getChefTime = () => Promise.resolve({ data: [] })')
    .replace(/import\s+regionData\s+from\s+'@\/utils\/region-data'/, 'const regionData = []')
    .replace(/const chefStatus = require\('@\/utils\/chef-status'\)/, `const chefStatus = require(${JSON.stringify(path.join(__dirname, '..', 'utils', 'chef-status.js'))})`)
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

test('work profile health certificate date picker renders an arrow with open-close state classes', () => {
  assert.match(source, /<picker[\s\S]*mode="date"[\s\S]*@click="onHealthCertificatePickerOpen"[\s\S]*@change="onDateChange"[\s\S]*@cancel="onHealthCertificatePickerCancel"[\s\S]*>/)
  assert.match(source, /:class="\['input', 'picker', 'health-certificate-picker', healthCertificatePickerOpen \? 'top' : 'bottom'\]"/)
  assert.match(source, /<text class="picker-arrow"><\/text>/)
})

test('work profile health certificate date picker flips arrow state on open cancel and change', () => {
  const component = loadComponentOptions()
  const ctx = createPageContext(component)

  assert.equal(ctx.healthCertificatePickerOpen, false)

  component.methods.onHealthCertificatePickerOpen.call(ctx)
  assert.equal(ctx.healthCertificatePickerOpen, true)

  component.methods.onHealthCertificatePickerCancel.call(ctx)
  assert.equal(ctx.healthCertificatePickerOpen, false)

  component.methods.onHealthCertificatePickerOpen.call(ctx)
  component.methods.onDateChange.call(ctx, { detail: { value: '2026-06-01' } })
  assert.equal(ctx.form.healthCertificateExpireDate, '2026-06-01')
  assert.equal(ctx.healthCertificatePickerOpen, false)
})
