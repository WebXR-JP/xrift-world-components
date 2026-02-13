import { type LogEntry, type LogType } from './types'

/**
 * デフォルトのタイムスタンプフォーマット（HH:MM 形式）
 */
export const defaultFormatTimestamp = (date: Date): string => {
  const hours = date.getHours().toString().padStart(2, '0')
  const minutes = date.getMinutes().toString().padStart(2, '0')
  return `${hours}:${minutes}`
}

/**
 * 決定論的なログエントリIDを生成する
 *
 * 全クライアントが同じ既存ログから同じIDを計算するため、
 * リーダー選出なしで冪等なマージが可能になる。
 *
 * @param type ログ種別（join / leave）
 * @param userId ユーザーID
 * @param existingLogs 既存のログエントリ一覧
 * @returns 決定論的ID（例: "join-user123-2"）
 */
export const buildLogEntryId = (
  type: LogType,
  userId: string,
  existingLogs: LogEntry[],
): string => {
  const sameTypeCount = existingLogs.filter(
    (log) => log.type === type && log.userId === userId,
  ).length
  return `${type}-${userId}-${sameTypeCount}`
}

/**
 * ログエントリを生成する
 */
export const createLogEntry = (
  type: LogType,
  userId: string,
  displayName: string,
  avatarUrl: string | null,
  existingLogs: LogEntry[],
  formatTimestamp: (date: Date) => string,
): LogEntry => ({
  id: buildLogEntryId(type, userId, existingLogs),
  type,
  userId,
  displayName,
  avatarUrl,
  timestamp: formatTimestamp(new Date()),
})

/**
 * 候補ID群の中で辞書順最小のIDがtargetIdと一致するかを判定する
 *
 * 暗黙的ライター選出に使用。全クライアントが同じ候補群を持つため、
 * 辞書順最小のクライアントだけが書き込みを行う。
 */
export const isWriterAmong = (
  candidateIds: (string | undefined)[],
  targetId: string | undefined,
): boolean => {
  if (!targetId) return false
  const sorted = candidateIds.filter((id): id is string => id != null).sort()
  return sorted.length > 0 && sorted[0] === targetId
}

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
 * 既存ログに新しいエントリをマージする（重複排除・件数制限）
 *
 * 同じIDのエントリが既に存在する場合は追加しない（冪等性）。
 */
export const mergeLogs = (
  existingLogs: LogEntry[],
  newEntry: LogEntry,
  maxEntries: number,
): LogEntry[] => {
  if (existingLogs.some((log) => log.id === newEntry.id)) return existingLogs
  return [...existingLogs, newEntry].slice(-maxEntries)
}
