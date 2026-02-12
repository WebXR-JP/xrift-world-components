/** ログエントリの種別 */
export type LogType = 'join' | 'leave'

/** 入退室ログの1件分 */
export interface LogEntry {
  /** 決定論的に生成されるID（冪等なマージ用） */
  id: string
  /** ログ種別 */
  type: LogType
  /** ユーザーID */
  userId: string
  /** 表示名 */
  displayName: string
  /** アバターアイコンURL */
  avatarUrl: string | null
  /** フォーマット済みタイムスタンプ */
  timestamp: string
}

/** ラベル文言のカスタマイズ */
export interface Labels {
  /** 入室時のラベル */
  join: string
  /** 退室時のラベル */
  leave: string
}

/** 色のカスタマイズ */
export interface Colors {
  /** 入室ログの色 */
  join: string
  /** 退室ログの色 */
  leave: string
  /** ボード背景色 */
  background: string
  /** テキスト色 */
  text: string
}

/** user-joined イベントのデータ型 */
export interface UserJoinedEvent {
  userId: string
  isGuest: boolean
}

/** user-left イベントのデータ型 */
export interface UserLeftEvent {
  userId: string
}

/** EntryLogBoard のプロパティ */
export interface Props {
  /** インスタンス状態のキー（複数ボード設置時の識別用） */
  stateNamespace?: string
  /** 最大表示件数 */
  maxEntries?: number
  /** タイムスタンプのフォーマット関数 */
  formatTimestamp?: (date: Date) => string
  /** 表示名が取得できない場合のフォールバック */
  displayNameFallback?: string
  /** ラベル文言 */
  labels?: Partial<Labels>
  /** 色設定 */
  colors?: Partial<Colors>
  /** ボードの位置 */
  position?: [number, number, number]
  /** ボードの回転 */
  rotation?: [number, number, number]
  /** 全体スケール */
  scale?: number
  /** 入室時のコールバック */
  onJoin?: (entry: LogEntry) => void
  /** 退室時のコールバック */
  onLeave?: (entry: LogEntry) => void
}
