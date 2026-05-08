const { readFileSync } = require('node:fs')
const { resolve } = require('node:path')
const test = require('node:test')
const assert = require('node:assert/strict')
const vm = require('node:vm')

const pagePath = resolve(__dirname, '..', 'pages', 'index.vue')
const source = readFileSync(pagePath, 'utf8')

function loadComponentOptions() {
  const match = source.match(/<script>([\s\S]*?)<\/script>/)
  assert.ok(match, 'expected homepage to contain a script block')

  const script = match[1]
    .replace(/import\s+\{\s*getToken\s*\}\s+from\s+'@\/utils\/auth'\s*/, "const getToken = () => ''\n")
    .replace(/import\s+\{\s*listChefs\s*\}\s+from\s+'@\/api\/cooking\/user'\s*/, "const listChefs = () => Promise.resolve([])\n")
    .replace(/import\s+\{\s*getChefMy,\s*getChefWorkbench,\s*pauseChef,\s*resumeChef\s*\}\s+from\s+'@\/api\/cooking\/chef'\s*/, "const getChefMy = () => Promise.resolve({})\nconst getChefWorkbench = () => Promise.resolve({})\nconst pauseChef = () => Promise.resolve({})\nconst resumeChef = () => Promise.resolve({})\n")
    .replace(/import\s+regionData\s+from\s+'@\/utils\/region-data'\s*/, 'const regionData = []\n')
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

function createPageContext(component) {
  const ctx = component.data ? component.data() : {}
  Object.assign(ctx, component.methods)
  return ctx
}

test('homepage recommended chef card shows a cuisine label before cuisine tags', () => {
  assert.match(source, /<text class="cuisine-label">擅长菜系<\/text>/)
  assert.match(source, /chef\.cuisines\.length/)
})

test('homepage normalizes recommended chef cuisines from skillTags and cuisineTags', () => {
  const component = loadComponentOptions()
  const ctx = createPageContext(component)

  const fromSkillTags = component.methods.normalizeChef.call(ctx, {
    chefId: 1,
    chefName: '张师傅',
    skillTags: '川菜,粤菜'
  })
  const fromCuisineTags = component.methods.normalizeChef.call(ctx, {
    chefId: 2,
    chefName: '李师傅',
    cuisineTags: '湘菜/本帮菜'
  })

  assert.deepEqual(Array.from(fromSkillTags.cuisines), ['川菜', '粤菜'])
  assert.deepEqual(Array.from(fromCuisineTags.cuisines), ['湘菜', '本帮菜'])
})
