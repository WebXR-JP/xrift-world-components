/** LiveVideoPlayerの同期状態 */
export interface LiveVideoState {
  /** 再生中のURL */
  url?: string
  /** 再生中かどうか */
  playing: boolean
  /** キャッシュバスター用キー */
  reloadKey: number
}

export interface LiveVideoPlayerProps {
  /** スクリーンの一意なID（必須） */
  id: string
  /** スクリーンの位置 */
  position?: [number, number, number]
  /** スクリーンの回転 */
  rotation?: [number, number, number]
  /** スクリーンの幅（高さは16:9で自動計算、デフォルト: 4） */
  width?: number
  /** ライブストリームのURL（HLS .m3u8 形式） */
  url?: string
  /** 初期再生状態（デフォルト: false） */
  playing?: boolean
  /** 初期音量 0〜1（デフォルト: 1） */
  volume?: number
  /** 同期モード（デフォルト: 'global'） */
  sync?: 'global' | 'local'
  /** エラー発生時のコールバック */
  onError?: (error: Error) => void
}

export interface LiveControlPanelProps {
  id: string
  width: number
  screenHeight: number
  playing: boolean
  volume: number
  isBuffering: boolean
  currentUrl: string
  onPlayPause: () => void
  onStop: () => void
  onVolumeChange: (volume: number) => void
  onUrlChange: (url: string) => void
}

export interface PlayPauseButtonProps {
  id: string
  position: [number, number, number]
  size: number
  playing: boolean
  onInteract: () => void
}

export interface VolumeControlProps {
  id: string
  position: [number, number, number]
  size: number
  volume: number
  onVolumeChange: (volume: number) => void
}

export interface LiveIndicatorProps {
  position: [number, number, number]
  size: number
  playing: boolean
}

export interface LoadingSpinnerProps {
  position: [number, number, number]
  size: number
}

export interface UrlInputButtonProps {
  id: string
  position: [number, number, number]
  size: number
  currentUrl: string
  onUrlChange: (url: string) => void
}

export interface StopButtonProps {
  id: string
  position: [number, number, number]
  size: number
  onInteract: () => void
}
