import { type LogEntry, type LogType } from './types'

/**
 * デフォルトのタイムスタンプフォーマット（HH:MM 形式）
 *
 * @param timestampMs epoch ミリ秒（共有時計基準の同一瞬間を全端末で表示する）
 */
export const defaultFormatTimestamp = (timestampMs: number): string => {
  const date = new Date(timestampMs)
  if (Number.isNaN(date.getTime())) return '--:--'
  const hours = date.getHours().toString().padStart(2, '0')
  const minutes = date.getMinutes().toString().padStart(2, '0')
  return `${hours}:${minutes}`
}

/**
 * ログエントリIDを生成する
 *
 * 書き込み主体と共有時計の時刻から一意に決まる。旧実装のような
 * 「既存ログの件数ベース」ではないため、maxEntries による切り捨てや
 * 同期遅延の影響を受けず、再入室時も時刻が異なるため衝突しない。
 *
 * @param type ログ種別（join / leave）
 * @param userId ユーザーID
 * @param timestampMs 共有時計の epoch ミリ秒
 * @returns 一意なID（例: "join-user123-1710000000000"）
 */
export const buildLogEntryId = (
  type: LogType,
  userId: string,
  timestampMs: number,
): string => `${type}-${userId}-${timestampMs}`

/**
 * ログエントリを生成する
 */
export const createLogEntry = (
  type: LogType,
  userId: string,
  displayName: string,
  avatarUrl: string | null,
  timestampMs: number,
): LogEntry => ({
  id: buildLogEntryId(type, userId, timestampMs),
  type,
  userId,
  displayName,
  avatarUrl,
  timestamp: timestampMs,
})

/**
 * ログエントリの形が現行仕様かを判定する
 *
 * 旧仕様（timestamp がフォーマット済み文字列）のエントリが
 * 共有状態に残っている場合に表示崩れ（NaN:NaN）を防ぐため、
 * 読み出し側で除外する。除外された旧エントリは maxEntries の
 * 切り捨てで自然に消える。
 */
export const isValidLogEntry = (log: LogEntry): boolean => {
  if (log.type !== 'join' && log.type !== 'leave') return false
  if (typeof log.userId !== 'string') return false
  if (typeof log.displayName !== 'string') return false
  if (typeof log.timestamp !== 'number' || Number.isNaN(log.timestamp)) return false
  return true
}

/**
 * 指定ユーザーの最新のログエントリを返す
 *
 * 再入室判定用。最後が join なら入室済み、leave（または無し）なら未記録として扱う。
 */
export const lastUserLog = (
  logs: LogEntry[],
  userId: string,
): LogEntry | undefined => {
  for (let i = logs.length - 1; i >= 0; i--) {
    if (logs[i].userId === userId) return logs[i]
  }
  return undefined
}

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
 * 退室イベント処理時に退室者がキャッシュに未登録で
 * Unknown になったエントリを、後から修復する。
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
