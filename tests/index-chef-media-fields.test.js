const { readFileSync } = require('node:fs')
const { resolve } = require('node:path')
const test = require('node:test')
const assert = require('node:assert/strict')
const vm = require('node:vm')

const pagePath = resolve(__dirname, '..', 'pages', 'index.vue')
const source = readFileSync(pagePath, 'utf8')

function loadComponentOptions(baseUrl = 'http://localhost:8080') {
  const match = source.match(/<script>([\s\S]*?)<\/script>/)
  assert.ok(match, 'expected homepage to contain a script block')

  const script = match[1]
    .replace(/import\s+\{\s*getToken\s*\}\s+from\s+'@\/utils\/auth'\s*/, "const getToken = () => ''\n")
    .replace(/import\s+\{\s*listChefs\s*\}\s+from\s+'@\/api\/cooking\/user'\s*/, "const listChefs = () => Promise.resolve([])\n")
    .replace(/import\s+\{\s*getChefMy,\s*getChefWorkbench,\s*getChefTime,\s*pauseChef,\s*resumeChef\s*\}\s+from\s+'@\/api\/cooking\/chef'\s*/, "const getChefMy = () => Promise.resolve({})\nconst getChefWorkbench = () => Promise.resolve({})\nconst getChefTime = () => Promise.resolve({})\nconst pauseChef = () => Promise.resolve({})\nconst resumeChef = () => Promise.resolve({})\n")
    .replace(/import\s+regionData\s+from\s+'@\/utils\/region-data'\s*/, 'const regionData = []\n')
    .replace(/import appConfig from '@\/config'\s*/, `const appConfig = { baseUrl: ${JSON.stringify(baseUrl)} }\n`)
    .replace(/const chefStatus = require\('@\/utils\/chef-status'\)/, 'const chefStatus = { isChefWorkbenchAvailable: () => false, shouldShowChefRecommendations: () => true, isChefNormal: () => false }\n')
    .replace(/export default/, 'module.exports =')

  const sandbox = {
    module: { exports: {} },
    exports: {},
    require,
    console,
    Promise,
    setTimeout,
    clearTimeout
  }

  vm.runInNewContext(script, sandbox, { filename: pagePath })
  return sandbox.module.exports
}

test('homepage recommended chef normalizes snake_case avatar fields', () => {
  const component = loadComponentOptions()
  const ctx = component.data ? component.data() : {}
  Object.assign(ctx, component.methods)

  const chef = component.methods.normalizeChef.call(ctx, {
    chef_id: 3001,
    chef_name: '三千世界',
    avatar_url: '/profile/avatar.jpg'
  })

  assert.equal(chef.id, 3001)
  assert.equal(chef.name, '三千世界')
  assert.equal(chef.avatar, 'http://localhost:8080/profile/avatar.jpg')
})

test('homepage recommended chef rewrites localhost avatar urls to current api origin', () => {
  const component = loadComponentOptions('https://api.example.com')
  const ctx = component.data ? component.data() : {}
  Object.assign(ctx, component.methods)

  const chef = component.methods.normalizeChef.call(ctx, {
    chef_id: 3001,
    chef_name: '三千世界',
    avatar_url: 'http://localhost:8080/cooking/chef/image/avatar.png'
  })

  assert.equal(chef.avatar, 'https://api.example.com/cooking/chef/image/avatar.png')
})
