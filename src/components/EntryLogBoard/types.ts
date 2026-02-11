export type Labels = {
  title?: string
  join?: string
  leave?: string
}

export type Colors = {
  background?: string
  header?: string
  title?: string
  timestamp?: string
  text?: string
  join?: string
  leave?: string
}

export type KnownUser = {
  userId: string
  displayName: string
  avatarUrl: string | null
  joinedAt: string
}

export type LogEntry = {
  id: string
  userId: string
  displayName: string
  type: 'join' | 'leave'
  timestamp: string
  avatarUrl: string | null
}

export interface Props {
  position?: [number, number, number]
  rotation?: [number, number, number]
  scale?: number
  maxEntries?: number
  /** インスタンス共有キーの名前空間。複数設置時の衝突回避用。 */
  stateNamespace?: string
  /**
   * 退室判定の猶予(ms)。
   * WebRTC の瞬断/遅延で remoteUsers が一時的に欠けるケースを吸収します。
   */
  leaveGraceMs?: number
  /**
   * リーダー交代直後の同期猶予(ms)。
   * useInstanceState がまだハイドレーションされていない状態で空配列を送信し、
   * 既存ログを上書きしてしまう事故を抑制します。
   */
  leaderHydrationGraceMs?: number
  /** タイトルやステータスラベルの上書き。 */
  labels?: Labels
  /** 色設定の上書き。 */
  colors?: Colors
  /** サンプル表示を上書き。空配列を渡せばサンプル非表示。 */
  placeholderEntries?: LogEntry[]
  /** 表示名が空だったときのフォールバック。 */
  displayNameFallback?: string
  /** タイムスタンプ生成をカスタムしたい場合に渡す。 */
  formatTimestamp?: () => string
  /** ユーザー入室時のコールバック。 */
  onJoin?: (entry: LogEntry) => void
  /** ユーザー退室時のコールバック。 */
  onLeave?: (entry: LogEntry) => void
}
