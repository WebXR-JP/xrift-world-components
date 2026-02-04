import type { VideoTexture } from 'three'
import type { RecoveryTracker } from './classes/RecoveryTracker'

export interface HlsPlayerCallbacks {
  onError?: (error: Error) => void
  onBufferingChange?: (buffering: boolean) => void
  onManifestParsed?: () => void
}

export interface HlsPlayerOptions {
  video: HTMLVideoElement
  tracker: RecoveryTracker
  callbacks: HlsPlayerCallbacks
}

/** HLS プレイヤーの共通インターフェース */
export interface HlsPlayerStrategy {
  /** ソースを読み込む */
  load(url: string): void
  /** リソースを解放 */
  destroy(): void
  /** メディアエラーからのリカバリを試行 */
  attemptRecovery(): boolean
}

export interface VideoTextureResult {
  video: HTMLVideoElement
  texture: VideoTexture
}

export type CreatePlayerResult =
  | { player: HlsPlayerStrategy; type: 'hlsjs' | 'native' }
  | { player: null; type: 'unsupported'; error: Error }
