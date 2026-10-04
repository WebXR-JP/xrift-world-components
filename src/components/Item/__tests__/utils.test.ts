import { describe, expect, it } from 'vitest'
import { baseUrlFromSceneUrl, defaultPlacementId, placeholderLabel } from '../utils'

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

describe('defaultPlacementId', () => {
  it('同じ置き方なら同じ id、置き方が違えば別の id', () => {
    const a = defaultPlacementId('i', [1, 0, 2], [0, 1.5, 0], 1)
    expect(defaultPlacementId('i', [1, 0, 2], [0, 1.5, 0], 1)).toBe(a)
    expect(defaultPlacementId('i', [1, 0, 3], [0, 1.5, 0], 1)).not.toBe(a)
    expect(defaultPlacementId('j', [1, 0, 2], [0, 1.5, 0], 1)).not.toBe(a)
    expect(defaultPlacementId('i', [1, 0, 2], [0, 1.5, 0], 2)).not.toBe(a)
  })
})
