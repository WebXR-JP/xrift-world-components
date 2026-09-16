import { describe, expect, it } from 'vitest'

import { type LogEntry } from '../types'
import {
  buildLogEntryId,
  createLogEntry,
  defaultFormatTimestamp,
  enrichLogsWithCache,
  isValidLogEntry,
  isWriterAmong,
  lastUserLog,
  mergeLogs,
} from '../utils'

describe('defaultFormatTimestamp', () => {
  it('HH:MM 形式でフォーマットする', () => {
    const ms = new Date(2024, 0, 1, 9, 5).getTime()
    expect(defaultFormatTimestamp(ms)).toBe('09:05')
  })

  it('午後の時刻も正しくフォーマットする', () => {
    const ms = new Date(2024, 0, 1, 14, 30).getTime()
    expect(defaultFormatTimestamp(ms)).toBe('14:30')
  })

  it('0時0分をゼロパディングする', () => {
    const ms = new Date(2024, 0, 1, 0, 0).getTime()
    expect(defaultFormatTimestamp(ms)).toBe('00:00')
  })

  it('不正な時刻は --:-- を返す', () => {
    expect(defaultFormatTimestamp(Number.NaN)).toBe('--:--')
  })
})

describe('buildLogEntryId', () => {
  it('種別・ユーザー・時刻から一意なIDを生成する', () => {
    const id = buildLogEntryId('join', 'user-1', 1700000000000)
    expect(id).toBe('join-user-1-1700000000000')
  })

  it('時刻が異なればIDも異なる（再入室時の衝突なし）', () => {
    const id1 = buildLogEntryId('join', 'user-1', 1700000000000)
    const id2 = buildLogEntryId('join', 'user-1', 1700000001000)
    expect(id1).not.toBe(id2)
  })

  it('種別が異なればIDも異なる', () => {
    const joinId = buildLogEntryId('join', 'user-1', 1700000000000)
    const leaveId = buildLogEntryId('leave', 'user-1', 1700000000000)
    expect(joinId).not.toBe(leaveId)
  })
})

describe('createLogEntry', () => {
  it('join エントリを正しく生成する', () => {
    const entry = createLogEntry(
      'join',
      'user-1',
      'Alice',
      'https://example.com/avatar.png',
      1700000000000,
    )

    expect(entry).toEqual({
      id: 'join-user-1-1700000000000',
      type: 'join',
      userId: 'user-1',
      displayName: 'Alice',
      avatarUrl: 'https://example.com/avatar.png',
      timestamp: 1700000000000,
    })
  })

  it('leave エントリを正しく生成する', () => {
    const entry = createLogEntry(
      'leave',
      'user-1',
      'Alice',
      null,
      1700000000000,
    )

    expect(entry).toEqual({
      id: 'leave-user-1-1700000000000',
      type: 'leave',
      userId: 'user-1',
      displayName: 'Alice',
      avatarUrl: null,
      timestamp: 1700000000000,
    })
  })
})

describe('isValidLogEntry', () => {
  const baseEntry: LogEntry = {
    id: 'join-user-1-1700000000000',
    type: 'join',
    userId: 'user-1',
    displayName: 'Alice',
    avatarUrl: null,
    timestamp: 1700000000000,
  }

  it('現行仕様のエントリは true', () => {
    expect(isValidLogEntry(baseEntry)).toBe(true)
  })

  it('旧仕様（timestamp が文字列）は false', () => {
    const legacy = { ...baseEntry, timestamp: '10:00' } as unknown as LogEntry
    expect(isValidLogEntry(legacy)).toBe(false)
  })

  it('不正な type は false', () => {
    const invalid = { ...baseEntry, type: 'unknown' } as unknown as LogEntry
    expect(isValidLogEntry(invalid)).toBe(false)
  })
})

