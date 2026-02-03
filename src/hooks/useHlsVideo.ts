import { useEffect, useRef, useCallback, useState } from 'react'
import { VideoTexture, SRGBColorSpace, LinearFilter } from 'three'
import { useWebAudioVolume } from './useWebAudioVolume'

// リカバリのスロットリング間隔（ms）
const RECOVERY_THROTTLE_MS = 5000
// リカバリ失敗とみなすまでの最大試行回数
const MAX_RECOVERY_ATTEMPTS = 3

export interface UseHlsVideoOptions {
  /** HLS動画URL */
  url: string
  /** キャッシュバスター用キー */
  cacheKey?: number
  /** 再生中かどうか */
  playing: boolean
  /** 音量 0〜1 */
  volume: number
  /** エラー発生時のコールバック */
  onError?: (error: Error) => void
  /** バッファリング状態変更時のコールバック */
  onBufferingChange?: (buffering: boolean) => void
}

export interface UseHlsVideoReturn {
  /** 動画テクスチャ */
  texture: VideoTexture
  /** 動画要素への参照 */
  videoRef: React.RefObject<HTMLVideoElement>
}

/** URLがHLSストリームかどうかを判定 */
function isHlsUrl(url: string): boolean {
  return url.includes('.m3u8') || url.includes('application/vnd.apple.mpegurl')
}

/** Safari（native HLS対応ブラウザ）かどうかを判定 */
function canPlayHlsNatively(): boolean {
  if (typeof document === 'undefined') return false
  const video = document.createElement('video')
  return video.canPlayType('application/vnd.apple.mpegurl') !== ''
}

/**
 * HLSストリーム専用のビデオ要素管理フック
 *
 * - hls.js を使用（Safari以外）
 * - Native HLS support を使用（Safari）
 * - recoverMediaError() によるエラーリカバリ
 * - リカバリ失敗時のみ完全リロード
 */
