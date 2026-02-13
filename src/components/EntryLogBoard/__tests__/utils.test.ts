import { describe, expect, it, vi } from 'vitest'

import { type LogEntry } from '../types'
import {
  appendLog,
  createLogEntry,
  defaultFormatTimestamp,
  enrichLogsWithCache,
  resolveUserInfo,
} from '../utils'

describe('resolveUserInfo', () => {
  it('キャッシュヒット時はキャッシュの情報を返す', () => {
    const cache = new Map([
      ['user-1', { displayName: 'Alice', avatarUrl: 'https://example.com/alice.png' }],
    ])
    const result = resolveUserInfo('user-1', cache, 'Unknown')
    expect(result).toEqual({
      displayName: 'Alice',
      avatarUrl: 'https://example.com/alice.png',
    })
  })

  it('キャッシュミス時は fallbackName と null を返す', () => {
    const cache = new Map<string, { displayName: string; avatarUrl: string | null }>()
    const result = resolveUserInfo('user-1', cache, 'Unknown')
    expect(result).toEqual({
      displayName: 'Unknown',
      avatarUrl: null,
    })
  })
})

describe('defaultFormatTimestamp', () => {
  it('HH:MM 形式でフォーマットする', () => {
    const date = new Date(2024, 0, 1, 9, 5)
    expect(defaultFormatTimestamp(date)).toBe('09:05')
  })

  it('午後の時刻も正しくフォーマットする', () => {
    const date = new Date(2024, 0, 1, 14, 30)
    expect(defaultFormatTimestamp(date)).toBe('14:30')
  })

  it('0時0分をゼロパディングする', () => {
    const date = new Date(2024, 0, 1, 0, 0)
    expect(defaultFormatTimestamp(date)).toBe('00:00')
  })
})

describe('createLogEntry', () => {
  const mockFormatTimestamp = () => '12:34'

  it('join エントリを正しく生成する', () => {
    vi.spyOn(crypto, 'randomUUID').mockReturnValue('test-uuid-1' as `${string}-${string}-${string}-${string}-${string}`)

    const entry = createLogEntry(
      'join',
      'user-1',
      'Alice',
      'https://example.com/avatar.png',
      mockFormatTimestamp,
    )

    expect(entry).toEqual({
      id: 'test-uuid-1',
      type: 'join',
      userId: 'user-1',
      displayName: 'Alice',
      avatarUrl: 'https://example.com/avatar.png',
      timestamp: '12:34',
    })

    vi.restoreAllMocks()
  })

  it('leave エントリを正しく生成する', () => {
    vi.spyOn(crypto, 'randomUUID').mockReturnValue('test-uuid-2' as `${string}-${string}-${string}-${string}-${string}`)

    const entry = createLogEntry(
      'leave',
      'user-1',
      'Alice',
      null,
      mockFormatTimestamp,
    )

    expect(entry).toEqual({
      id: 'test-uuid-2',
      type: 'leave',
      userId: 'user-1',
      displayName: 'Alice',
      avatarUrl: null,
      timestamp: '12:34',
    })

    vi.restoreAllMocks()
  })

  it('毎回ユニークなIDを生成する', () => {
    const entry1 = createLogEntry('join', 'user-1', 'Alice', null, mockFormatTimestamp)
    const entry2 = createLogEntry('join', 'user-1', 'Alice', null, mockFormatTimestamp)
    expect(entry1.id).not.toBe(entry2.id)
  })
})

describe('enrichLogsWithCache', () => {
  const unknownEntry: LogEntry = {
    id: 'test-id-1',
    type: 'join',
    userId: 'user-1',
    displayName: 'Unknown',
    avatarUrl: null,
    timestamp: '10:00',
  }

  const knownEntry: LogEntry = {
    id: 'test-id-2',
    type: 'join',
    userId: 'user-2',
    displayName: 'Bob',
    avatarUrl: 'https://example.com/bob.png',
    timestamp: '10:01',
  }

  it('Unknown エントリをキャッシュの情報で補完する', () => {
    const cache = new Map([
      ['user-1', { displayName: 'Alice', avatarUrl: 'https://example.com/alice.png' }],
    ])
    const result = enrichLogsWithCache([unknownEntry], 'Unknown', cache)
    expect(result[0].displayName).toBe('Alice')
    expect(result[0].avatarUrl).toBe('https://example.com/alice.png')
  })

  it('Unknown でないエントリはそのまま返す', () => {
    const logs = [knownEntry]
    const cache = new Map([
      ['user-2', { displayName: 'Bob2', avatarUrl: null }],
    ])
    const result = enrichLogsWithCache(logs, 'Unknown', cache)
    expect(result).toBe(logs)
  })

  it('キャッシュにないユーザーの Unknown はそのまま', () => {
    const logs = [unknownEntry]
    const cache = new Map<string, { displayName: string; avatarUrl: string | null }>()
    const result = enrichLogsWithCache(logs, 'Unknown', cache)
    expect(result).toBe(logs)
  })

  it('変更がなければ元の配列参照を返す', () => {
    const logs = [knownEntry]
    const cache = new Map<string, { displayName: string; avatarUrl: string | null }>()
    const result = enrichLogsWithCache(logs, 'Unknown', cache)
    expect(result).toBe(logs)
  })
})

describe('appendLog', () => {
  const baseEntry: LogEntry = {
    id: 'test-id-1',
    type: 'join',
    userId: 'user-1',
    displayName: 'Alice',
    avatarUrl: null,
    timestamp: '10:00',
  }

  it('空のログに新しいエントリを追加する', () => {
    const result = appendLog([], baseEntry, 20)
    expect(result).toHaveLength(1)
    expect(result[0]).toEqual(baseEntry)
  })

  it('既存のログにエントリを追加する', () => {
    const existingLogs = [baseEntry]
    const newEntry: LogEntry = {
      ...baseEntry,
      id: 'test-id-2',
      type: 'leave',
    }
    const result = appendLog(existingLogs, newEntry, 20)
    expect(result).toHaveLength(2)
    expect(result[1]).toEqual(newEntry)
  })

  it('maxEntries を超えた場合は古いエントリを削除する', () => {
    const existingLogs: LogEntry[] = [
      { ...baseEntry, id: 'test-id-1' },
      { ...baseEntry, id: 'test-id-2', userId: 'user-2' },
      { ...baseEntry, id: 'test-id-3', userId: 'user-3' },
    ]
    const newEntry: LogEntry = {
      ...baseEntry,
      id: 'test-id-4',
      userId: 'user-4',
    }
    const result = appendLog(existingLogs, newEntry, 3)
    expect(result).toHaveLength(3)
    expect(result[0].id).toBe('test-id-2')
    expect(result[2].id).toBe('test-id-4')
  })

  it('maxEntries が 1 の場合は最新のエントリのみ残る', () => {
    const existingLogs = [baseEntry]
    const newEntry: LogEntry = {
      ...baseEntry,
      id: 'test-id-2',
      userId: 'user-2',
    }
    const result = appendLog(existingLogs, newEntry, 1)
    expect(result).toHaveLength(1)
    expect(result[0].id).toBe('test-id-2')
  })
})
