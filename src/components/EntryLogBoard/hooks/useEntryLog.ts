import { useEffect, useMemo, useRef } from 'react'
import { useUsers } from '../../../contexts/UsersContext'
import { useInstanceState } from '../../../hooks/useInstanceState'
import { useInstanceEvent } from '../../../hooks/useInstanceEvent'
import { useServerClock } from '../../../hooks/useServerClock'
import { DEFAULT_LOGS } from '../constants'
import { type LogEntry, type UserLeftEvent } from '../types'
import {
  createLogEntry,
  enrichLogsWithCache,
  isValidLogEntry,
  isWriterAmong,
  lastUserLog,
  mergeLogs,
} from '../utils'

interface UseEntryLogOptions {
  stateNamespace: string
  maxEntries: number
  displayNameFallback: string
  onJoin?: (entry: LogEntry) => void
  onLeave?: (entry: LogEntry) => void
}

export function useEntryLog(options: UseEntryLogOptions): LogEntry[] {
  const { localUser, remoteUsers } = useUsers()
  const { now } = useServerClock()
  const [logs, setLogs] = useInstanceState<LogEntry[]>(
    `${options.stateNamespace}-logs`,
    DEFAULT_LOGS,
  )

  // 旧仕様（timestamp が文字列）のエントリを除外。共有状態に残っていても
  // 表示崩れせず、maxEntries の切り捨てで自然に消える
  const validLogs = useMemo(() => logs.filter(isValidLogEntry), [logs])
  const validLogsRef = useRef(validLogs)
  validLogsRef.current = validLogs

  // options・共有時計を ref で保持（stale closure 回避）
  const optionsRef = useRef(options)
  optionsRef.current = options
  const nowRef = useRef(now)
  nowRef.current = now

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

  // 自分自身の入室ログは自分で書く
  // localUser の情報がそのまま使えるためキャッシュミス（Unknown）が起きない。
  // 他者の入室は各本人が書くので、user-joined イベントの購読もライター選出も不要。
  // 最後が leave（再入室時）の場合のみ新たに書く。最後が join なら記録済み。
  const selfJoinedRef = useRef(false)
  useEffect(() => {
    if (!localUser || selfJoinedRef.current) return
    selfJoinedRef.current = true
    if (lastUserLog(validLogsRef.current, localUser.id)?.type === 'join') return
    const opts = optionsRef.current
    const entry = createLogEntry(
      'join',
      localUser.id,
      localUser.displayName,
      localUser.avatarUrl,
      nowRef.current(),
    )
    setLogs((prev) => mergeLogs(prev, entry, opts.maxEntries))
    opts.onJoin?.(entry)
  }, [localUser, setLogs])

  // user-left イベント
  // 退室者本人は書けないため、残存ユーザーの中で辞書順最小のクライアントだけが書き込む。
  // ライター選出が分裂して重複書き込みが起きても、最後が既に leave なら書かないため
  // 同期後は1件に収まる（伝播遅延中のみ一時的に2件並ぶことがある）。
  useInstanceEvent<UserLeftEvent>('user-left', (data) => {
    if (!localUser) return
    const remainingIds = [
      localUser.id,
      ...remoteUsers.filter((u) => u.id !== data.userId).map((u) => u.id),
    ]
    if (!isWriterAmong(remainingIds, localUser.id)) return
    if (lastUserLog(validLogsRef.current, data.userId)?.type === 'leave') return

    const opts = optionsRef.current
    const cached = userCacheRef.current.get(data.userId)
    const entry = createLogEntry(
      'leave',
      data.userId,
      cached?.displayName ?? opts.displayNameFallback,
      cached?.avatarUrl ?? null,
      nowRef.current(),
    )
    setLogs((prev) => mergeLogs(prev, entry, opts.maxEntries))
    opts.onLeave?.(entry)
  })

  // Unknown ログの永続修復（ライターのみ）
  // 退室イベント処理時にキャッシュミスした Unknown エントリを、
  // 次のレンダーでキャッシュが更新された後に修正する
  useEffect(() => {
    if (!localUser) return
    const fallback = optionsRef.current.displayNameFallback
    const currentLogs = validLogsRef.current
    if (!currentLogs.some((log) => log.displayName === fallback)) return

    const allIds = [localUser.id, ...remoteUsers.map((u) => u.id)]
    if (!isWriterAmong(allIds, localUser.id)) return

    const fixedLogs = enrichLogsWithCache(
      currentLogs,
      fallback,
      userCacheRef.current,
    )
    if (fixedLogs !== currentLogs) {
      setLogs(fixedLogs)
    }
  }, [localUser, remoteUsers, setLogs])

  // Unknown ログをキャッシュで補完して返す（表示の即時修正）
  // 永続修復が走る前でも表示上は正しい名前を出す
  const cacheSize = userCacheRef.current.size
  return useMemo(
    () =>
      enrichLogsWithCache(
        validLogs,
        options.displayNameFallback,
        userCacheRef.current,
      ),
    [validLogs, options.displayNameFallback, cacheSize],
  )
}
