import { type LogEntry, type LogType } from './types'

/**
 * キャッシュからユーザー情報を解決する
 *
 * キャッシュにヒットすればその情報を返し、
 * ミスした場合は fallbackName と null を返す。
 */
export const resolveUserInfo = (
  userId: string,
  cache: Map<string, { displayName: string; avatarUrl: string | null }>,
  fallbackName: string,
): { displayName: string; avatarUrl: string | null } => {
  const cached = cache.get(userId)
  return {
    displayName: cached?.displayName ?? fallbackName,
    avatarUrl: cached?.avatarUrl ?? null,
  }
}

/**
 * デフォルトのタイムスタンプフォーマット（HH:MM 形式）
 */
export const defaultFormatTimestamp = (date: Date): string => {
  const hours = date.getHours().toString().padStart(2, '0')
  const minutes = date.getMinutes().toString().padStart(2, '0')
  return `${hours}:${minutes}`
}

/**
 * ログエントリを生成する
 */
export const createLogEntry = (
  type: LogType,
  userId: string,
  displayName: string,
  avatarUrl: string | null,
  formatTimestamp: (date: Date) => string,
): LogEntry => ({
  id: crypto.randomUUID(),
  type,
  userId,
  displayName,
  avatarUrl,
  timestamp: formatTimestamp(new Date()),
})

/**
 * ログ内の Unknown 表示名をキャッシュで補完する
 *
 * user-joined イベント発火時にまだ remoteUsers が更新されておらず
 * キャッシュミスで Unknown になったエントリを、後から修復する。
 * 変更がなければ元の配列をそのまま返す（参照同一性を維持）。
 */
export const enrichLogsWithCache = (
  logs: LogEntry[],
  fallbackName: string,
  cache: Map<string, { displayName: string; avatarUrl: string | null }>,
): LogEntry[] => {
  let needsEnrich = false
  for (const log of logs) {
    if (log.displayName === fallbackName && cache.has(log.userId)) {
      needsEnrich = true
      break
    }
  }
  if (!needsEnrich) return logs
  return logs.map((log) => {
    if (log.displayName !== fallbackName) return log
    const cached = cache.get(log.userId)
    if (!cached) return log
    return { ...log, displayName: cached.displayName, avatarUrl: cached.avatarUrl }
  })
}

/**
 * ログに新しいエントリを追加する（件数制限付き）
 */
export const appendLog = (
  logs: LogEntry[],
  entry: LogEntry,
  maxEntries: number,
): LogEntry[] => [...logs, entry].slice(-maxEntries)
