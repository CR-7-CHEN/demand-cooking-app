const { existsSync, readdirSync, readFileSync, statSync } = require('node:fs')
const { resolve, join } = require('node:path')
const { describe, it } = require('node:test')
const assert = require('node:assert/strict')

const oldCopy = '做饭' + '人员'
const roots = ['pages', 'api', 'store', 'utils']
const rootFiles = ['pages.json']

function collectFiles(dir) {
  if (!existsSync(dir)) return []
  return readdirSync(dir).flatMap((name) => {
    const fullPath = join(dir, name)
    return statSync(fullPath).isDirectory() ? collectFiles(fullPath) : [fullPath]
  })
}

describe('mini program service chef copy', () => {
  it('does not show the old chef role wording in business files', () => {
    const offenders = [
      ...roots.flatMap((root) => collectFiles(resolve(__dirname, '..', root))),
      ...rootFiles.map((file) => resolve(__dirname, '..', file))
    ]
      .filter((file) => /\.(vue|js|json)$/.test(file))
      .filter((file) => readFileSync(file, 'utf8').includes(oldCopy))

    assert.deepEqual(offenders, [])
  })
})
