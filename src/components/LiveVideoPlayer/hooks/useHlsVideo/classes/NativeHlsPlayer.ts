import type { HlsPlayerStrategy, HlsPlayerOptions } from '../types'

// MediaError.MEDIA_ERR_DECODE の値（テスト環境での互換性のため直接定義）
const MEDIA_ERR_DECODE = 3

/** ブラウザネイティブの HLS 再生を使用するプレイヤー（主に Safari 向け） */
export class NativeHlsPlayer implements HlsPlayerStrategy {
  private video: HTMLVideoElement
  private tracker: HlsPlayerOptions['tracker']
  private callbacks: HlsPlayerOptions['callbacks']
  private handleError: () => void

  constructor(options: HlsPlayerOptions) {
    this.video = options.video
    this.tracker = options.tracker
    this.callbacks = options.callbacks

    this.handleError = this.onError.bind(this)
    this.video.addEventListener('error', this.handleError)

    console.log('[NativeHlsPlayer] Initialized')
  }

  private onError(): void {
    const error = this.video.error
    if (!error) return

    const { onError } = this.callbacks

    if (error.code === MEDIA_ERR_DECODE) {
      if (this.attemptRecovery()) {
        return
      }
    }

    if (!this.tracker.isErrorReported) {
      this.tracker.markErrorReported()
      console.error('[NativeHlsPlayer] Video error:', error.message)
      onError?.(new Error(error.message))
    }
  }

  load(url: string): void {
    this.video.src = url
  }

  destroy(): void {
    this.video.removeEventListener('error', this.handleError)
    console.log('[NativeHlsPlayer] Destroyed')
  }

  attemptRecovery(): boolean {
    if (!this.tracker.shouldAttemptRecovery()) {
      return false
    }

    console.log('[NativeHlsPlayer] Attempting recovery by skipping segment')
    this.video.currentTime = this.video.currentTime + 0.5
    this.video.play().catch(() => {})
    return true
  }
}
