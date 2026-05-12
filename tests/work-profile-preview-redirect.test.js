const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const vm = require('node:vm')

const pagePath = path.join(__dirname, '..', 'pages', 'work', 'profile.vue')
const source = fs.readFileSync(pagePath, 'utf8')

function loadComponentOptions(apiOverrides = {}) {
  const match = source.match(/<script>([\s\S]*?)<\/script>/)
  assert.ok(match, 'expected work profile page to contain a script block')

  const script = match[1]
    .replace(
      /import\s+\{\s*getChefMy,\s*applyChef,\s*updateChefMy,\s*uploadChefImage,\s*getChefTime\s*\}\s+from\s+'@\/api\/cooking\/chef'/,
      [
        'const getChefMy = globalThis.__testApi.getChefMy',
        'const applyChef = globalThis.__testApi.applyChef',
        'const updateChefMy = globalThis.__testApi.updateChefMy',
        'const uploadChefImage = globalThis.__testApi.uploadChefImage',
        'const getChefTime = globalThis.__testApi.getChefTime'
      ].join('\n')
    )
    .replace(/import appConfig from '@\/config'/, 'const appConfig = { baseUrl: "http://localhost:8080" }')
    .replace(/import regionData from '@\/utils\/region-data'/, 'const regionData = []')
    .replace(/const chefStatus = require\('@\/utils\/chef-status'\)/, `const chefStatus = require(${JSON.stringify(path.join(__dirname, '..', 'utils', 'chef-status.js'))})`)
    .replace(/export default/, 'module.exports =')

  const uniCalls = []
  const sandbox = {
    module: { exports: {} },
    exports: {},
    require,
    console,
    Promise,
    Date,
    Math,
    uni: {
      previewImage(options) {
        uniCalls.push(['previewImage', options])
      },
      showLoading() {},
      hideLoading() {},
      chooseImage() {},
      setStorageSync() {},
      getStorageSync() { return null },
      removeStorageSync() {},
      navigateTo() {}
    },
    globalThis: {
      __testApi: {
        getChefMy: () => Promise.resolve({ data: {} }),
        applyChef: () => Promise.resolve({}),
        updateChefMy: () => Promise.resolve({}),
        uploadChefImage: () => Promise.resolve({ data: { url: 'https://img.test/demo.jpg' } }),
        getChefTime: () => Promise.resolve({ data: [] }),
        ...apiOverrides
      }
    }
  }

  vm.runInNewContext(script, sandbox, { filename: pagePath })
  return { component: sandbox.module.exports, uniCalls }
}

function createPageContext(component, overrides = {}) {
  const base = {
    $modal: {
      showToast() {},
      msgSuccess() {}
    },
    $tab: {
      switchTab() {}
    },
    $nextTick(fn) {
      if (typeof fn === 'function') fn()
    }
  }
  const ctx = { ...base, ...overrides }
  const data = component.data ? component.data.call(ctx) : {}
  Object.assign(ctx, data, component.methods)

  if (component.computed) {
    Object.keys(component.computed).forEach(key => {
      Object.defineProperty(ctx, key, {
        configurable: true,
        enumerable: true,
        get() {
          return component.computed[key].call(ctx)
        }
      })
    })
  }

  return ctx
}

test('work profile uses native preview for work images', () => {
  assert.match(source, /@tap\.stop="previewWorkImage\(index\)"/)
  assert.doesNotMatch(source, /@click="openImagePreview\(item,\s*workImageList\)"/)
  assert.match(source, /uni\.previewImage\(/)
})

test('work profile submit redirects to mine tab after success', async () => {
  const { component } = loadComponentOptions({
    applyChef: () => Promise.resolve({})
  })
  const calls = []
  const ctx = createPageContext(component, {
    chef: {},
    $modal: {
      showToast(message) {
        calls.push(['toast', message])
      },
      msgSuccess(message) {
        calls.push(['success', message])
      }
    },
    $tab: {
      switchTab(url) {
        calls.push(['switchTab', url])
      }
    }
  })

  Object.assign(ctx.form, {
    realName: '测试厨师',
    phone: '13800138000',
    age: '32',
    gender: '1',
    avatarUrl: 'https://img.test/avatar.jpg',
    cuisineTags: '家常菜',
    serviceArea: '浙江省 杭州市 西湖区',
    healthCertificateImageUrl: 'https://img.test/health.jpg',
    healthCertificateExpireDate: '2026-12-31',
    introduction: '简介'
  })
  ctx.serviceAreaList = ['浙江省 杭州市 西湖区']
  ctx.workImageList = ['https://img.test/work-1.jpg']
  ctx.chefTimes = [{
    startTime: '2026-05-12 10:00:00',
    endTime: '2026-05-12 12:00:00',
    status: '0',
    remark: '午餐'
  }]

  await component.methods.submit.call(ctx)
  await Promise.resolve()
  await Promise.resolve()

  assert.ok(calls.some(item => item[0] === 'success'))
  assert.deepEqual(calls.find(item => item[0] === 'switchTab'), ['switchTab', '/pages/mine/index'])
})

test('work profile blocks repeated submit while chef apply is pending', async () => {
  let updateCalls = 0
  const { component } = loadComponentOptions({
    updateChefMy: () => {
      updateCalls += 1
      return Promise.resolve({})
    }
  })
  const calls = []
  const ctx = createPageContext(component, {
    $modal: {
      showToast(message) {
        calls.push(['toast', message])
      },
      msgSuccess(message) {
        calls.push(['success', message])
      }
    }
  })
  ctx.chef = {
    chefId: 1001,
    auditStatus: '0'
  }
  ctx.validate = () => ''
  ctx.buildPayload = () => ({ chefId: 1001 })

  await component.methods.submit.call(ctx)
  await Promise.resolve()
  await Promise.resolve()

  assert.equal(updateCalls, 0)
  assert.deepEqual(calls.find(item => item[0] === 'toast'), ['toast', '当前入驻申请正在审核中，请勿重复提交'])
})
