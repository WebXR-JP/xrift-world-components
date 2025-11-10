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
