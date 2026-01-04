export interface VideoScreenProps {
  /** スクリーンの一意なID（インスタンス内で一意である必要があります） */
  id: string
  /** スクリーンの位置 */
  position?: [number, number, number]
  /** スクリーンの回転 */
  rotation?: [number, number, number]
  /** スクリーンのサイズ [幅, 高さ] */
  scale?: [number, number]
  /** 動画のURL */
  url?: string
  /** 再生中かどうか（デフォルト: true） */
  playing?: boolean
  /** 再生位置（秒） */
  currentTime?: number
  /** 同期モード: "global" = インスタンス全体で同期, "local" = ローカルのみ（デフォルト: "global"） */
  sync?: 'global' | 'local'
  /** ミュート状態（デフォルト: false）。ブラウザの自動再生ポリシーによりユーザー操作前は音声付き自動再生がブロックされる場合がある */
  muted?: boolean
}

/**
 * VideoScreenの状態
 * useInstanceStateで同期される
 */
export interface VideoState {
  /** 動画のURL */
  url: string
  /** 再生中かどうか */
  isPlaying: boolean
  /** 現在の再生位置（秒） */
  currentTime: number
  /** サーバータイム（VRChat方式の同期用） */
  serverTime: number
}
