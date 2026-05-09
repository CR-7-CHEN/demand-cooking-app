const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')

const source = fs.readFileSync(path.join(__dirname, '..', 'api', 'cooking', 'chef.js'), 'utf8')

test('chef order action APIs align with backend route names', () => {
  assert.match(source, /export function startServiceChefOrder\(data\)\s*\{[\s\S]*url:\s*'\/cooking\/order\/chef\/serviceStart'/)
  assert.match(source, /export function serviceCompleteChefOrder\(data\)\s*\{[\s\S]*url:\s*'\/cooking\/order\/chef\/serviceComplete'/)
  assert.match(source, /export function cancelChefOrder\(data\)\s*\{[\s\S]*url:\s*'\/cooking\/order\/chef\/cancel'/)
})
