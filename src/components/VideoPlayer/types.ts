import type { VideoScreenProps } from '../VideoScreen/types'

export interface VideoPlayerProps extends Omit<VideoScreenProps, 'scale' | 'currentTime' | 'muted'> {
  /** スクリーンの一意なID（必須） */
  id: string
  /** スクリーンの位置 */
  position?: [number, number, number]
  /** スクリーンの回転 */
  rotation?: [number, number, number]
  /** スクリーンの幅（高さは16:9で自動計算、デフォルト: 4） */
  width?: number
  /** 動画のURL */
  url?: string
  /** 初期再生状態（デフォルト: true） */
  playing?: boolean
  /** 初期音量 0〜1（デフォルト: 1） */
  volume?: number
  /** 同期モード（デフォルト: 'global'） */
  sync?: 'global' | 'local'
}

export interface ControlPanelProps {
  id: string
  width: number
  screenHeight: number
  playing: boolean
  progress: number
  duration: number
  volume: number
  currentUrl: string
  onPlayPause: () => void
  onStop: () => void
  onSeek: (time: number) => void
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

export interface ProgressBarProps {
  id: string
  position: [number, number, number]
  width: number
  height: number
  progress: number
  duration: number
  onSeek: (time: number) => void
}

export interface VolumeControlProps {
  id: string
  position: [number, number, number]
  size: number
  volume: number
  onVolumeChange: (volume: number) => void
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
