import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { defaultFormatTimestamp, getLeaderUserId } from '../utils'

describe('defaultFormatTimestamp', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('yyyy-MM-dd hh:mm:ss 形式でフォーマットする', () => {
    vi.setSystemTime(new Date('2026-03-15T09:05:03'))
    expect(defaultFormatTimestamp()).toBe('2026-03-15 09:05:03')
  })

  it('月・日・時・分・秒が1桁の場合に0埋めする', () => {
    vi.setSystemTime(new Date('2026-01-02T03:04:05'))
    expect(defaultFormatTimestamp()).toBe('2026-01-02 03:04:05')
  })

  it('月・日・時・分・秒が2桁の場合はそのまま表示する', () => {
    vi.setSystemTime(new Date('2026-12-31T23:59:59'))
    expect(defaultFormatTimestamp()).toBe('2026-12-31 23:59:59')
  })
})

describe('getLeaderUserId', () => {
  it('単一ユーザーの場合そのユーザーのidを返す', () => {
    expect(getLeaderUserId([{ id: 'user-a' }])).toBe('user-a')
  })

  it('複数ユーザーの場合、文字列ソートで最小のidを返す', () => {
    const users = [
      { id: 'user-c' },
      { id: 'user-a' },
      { id: 'user-b' },
    ]
    expect(getLeaderUserId(users)).toBe('user-a')
  })

  it('数値的なidでも文字列ソートで判定する', () => {
    const users = [
      { id: '10' },
      { id: '2' },
      { id: '1' },
    ]
    expect(getLeaderUserId(users)).toBe('1')
  })

  it('空配列の場合undefinedを返す', () => {
    expect(getLeaderUserId([])).toBeUndefined()
  })

  it('元の配列を変更しない', () => {
    const users = [{ id: 'b' }, { id: 'a' }]
    const copy = [...users]
    getLeaderUserId(users)
    expect(users).toEqual(copy)
  })
})
