import { useEffect, useRef } from 'react'
import { useUsers } from '../../../contexts/UsersContext'
import { useInstanceState } from '../../../hooks/useInstanceState'
import { useWorldEvent } from '../../../hooks/useWorldEvent'
import { DEFAULT_LOGS } from '../constants'
import {
  type LogEntry,
  type UserJoinedEvent,
  type UserLeftEvent,
} from '../types'
import { createLogEntry, mergeLogs } from '../utils'

interface UseEntryLogOptions {
  stateNamespace: string
  maxEntries: number
  displayNameFallback: string
  formatTimestamp: (date: Date) => string
  onJoin?: (entry: LogEntry) => void
  onLeave?: (entry: LogEntry) => void
}

export function useEntryLog(options: UseEntryLogOptions): LogEntry[] {
  const { localUser, remoteUsers } = useUsers()
  const [logs, setLogs] = useInstanceState<LogEntry[]>(
    `${options.stateNamespace}-logs`,
    DEFAULT_LOGS,
  )

  // logs の最新値を ref で保持（イベントコールバック内で参照）
  const logsRef = useRef(logs)
  logsRef.current = logs

  // options を ref で保持（stale closure 回避）
  const optionsRef = useRef(options)
  optionsRef.current = options

  // ユーザー情報キャッシュ（退室時に useUsers から消えている可能性があるため）
  const userCacheRef = useRef(
    new Map<string, { displayName: string; avatarUrl: string | null }>(),
  )
  useEffect(() => {
    if (localUser) {
      userCacheRef.current.set(localUser.id, {
        displayName: localUser.displayName,
        avatarUrl: localUser.avatarUrl,
      })
    }
    for (const user of remoteUsers) {
      userCacheRef.current.set(user.id, {
        displayName: user.displayName,
        avatarUrl: user.avatarUrl,
      })
    }
  }, [localUser, remoteUsers])

  // user-joined イベント
  useWorldEvent<UserJoinedEvent>('user-joined', (data) => {
    const opts = optionsRef.current
    const cached = userCacheRef.current.get(data.userId)
    const entry = createLogEntry(
      'join',
      data.userId,
      cached?.displayName ?? opts.displayNameFallback,
      cached?.avatarUrl ?? null,
      logsRef.current,
      opts.formatTimestamp,
    )
    setLogs((prev) => mergeLogs(prev, entry, opts.maxEntries))
    opts.onJoin?.(entry)
  })

  // user-left イベント
  useWorldEvent<UserLeftEvent>('user-left', (data) => {
    const opts = optionsRef.current
    const cached = userCacheRef.current.get(data.userId)
    const entry = createLogEntry(
      'leave',
      data.userId,
      cached?.displayName ?? opts.displayNameFallback,
      cached?.avatarUrl ?? null,
      logsRef.current,
      opts.formatTimestamp,
    )
    setLogs((prev) => mergeLogs(prev, entry, opts.maxEntries))
    opts.onLeave?.(entry)
  })

  return logs
}
