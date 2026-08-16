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
  /** 音量（0〜1、デフォルト: 1） */
  volume?: number
}

/**
 * VideoScreenの状態（useInstanceStateで同期される）
 *
 * `currentTime` と `serverTime` は**アンカー**として使う。
 * 「サーバ時刻 `serverTime` のとき再生位置は `currentTime` だった」という意味で、
 * 各クライアントはここから自分で現在の目標位置を計算する。
 * 「いまの再生位置」を配ると受け取った瞬間には既に古いが、アンカーなら
 * **後から入った人も通信ゼロで正しい位置に追いつける**。
 */
export interface VideoState {
  /** 動画のURL */
  url: string
  /** 再生中かどうか */
  isPlaying: boolean
  /** アンカーの再生位置（秒） */
  currentTime: number
  /**
   * アンカーのサーバ時刻（ms）
   *
   * 共有時計（`useServerClock`）の値。端末の `Date.now()` は互いに 0.1〜数秒
   * ずれているため、ここに入れてはいけない（実測で 0.66 秒ずれた端末がある）
   */
  serverTime: number
}
