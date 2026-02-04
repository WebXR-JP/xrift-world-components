/** LiveVideoPlayerの同期状態 */
export interface LiveVideoState {
  /** 再生中のURL */
  url?: string
  /** 再生中かどうか */
  playing: boolean
  /** キャッシュバスター用キー */
  reloadKey: number
}
