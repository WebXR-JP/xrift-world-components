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
