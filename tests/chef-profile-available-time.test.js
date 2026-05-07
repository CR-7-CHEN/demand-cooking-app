const { readFileSync } = require('node:fs')
const { resolve } = require('node:path')
const { describe, it } = require('node:test')
const assert = require('node:assert/strict')

const appRoot = resolve(__dirname, '..')
const profile = readFileSync(resolve(appRoot, 'pages', 'work', 'profile.vue'), 'utf8')
const profileTime = readFileSync(resolve(appRoot, 'pages', 'work', 'profile-time.vue'), 'utf8')
const pages = JSON.parse(readFileSync(resolve(appRoot, 'pages.json'), 'utf8'))

describe('chef profile available time draft flow', () => {
  it('moves available time editing to an independent page from profile intro', () => {
    assert.match(profile, /<text class="label">个人简介<\/text>/)
    assert.match(profile, /openAvailableTimePage/)
    assert.match(profile, /pages\/work\/profile-time/)
    assert.doesNotMatch(profile, /class="time-card"/)
    assert.ok(pages.pages.some(page => page.path === 'pages/work/profile-time'))
  })

  it('submits selected available times together with chef application payload', () => {
    assert.match(profile, /availableTimes:\s*this\.buildAvailableTimesPayload\(\)/)
    assert.match(profile, /buildAvailableTimesPayload\(\)/)
    assert.match(profile, /consumeAvailableTimeDraft\(\)/)
  })

  it('confirms the current time form without showing an add time button', () => {
    assert.doesNotMatch(profileTime, /添加时间段/)
    assert.doesNotMatch(profileTime, /保存时间段/)
    assert.doesNotMatch(profileTime, /class="small-btn"/)
    assert.doesNotMatch(profileTime, />新增<\/button>/)
    assert.match(profileTime, /flushTimeFormBeforeConfirm\(\)/)
    assert.match(profileTime, /confirmTimes\(\)[\s\S]*flushTimeFormBeforeConfirm/)
  })

  it('replaces freeform remark with a required meal selection picker', () => {
    assert.match(profileTime, /<text class="label">三餐选择<\/text>/)
    assert.match(profileTime, /<picker :range="mealOptions"/)
    assert.match(profileTime, /const MEAL_OPTIONS = \['早餐', '午餐', '晚餐'\]/)
    assert.match(profileTime, /if \(!this\.normalizeMealRemark\(this\.timeForm\.remark\)\) return '请选择三餐'/)
    assert.doesNotMatch(profileTime, /placeholder="如 午餐档、晚餐档"/)
  })
})
