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
    .replace(/import\s+\{[\s\S]*?\}\s+from\s+'@\/api\/cooking\/chef'/, 'const getChefMy = () => Promise.resolve({ data: {} }); const applyChef = (data) => { apiCalls.push(["applyChef", data]); return Promise.resolve({}) }; const updateChefMy = (data) => { apiCalls.push(["updateChefMy", data]); return Promise.resolve({}) }; const uploadChefImage = () => Promise.resolve({}); const getChefTime = () => Promise.resolve({ data: [] })')
    .replace(/import\s+regionData\s+from\s+'@\/utils\/region-data'/, 'const regionData = []')
    .replace(/const chefStatus = require\('@\/utils\/chef-status'\)/, `const chefStatus = require(${JSON.stringify(path.join(__dirname, '..', 'utils', 'chef-status.js'))})`)
    .replace(/export default/, 'module.exports =')

  const sandbox = {
    module: { exports: {} },
    exports: {},
    require,
    console,
    Promise,
    apiCalls: []
  }

  vm.runInNewContext(script, sandbox, { filename: pagePath })
  return { component: sandbox.module.exports, apiCalls: sandbox.apiCalls }
}

test('work profile shows backend auditReason as reject reason', () => {
  const { component } = loadComponentOptions()
  const ctx = { chef: { auditStatus: '2', auditReason: '健康证照片不清晰' } }

  assert.equal(component.computed.rejectReason.call(ctx), '健康证照片不清晰')
})

test('rejected chef profile resubmits through update endpoint instead of creating a new application', async () => {
  const { component, apiCalls } = loadComponentOptions()
  const ctx = {
    isNew: false,
    isRejected: true,
    submitting: false,
    profileDirty: true,
    submitText: '重新提交审核',
    validate: () => '',
    buildPayload: () => ({ chefId: '1001', mobile: '13800000000' }),
    load: () => Promise.resolve(),
    $modal: {
      showToast() {},
      msgSuccess() {}
    }
  }

  await component.methods.submit.call(ctx)

  assert.deepEqual(apiCalls.map(item => item[0]), ['updateChefMy'])
  assert.equal(apiCalls[0][1].auditStatus, '0')
  assert.equal(apiCalls[0][1].auditReason, '')
})
