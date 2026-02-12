import { describe, expect, it } from 'vitest'

import { type LogEntry } from '../types'
import {
  buildLogEntryId,
  createLogEntry,
  defaultFormatTimestamp,
  mergeLogs,
} from '../utils'

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

describe('buildLogEntryId', () => {
  it('同じユーザーの join が無い場合は 0 から始まるIDを生成する', () => {
    const id = buildLogEntryId('join', 'user-1', [])
    expect(id).toBe('join-user-1-0')
  })

  it('同じユーザーの join が1件ある場合は 1 のIDを生成する', () => {
    const existingLogs: LogEntry[] = [
      {
        id: 'join-user-1-0',
        type: 'join',
        userId: 'user-1',
        displayName: 'Alice',
        avatarUrl: null,
        timestamp: '10:00',
      },
    ]
    const id = buildLogEntryId('join', 'user-1', existingLogs)
    expect(id).toBe('join-user-1-1')
  })

  it('異なるユーザーのログはカウントに含めない', () => {
    const existingLogs: LogEntry[] = [
      {
        id: 'join-user-2-0',
        type: 'join',
        userId: 'user-2',
        displayName: 'Bob',
        avatarUrl: null,
        timestamp: '10:00',
      },
    ]
    const id = buildLogEntryId('join', 'user-1', existingLogs)
    expect(id).toBe('join-user-1-0')
  })

  it('異なるタイプのログはカウントに含めない', () => {
    const existingLogs: LogEntry[] = [
      {
        id: 'leave-user-1-0',
        type: 'leave',
        userId: 'user-1',
        displayName: 'Alice',
        avatarUrl: null,
        timestamp: '10:00',
      },
    ]
    const id = buildLogEntryId('join', 'user-1', existingLogs)
    expect(id).toBe('join-user-1-0')
  })

  it('leave タイプでも正しくIDを生成する', () => {
    const existingLogs: LogEntry[] = [
      {
        id: 'leave-user-1-0',
        type: 'leave',
        userId: 'user-1',
        displayName: 'Alice',
        avatarUrl: null,
        timestamp: '10:00',
      },
    ]
    const id = buildLogEntryId('leave', 'user-1', existingLogs)
    expect(id).toBe('leave-user-1-1')
  })
})

describe('createLogEntry', () => {
  const mockFormatTimestamp = () => '12:34'

  it('join エントリを正しく生成する', () => {
    const entry = createLogEntry(
      'join',
      'user-1',
      'Alice',
      'https://example.com/avatar.png',
      [],
      mockFormatTimestamp,
    )

    expect(entry).toEqual({
      id: 'join-user-1-0',
      type: 'join',
      userId: 'user-1',
      displayName: 'Alice',
      avatarUrl: 'https://example.com/avatar.png',
      timestamp: '12:34',
    })
  })

  it('leave エントリを正しく生成する', () => {
    const entry = createLogEntry(
      'leave',
      'user-1',
      'Alice',
      null,
      [],
      mockFormatTimestamp,
    )

    expect(entry).toEqual({
      id: 'leave-user-1-0',
      type: 'leave',
      userId: 'user-1',
      displayName: 'Alice',
      avatarUrl: null,
      timestamp: '12:34',
    })
  })

  it('既存ログを考慮してIDを決定論的に生成する', () => {
    const existingLogs: LogEntry[] = [
      {
        id: 'join-user-1-0',
        type: 'join',
        userId: 'user-1',
        displayName: 'Alice',
        avatarUrl: null,
        timestamp: '10:00',
      },
    ]

    const entry = createLogEntry(
      'join',
      'user-1',
      'Alice',
      null,
      existingLogs,
      mockFormatTimestamp,
    )

    expect(entry.id).toBe('join-user-1-1')
  })
})

describe('mergeLogs', () => {
  const baseEntry: LogEntry = {
    id: 'join-user-1-0',
    type: 'join',
    userId: 'user-1',
    displayName: 'Alice',
    avatarUrl: null,
    timestamp: '10:00',
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
      id: 'leave-user-1-0',
      type: 'leave',
    }
    const result = mergeLogs(existingLogs, newEntry, 20)
    expect(result).toHaveLength(2)
  })

  it('maxEntries を超えた場合は古いエントリを削除する', () => {
    const existingLogs: LogEntry[] = [
      { ...baseEntry, id: 'join-user-1-0' },
      { ...baseEntry, id: 'join-user-2-0', userId: 'user-2' },
      { ...baseEntry, id: 'join-user-3-0', userId: 'user-3' },
    ]
    const newEntry: LogEntry = {
      ...baseEntry,
      id: 'join-user-4-0',
      userId: 'user-4',
    }
    const result = mergeLogs(existingLogs, newEntry, 3)
    expect(result).toHaveLength(3)
    expect(result[0].id).toBe('join-user-2-0') // 最も古いエントリが削除される
    expect(result[2].id).toBe('join-user-4-0') // 新しいエントリが末尾に追加
  })
})
