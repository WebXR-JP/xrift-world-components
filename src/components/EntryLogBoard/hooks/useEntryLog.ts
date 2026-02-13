import { useEffect, useMemo, useRef, useState } from 'react'
import { useUsers } from '../../../contexts/UsersContext'
import { useWorldEvent } from '../../../hooks/useWorldEvent'
import { DEFAULT_LOGS } from '../constants'
import {
  type LogEntry,
  type LogType,
  type UserJoinedEvent,
  type UserLeftEvent,
} from '../types'
import {
  appendLog,
  createLogEntry,
  enrichLogsWithCache,
  resolveUserInfo,
} from '../utils'

interface UseEntryLogOptions {
  maxEntries: number
  displayNameFallback: string
  formatTimestamp: (date: Date) => string
  onJoin?: (entry: LogEntry) => void
  onLeave?: (entry: LogEntry) => void
}

export function useEntryLog(options: UseEntryLogOptions): LogEntry[] {
  const { localUser, remoteUsers } = useUsers()
  const [logs, setLogs] = useState(DEFAULT_LOGS)

  const logsRef = useRef(logs)
  logsRef.current = logs

  const optionsRef = useRef(options)
  optionsRef.current = options

  // ユーザー情報キャッシュ（退室時に useUsers から消えている可能性があるため）
  // レンダー本体で同期的に更新し、イベントコールバックより先にキャッシュを確定させる
  const userCacheRef = useRef(
    new Map<string, { displayName: string; avatarUrl: string | null }>(),
  )
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

  // ログ書き込みヘルパー
  const writeEntry = (
    type: LogType,
    userId: string,
    callback?: (entry: LogEntry) => void,
  ) => {
    const opts = optionsRef.current
    const { displayName, avatarUrl } = resolveUserInfo(
      userId,
      userCacheRef.current,
      opts.displayNameFallback,
    )
    const entry = createLogEntry(
      type,
      userId,
      displayName,
      avatarUrl,
      opts.formatTimestamp,
    )
    setLogs((prev) => appendLog(prev, entry, opts.maxEntries))
    callback?.(entry)
  }

  // 自分自身の入室ログ
  const selfJoinedRef = useRef(false)
  useEffect(() => {
    if (!localUser || selfJoinedRef.current) return
    selfJoinedRef.current = true
    writeEntry('join', localUser.id, optionsRef.current.onJoin)
  }, [localUser])

  // user-joined イベント
  useWorldEvent<UserJoinedEvent>('user-joined', (data) => {
    writeEntry('join', data.userId, optionsRef.current.onJoin)
  })

  // user-left イベント
  useWorldEvent<UserLeftEvent>('user-left', (data) => {
    writeEntry('leave', data.userId, optionsRef.current.onLeave)
  })

  // Unknown ログをキャッシュで補完して返す（表示の即時修正）
  const cacheSize = userCacheRef.current.size
  return useMemo(
    () =>
      enrichLogsWithCache(
        logs,
        options.displayNameFallback,
        userCacheRef.current,
      ),
    [logs, options.displayNameFallback, cacheSize],
  )
}
