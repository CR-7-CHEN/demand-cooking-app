const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')

const apiSource = fs.readFileSync(path.join(__dirname, '..', 'api', 'cooking', 'chef.js'), 'utf8')
const controllerSource = fs.readFileSync(
  'D:\\backend\\demand-cooking-backend\\ruoyi-modules\\ruoyi-system\\src\\main\\java\\org\\dromara\\system\\controller\\cooking\\DcCookChefController.java',
  'utf8'
)

test('chef time delete stays compatible between mini-program request payload and backend parameter binding', () => {
  assert.match(
    apiSource,
    /export function deleteChefTime\(id\)\s*\{[\s\S]*method:\s*'delete'[\s\S]*params:\s*\{\s*id\s*\}[\s\S]*data:\s*\{\s*timeId:\s*id,\s*id\s*\}/
  )
  assert.match(
    controllerSource,
    /public R<Void> deleteTime\(@RequestParam\(value = "id", required = false\) Long timeId,\s*@RequestBody\(required = false\) Map<String, Long> body\)/
  )
  assert.match(controllerSource, /if \(timeId == null && body != null\) \{/)
  assert.match(controllerSource, /timeId = body\.get\("timeId"\);/)
  assert.match(controllerSource, /if \(timeId == null\) \{\s*timeId = body\.get\("id"\);\s*\}/)
})
