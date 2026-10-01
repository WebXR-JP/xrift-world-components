import { describe, expect, it } from 'vitest'
import { baseUrlFromSceneUrl, placeholderLabel } from '../utils'

describe('baseUrlFromSceneUrl', () => {
  it('remoteEntry.js を除いた末尾 / 付きの URL を返す', () => {
    expect(
      baseUrlFromSceneUrl('https://cdn.example/users/u/items/i/abc123/remoteEntry.js'),
    ).toBe('https://cdn.example/users/u/items/i/abc123/')
  })

  it('スラッシュが無ければルート', () => {
    expect(baseUrlFromSceneUrl('remoteEntry.js')).toBe('/')
  })
})

describe('placeholderLabel', () => {
  it('読み込み中と失敗の理由ごとに英数字の短い文を返す', () => {
    expect(placeholderLabel('loading')).toBe('Item: loading...')
    expect(placeholderLabel('error', 'NOT_DECLARED')).toContain('xrift.json')
    expect(placeholderLabel('error', 'LOGIN_REQUIRED')).toContain('xrift login')
    expect(placeholderLabel('error', 'LOAD_FAILED')).toBe('Item: failed to load')
  })
})
