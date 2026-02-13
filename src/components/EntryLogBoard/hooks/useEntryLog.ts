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
import { createLogEntry, isWriterAmong, mergeLogs } from '../utils'

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

  // 自分自身の入室ログ補完（最初のユーザーのみ）
  // 他のユーザーがいる場合はライターが user-joined イベントで書いてくれるため、
  // ここでは自分しかいない（＝最初のユーザー）場合のみ自分の入室ログを追加する。
  // 自分で書くと未同期のローカル状態で上書きしてしまうため。
  const selfJoinedRef = useRef(false)
  useEffect(() => {
    if (!localUser || selfJoinedRef.current) return
    selfJoinedRef.current = true
    const alreadyJoined = logsRef.current.some(
      (log) => log.type === 'join' && log.userId === localUser.id,
    )
    if (alreadyJoined) return
    // 他のユーザーがいる場合、ライターが user-joined で書くので自分では書かない
    if (remoteUsers.length > 0) return
    const opts = optionsRef.current
    const entry = createLogEntry(
      'join',
      localUser.id,
      localUser.displayName,
      localUser.avatarUrl,
      logsRef.current,
      opts.formatTimestamp,
    )
    setLogs((prev) => mergeLogs(prev, entry, opts.maxEntries))
    opts.onJoin?.(entry)
  }, [localUser, setLogs])

  // user-joined イベント
  // 入室者を除いた既存ユーザーの中で辞書順最小のクライアントだけが書き込む
  useWorldEvent<UserJoinedEvent>('user-joined', (data) => {
    if (!localUser) return
    const existingIds = [
      localUser.id,
      ...remoteUsers.filter((u) => u.id !== data.userId).map((u) => u.id),
    ]
    if (!isWriterAmong(existingIds, localUser.id)) return

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
  // 退室者を除いた残存ユーザーの中で辞書順最小のクライアントだけが書き込む
  useWorldEvent<UserLeftEvent>('user-left', (data) => {
    if (!localUser) return
    const remainingIds = [
      localUser.id,
      ...remoteUsers.filter((u) => u.id !== data.userId).map((u) => u.id),
    ]
    if (!isWriterAmong(remainingIds, localUser.id)) return

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
