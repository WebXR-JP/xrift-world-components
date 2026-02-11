import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { defaultFormatTimestamp, getLeaderUserId, mergeLogs, processJoins, buildLeaveEntry } from '../utils'
import type { KnownUser, LogEntry } from '../types'

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

describe('mergeLogs', () => {
  const entry = (id: string): LogEntry => ({
    id,
    userId: 'u1',
    displayName: 'User',
    type: 'join',
    timestamp: '2026-01-01 00:00:00',
    avatarUrl: null,
  })

  it('新しいエントリを末尾に追加する', () => {
    const prev = [entry('a')]
    const result = mergeLogs(prev, [entry('b')], 10)
    expect(result.map((e) => e.id)).toEqual(['a', 'b'])
  })

  it('重複idのエントリは追加しない', () => {
    const prev = [entry('a'), entry('b')]
    const result = mergeLogs(prev, [entry('b'), entry('c')], 10)
    expect(result.map((e) => e.id)).toEqual(['a', 'b', 'c'])
  })

  it('maxEntriesを超えた場合、古いものから切り捨てる', () => {
    const prev = [entry('a'), entry('b')]
    const result = mergeLogs(prev, [entry('c'), entry('d')], 3)
    expect(result.map((e) => e.id)).toEqual(['b', 'c', 'd'])
  })

  it('空のnewEntriesでは元の配列をそのまま返す', () => {
    const prev = [entry('a')]
    const result = mergeLogs(prev, [], 10)
    expect(result.map((e) => e.id)).toEqual(['a'])
  })

  it('元の配列を変更しない', () => {
    const prev = [entry('a')]
    const copy = [...prev]
    mergeLogs(prev, [entry('b')], 10)
    expect(prev).toEqual(copy)
  })
})

describe('processJoins', () => {
  const ts = () => '2026-01-01 12:00:00'

  it('新規ユーザーをknownUsersに追加しjoinエントリを生成する', () => {
    const currentUsersById = new Map([
      ['u1', { displayName: 'Alice', avatarUrl: null }],
    ])
    const { nextKnownUsers, joinEntries } = processJoins([], currentUsersById, ts)

    expect(nextKnownUsers).toHaveLength(1)
    expect(nextKnownUsers[0].userId).toBe('u1')
    expect(nextKnownUsers[0].displayName).toBe('Alice')
    expect(joinEntries).toHaveLength(1)
    expect(joinEntries[0].type).toBe('join')
    expect(joinEntries[0].userId).toBe('u1')
  })

  it('既存ユーザーはjoinエントリを生成しない', () => {
    const prev: KnownUser[] = [
      { userId: 'u1', displayName: 'Alice', avatarUrl: null, joinedAt: '2026-01-01 11:00:00' },
    ]
    const currentUsersById = new Map([
      ['u1', { displayName: 'Alice', avatarUrl: null }],
    ])
    const { nextKnownUsers, joinEntries } = processJoins(prev, currentUsersById, ts)

    expect(nextKnownUsers).toHaveLength(1)
    expect(joinEntries).toHaveLength(0)
  })

  it('既存ユーザーの表示名が変わった場合に更新する', () => {
    const prev: KnownUser[] = [
      { userId: 'u1', displayName: 'Alice', avatarUrl: null, joinedAt: '2026-01-01 11:00:00' },
    ]
    const currentUsersById = new Map([
      ['u1', { displayName: 'Alice Updated', avatarUrl: 'https://example.com/avatar.png' }],
    ])
    const { nextKnownUsers, joinEntries } = processJoins(prev, currentUsersById, ts)

    expect(nextKnownUsers[0].displayName).toBe('Alice Updated')
    expect(nextKnownUsers[0].avatarUrl).toBe('https://example.com/avatar.png')
    expect(joinEntries).toHaveLength(0)
  })

  it('元のprevKnownUsers配列を変更しない', () => {
    const prev: KnownUser[] = [
      { userId: 'u1', displayName: 'Alice', avatarUrl: null, joinedAt: '2026-01-01 11:00:00' },
    ]
    const copy = prev.map((u) => ({ ...u }))
    const currentUsersById = new Map([
      ['u1', { displayName: 'Alice', avatarUrl: null }],
      ['u2', { displayName: 'Bob', avatarUrl: null }],
    ])
    processJoins(prev, currentUsersById, ts)
    expect(prev).toEqual(copy)
  })
})

describe('buildLeaveEntry', () => {
  it('KnownUserからleaveタイプのLogEntryを生成する', () => {
    const known: KnownUser = {
      userId: 'u1',
      displayName: 'Alice',
      avatarUrl: 'https://example.com/avatar.png',
      joinedAt: '2026-01-01 11:00:00',
    }
    const entry = buildLeaveEntry(known, '2026-01-01 12:00:00')

    expect(entry.id).toBe('leave-u1-2026-01-01 11:00:00')
    expect(entry.userId).toBe('u1')
    expect(entry.displayName).toBe('Alice')
    expect(entry.type).toBe('leave')
    expect(entry.timestamp).toBe('2026-01-01 12:00:00')
    expect(entry.avatarUrl).toBe('https://example.com/avatar.png')
  })
})