export function useHlsVideo({
  url,
  cacheKey = 0,
  playing,
  volume,
  onError,
  onBufferingChange,
}: UseHlsVideoOptions): UseHlsVideoReturn {
  const videoRef = useRef<HTMLVideoElement>(null!)
  const hlsRef = useRef<import('hls.js').default | null>(null)
  const textureRef = useRef<VideoTexture | null>(null)

  // エラーリカバリ用の状態
  const lastRecoveryTimeRef = useRef<number>(0)
  const recoveryAttemptsRef = useRef<number>(0)
  const errorReportedRef = useRef<boolean>(false)

  // テクスチャを状態として保持（初回レンダリング時に同期的に作成）
  const [texture, setTexture] = useState<VideoTexture>(() => {
    // 初回レンダリング時にvideo要素とテクスチャを作成
    const video = document.createElement('video')
    video.crossOrigin = 'anonymous'
    video.playsInline = true
    video.muted = false
    videoRef.current = video

    const tex = new VideoTexture(video)
    tex.colorSpace = SRGBColorSpace
    tex.minFilter = LinearFilter
    tex.magFilter = LinearFilter
    textureRef.current = tex
    return tex
  })

  // エラーリカバリを試行
  const attemptRecovery = useCallback(() => {
    const hls = hlsRef.current
    if (!hls) return false

    const now = Date.now()
    const timeSinceLastRecovery = now - lastRecoveryTimeRef.current

    // スロットリング: 5秒以内の連続エラーはカウント増加
    if (timeSinceLastRecovery < RECOVERY_THROTTLE_MS) {
      recoveryAttemptsRef.current++
    } else {
      // 5秒以上経過していればカウントリセット
      recoveryAttemptsRef.current = 1
    }

    lastRecoveryTimeRef.current = now

    // 最大試行回数を超えた場合はリカバリ失敗
    if (recoveryAttemptsRef.current > MAX_RECOVERY_ATTEMPTS) {
      console.error(
        `[useHlsVideo] Recovery failed after ${MAX_RECOVERY_ATTEMPTS} attempts`
      )
      return false
    }

    console.log(
      `[useHlsVideo] Attempting recovery (attempt ${recoveryAttemptsRef.current}/${MAX_RECOVERY_ATTEMPTS})`
    )

    try {
      hls.recoverMediaError()
      return true
    } catch (e) {
      console.error('[useHlsVideo] recoverMediaError() failed:', e)
      return false
    }
  }, [])

  // hls.js の初期化
  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    // URLにcacheKeyを付与
    const urlWithCacheKey = `${url}${url.includes('?') ? '&' : '?'}_ck=${cacheKey}`

    // リカバリカウンターをリセット
    recoveryAttemptsRef.current = 0
    lastRecoveryTimeRef.current = 0
    errorReportedRef.current = false

    // HLS URLでない場合はネイティブ再生
    if (!isHlsUrl(url)) {
      video.src = urlWithCacheKey
      if (playing) {
        video.play().catch((err) => {
          console.error('[useHlsVideo] Play error:', err)
        })
      }
      return () => {
        video.pause()
        video.src = ''
        video.load()
      }
    }

    // hls.js を使用（hls.js が利用可能な場合は常に優先）
    let hls: import('hls.js').default | null = null
    let useNative = false

    const initHls = async () => {
      try {
        const Hls = (await import('hls.js')).default

        if (Hls.isSupported()) {
          console.log('[useHlsVideo] Using hls.js')

          hls = new Hls({
            enableWorker: true,
            lowLatencyMode: true,
          })
          hlsRef.current = hls

          // エラーハンドリング
          hls.on(Hls.Events.ERROR, (_event, data) => {
            if (!data.fatal) {
              // 非致命的エラーは無視
              console.log('[useHlsVideo] Non-fatal error:', data.details)
              return
            }

            console.warn('[useHlsVideo] Fatal error:', data.type, data.details)

            if (data.type === Hls.ErrorTypes.MEDIA_ERROR) {
              // MEDIA_ERROR の場合は recoverMediaError() を試行
              const recovered = attemptRecovery()
              if (!recovered && !errorReportedRef.current) {
                errorReportedRef.current = true
                onError?.(new Error(`HLS media error: ${data.details}`))
              }
            } else if (data.type === Hls.ErrorTypes.NETWORK_ERROR) {
              // ネットワークエラーの場合はリトライを試行
              console.log('[useHlsVideo] Network error, starting load...')
              hls?.startLoad()
            } else {
              // その他の致命的エラー
              if (!errorReportedRef.current) {
                errorReportedRef.current = true
                onError?.(new Error(`HLS error: ${data.type} - ${data.details}`))
              }
            }
          })

          // バッファリング状態の監視
          hls.on(Hls.Events.FRAG_BUFFERED, () => {
            onBufferingChange?.(false)
          })

          // マニフェスト読み込み完了
          hls.on(Hls.Events.MANIFEST_PARSED, () => {
            if (playing) {
              video.play().catch((err) => {
                console.error('[useHlsVideo] Play error after manifest parsed:', err)
              })
            }
          })

          // ソースの設定
          hls.loadSource(urlWithCacheKey)
          hls.attachMedia(video)
        } else if (canPlayHlsNatively()) {
          // hls.js が使えない場合のみネイティブ HLS にフォールバック
          console.log('[useHlsVideo] hls.js not supported, using native HLS')
          useNative = true
          setupNativeHls()
        } else {
          console.error('[useHlsVideo] HLS is not supported in this browser')
          onError?.(new Error('HLS is not supported in this browser'))
        }
      } catch (err) {
        console.warn('[useHlsVideo] Failed to load hls.js, trying native:', err)
        // hls.js が利用できない場合はネイティブ再生にフォールバック
        if (canPlayHlsNatively()) {
          useNative = true
          setupNativeHls()
        } else {
          onError?.(new Error('HLS playback is not available'))
        }
      }
    }

    // ネイティブ HLS 用のエラーハンドラー
    const handleNativeError = () => {
      const error = video.error
      if (!error) return

      // MEDIA_ERR_DECODE の場合はリカバリを試みる
      if (error.code === MediaError.MEDIA_ERR_DECODE) {
        const now = Date.now()
        const timeSinceLastRecovery = now - lastRecoveryTimeRef.current

        if (timeSinceLastRecovery < RECOVERY_THROTTLE_MS) {
          recoveryAttemptsRef.current++
        } else {
          recoveryAttemptsRef.current = 1
        }
        lastRecoveryTimeRef.current = now

        if (recoveryAttemptsRef.current <= MAX_RECOVERY_ATTEMPTS) {
          console.log(
            `[useHlsVideo] Native decode error, attempting recovery (${recoveryAttemptsRef.current}/${MAX_RECOVERY_ATTEMPTS})`
          )
          // currentTime を少し進めて問題のセグメントをスキップ
          const currentTime = video.currentTime
          video.currentTime = currentTime + 0.5
          video.play().catch(() => {})
          return
        }
      }

      // リカバリ失敗またはその他のエラー
      if (!errorReportedRef.current) {
        errorReportedRef.current = true
        console.error('[useHlsVideo] Native video error:', error.message)
        onError?.(new Error(error.message))
      }
    }

    const setupNativeHls = () => {
      video.src = urlWithCacheKey
      video.addEventListener('error', handleNativeError)
      if (playing) {
        video.play().catch((err) => {
          console.error('[useHlsVideo] Play error:', err)
        })
      }
    }

    initHls()

    return () => {
      if (hls) {
        hls.destroy()
        hlsRef.current = null
      }
      if (useNative) {
        video.removeEventListener('error', handleNativeError)
      }
      video.pause()
      video.src = ''
      video.load()
    }
  }, [url, cacheKey, onError, onBufferingChange, playing, attemptRecovery])

  // 再生/停止制御
  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    if (playing) {
      video.play().catch((err) => {
        console.error('[useHlsVideo] Play error:', err)
      })
    } else {
      video.pause()
    }
  }, [playing])

  // バッファリング状態の監視
  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    const handleWaiting = () => onBufferingChange?.(true)
    const handlePlaying = () => onBufferingChange?.(false)
    const handleCanPlay = () => onBufferingChange?.(false)

    video.addEventListener('waiting', handleWaiting)
    video.addEventListener('playing', handlePlaying)
    video.addEventListener('canplay', handleCanPlay)

    return () => {
      video.removeEventListener('waiting', handleWaiting)
      video.removeEventListener('playing', handlePlaying)
      video.removeEventListener('canplay', handleCanPlay)
    }
  }, [onBufferingChange])

  // Web Audio API を使用した音量制御（iOS対応）
  useWebAudioVolume(videoRef.current, volume)

  // クリーンアップ
  useEffect(() => {
    return () => {
      if (textureRef.current) {
        textureRef.current.dispose()
      }
    }
  }, [])

  return { texture, videoRef }
}