describe('lastUserLog', () => {
  const join1: LogEntry = {
    id: 'join-user-1-1700000000000',
    type: 'join',
    userId: 'user-1',
    displayName: 'Alice',
    avatarUrl: null,
    timestamp: 1700000000000,
  }
  const leave1: LogEntry = {
    ...join1,
    id: 'leave-user-1-1700000001000',
    type: 'leave',
    timestamp: 1700000001000,
  }
  const join2: LogEntry = {
    ...join1,
    id: 'join-user-1-1700000002000',
    timestamp: 1700000002000,
  }

  it('該当ユーザーがいなければ undefined', () => {
    expect(lastUserLog([join1], 'user-9')).toBeUndefined()
  })

  it('最後のエントリを返す（join のみ → join）', () => {
    expect(lastUserLog([join1], 'user-1')).toBe(join1)
  })

  it('退室後は leave を返す（再入室判定用）', () => {
    expect(lastUserLog([join1, leave1], 'user-1')).toBe(leave1)
  })

  it('再入室後は新しい join を返す', () => {
    expect(lastUserLog([join1, leave1, join2], 'user-1')).toBe(join2)
  })

  it('他ユーザーのログは無視する', () => {
    const other: LogEntry = { ...join2, userId: 'user-2' }
    expect(lastUserLog([join1, other], 'user-1')).toBe(join1)
  })
})

describe('isWriterAmong', () => {
  it('辞書順最小のIDがtargetIdと一致する場合はtrueを返す', () => {
    expect(isWriterAmong(['user-b', 'user-a', 'user-c'], 'user-a')).toBe(true)
  })

  it('辞書順最小のIDがtargetIdと一致しない場合はfalseを返す', () => {
    expect(isWriterAmong(['user-b', 'user-a', 'user-c'], 'user-b')).toBe(false)
  })

  it('targetIdがundefinedの場合はfalseを返す', () => {
    expect(isWriterAmong(['user-a', 'user-b'], undefined)).toBe(false)
  })

  it('候補が空配列の場合はfalseを返す', () => {
    expect(isWriterAmong([], 'user-a')).toBe(false)
  })

  it('候補にundefinedが含まれていてもフィルタして判定する', () => {
    expect(isWriterAmong([undefined, 'user-b', 'user-a'], 'user-a')).toBe(true)
  })

  it('候補が1つだけでtargetIdと一致する場合はtrueを返す', () => {
    expect(isWriterAmong(['user-a'], 'user-a')).toBe(true)
  })
})

describe('enrichLogsWithCache', () => {
  const unknownEntry: LogEntry = {
    id: 'leave-user-1-1700000000000',
    type: 'leave',
    userId: 'user-1',
    displayName: 'Unknown',
    avatarUrl: null,
    timestamp: 1700000000000,
  }

  const knownEntry: LogEntry = {
    id: 'join-user-2-1700000000000',
    type: 'join',
    userId: 'user-2',
    displayName: 'Bob',
    avatarUrl: 'https://example.com/bob.png',
    timestamp: 1700000000000,
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

describe('mergeLogs', () => {
  const baseEntry: LogEntry = {
    id: 'join-user-1-1700000000000',
    type: 'join',
    userId: 'user-1',
    displayName: 'Alice',
    avatarUrl: null,
    timestamp: 1700000000000,
  }

  it('空のログに新しいエントリを追加する', () => {
    const result = mergeLogs([], baseEntry, 20)
    expect(result).toHaveLength(1)
    expect(result[0]).toEqual(baseEntry)
  })

  it('重複するIDのエントリは追加しない（冪等性）', () => {
    const existingLogs = [baseEntry]
    const result = mergeLogs(existingLogs, baseEntry, 20)
    expect(result).toHaveLength(1)
    expect(result).toBe(existingLogs) // 同じ参照を返す
  })

  it('異なるIDのエントリは追加する', () => {
    const existingLogs = [baseEntry]
    const newEntry: LogEntry = {
      ...baseEntry,
      id: 'leave-user-1-1700000001000',
      type: 'leave',
      timestamp: 1700000001000,
    }
    const result = mergeLogs(existingLogs, newEntry, 20)
    expect(result).toHaveLength(2)
  })

  it('maxEntries を超えた場合は古いエントリを削除する', () => {
    const existingLogs: LogEntry[] = [
      { ...baseEntry, id: 'join-user-1-1700000000000' },
      { ...baseEntry, id: 'join-user-2-1700000001000', userId: 'user-2' },
      { ...baseEntry, id: 'join-user-3-1700000002000', userId: 'user-3' },
    ]
    const newEntry: LogEntry = {
      ...baseEntry,
      id: 'join-user-4-1700000003000',
      userId: 'user-4',
    }
    const result = mergeLogs(existingLogs, newEntry, 3)
    expect(result).toHaveLength(3)
    expect(result[0].id).toBe('join-user-2-1700000001000') // 最も古いエントリが削除される
    expect(result[2].id).toBe('join-user-4-1700000003000') // 新しいエントリが末尾に追加
  })
})
