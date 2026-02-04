import type Hls from 'hls.js'
import type { HlsPlayerStrategy, HlsPlayerOptions } from '../types'

/** hls.js を使用した HLS プレイヤー */
export class HlsJsPlayer implements HlsPlayerStrategy {
  private hls: Hls
  private video: HTMLVideoElement
  private tracker: HlsPlayerOptions['tracker']
  private callbacks: HlsPlayerOptions['callbacks']

  constructor(HlsClass: typeof Hls, options: HlsPlayerOptions) {
    this.video = options.video
    this.tracker = options.tracker
    this.callbacks = options.callbacks

    this.hls = new HlsClass({
      enableWorker: true,
      lowLatencyMode: true,
    })

    this.setupEventListeners(HlsClass)
    this.hls.attachMedia(this.video)

    console.log('[HlsJsPlayer] Initialized')
  }

  private setupEventListeners(HlsClass: typeof Hls): void {
    const { onError, onBufferingChange, onManifestParsed } = this.callbacks

    this.hls.on(HlsClass.Events.ERROR, (_event, data) => {
      if (!data.fatal) {
        console.log('[HlsJsPlayer] Non-fatal error:', data.details)
        return
      }

      console.warn('[HlsJsPlayer] Fatal error:', data.type, data.details)

      if (data.type === HlsClass.ErrorTypes.MEDIA_ERROR) {
        const recovered = this.attemptRecovery()
        if (!recovered && !this.tracker.isErrorReported) {
          this.tracker.markErrorReported()
          onError?.(new Error(`HLS media error: ${data.details}`))
        }
      } else if (data.type === HlsClass.ErrorTypes.NETWORK_ERROR) {
        console.log('[HlsJsPlayer] Network error, restarting load...')
        this.hls.startLoad()
      } else {
        if (!this.tracker.isErrorReported) {
          this.tracker.markErrorReported()
          onError?.(new Error(`HLS error: ${data.type} - ${data.details}`))
        }
      }
    })

    this.hls.on(HlsClass.Events.FRAG_BUFFERED, () => {
      onBufferingChange?.(false)
    })

    this.hls.on(HlsClass.Events.MANIFEST_PARSED, () => {
      onManifestParsed?.()
    })
  }

  load(url: string): void {
    this.hls.loadSource(url)
  }

  destroy(): void {
    this.hls.destroy()
    console.log('[HlsJsPlayer] Destroyed')
  }

  attemptRecovery(): boolean {
    if (!this.tracker.shouldAttemptRecovery()) {
      return false
    }

    try {
      this.hls.recoverMediaError()
      return true
    } catch (e) {
      console.error('[HlsJsPlayer] recoverMediaError() failed:', e)
      return false
    }
  }

  /** hls.js インスタンスへの参照を取得 */
  get instance(): Hls {
    return this.hls
  }
}
