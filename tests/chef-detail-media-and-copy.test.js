const { readFileSync } = require('node:fs')
const { resolve } = require('node:path')
const test = require('node:test')
const assert = require('node:assert/strict')
const vm = require('node:vm')

const pagePath = resolve(__dirname, '..', 'pages', 'user', 'chef-detail.vue')
const source = readFileSync(pagePath, 'utf8')

function loadComponentOptions(baseUrl = 'http://localhost:8080') {
  const match = source.match(/<script>([\s\S]*?)<\/script>/)
  assert.ok(match, 'expected chef detail page to contain a script block')

  const script = match[1]
    .replace(/import\s+\{\s*getToken\s*\}\s+from\s+'@\/utils\/auth'\s*/, "const getToken = () => ''\n")
    .replace(/import\s+\{\s*getChef,\s*listAddresses,\s*listDishes,\s*submitOrder\s*\}\s+from\s+'@\/api\/cooking\/user'\s*/, "const getChef = () => Promise.resolve({})\nconst listAddresses = () => Promise.resolve([])\nconst listDishes = () => Promise.resolve([])\nconst submitOrder = () => Promise.resolve({})\n")
    .replace(/import appConfig from '@\/config'\s*/, `const appConfig = { baseUrl: ${JSON.stringify(baseUrl)} }\n`)
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

test('chef detail normalizes snake_case media and available time fields', () => {
  const component = loadComponentOptions()
  const ctx = component.data.call({})
  Object.assign(ctx, component.methods)
  ctx.chefId = 3001

  const chef = component.methods.normalizeChef.call(ctx, {
    chef_id: 3001,
    chef_name: '三千世界',
    avatar_url: '/profile/avatar.jpg',
    work_image_urls: '["/uploads/work-1.jpg","https://cdn.test/work-2.jpg"]',
    intro: '擅长家常菜和宴席菜',
    available_time_list: [
      {
        start_time: '2026-05-14 10:00:00',
        end_time: '2026-05-14 14:00:00',
        status: '0'
      }
    ]
  })

  assert.equal(chef.id, 3001)
  assert.equal(chef.name, '三千世界')
  assert.equal(chef.avatar, 'http://localhost:8080/profile/avatar.jpg')
  assert.deepEqual(Array.from(chef.workImages), [
    'http://localhost:8080/uploads/work-1.jpg',
    'https://cdn.test/work-2.jpg'
  ])
  assert.equal(chef.description, '擅长家常菜和宴席菜')
  assert.deepEqual(JSON.parse(JSON.stringify(Array.from(chef.availableTimes))), [
    {
      startTime: '2026-05-14 10:00:00',
      endTime: '2026-05-14 14:00:00',
      status: '0'
    }
  ])
})

test('chef detail rewrites localhost chef image urls to current api origin', () => {
  const component = loadComponentOptions('https://api.example.com')
  const ctx = component.data.call({})
  Object.assign(ctx, component.methods)

  const chef = component.methods.normalizeChef.call(ctx, {
    chefId: 3001,
    chefName: '三千世界',
    avatarUrl: 'http://localhost:8080/cooking/chef/image/avatar.png',
    workImageUrls: 'http://127.0.0.1:8080/cooking/chef/image/work.jpg'
  })

  assert.equal(chef.avatar, 'https://api.example.com/cooking/chef/image/avatar.png')
  assert.deepEqual(Array.from(chef.workImages), [
    'https://api.example.com/cooking/chef/image/work.jpg'
  ])
})

test('chef detail user-facing booking copy is valid UTF-8 Chinese', () => {
  assert.match(source, />预约信息</)
  assert.match(source, />选择地址</)
  assert.match(source, /选择可预约日期/)
  assert.match(source, /当前没有可预约的上门时间/)
  assert.doesNotMatch(source, /棰勭害|鍙|鎻愪氦|璇锋|鐐瑰嚮|锛岀/)
})
