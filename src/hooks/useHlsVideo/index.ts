import { useEffect, useRef, useCallback, useState } from 'react'
import { VideoTexture } from 'three'
import { useWebAudioVolume } from '../useWebAudioVolume'
import { isHlsUrl, canPlayHlsNatively, appendCacheKey, createVideoTexture } from './utils'
import { RecoveryTracker } from './RecoveryTracker'

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
  const recoveryTrackerRef = useRef(new RecoveryTracker())

  // テクスチャを状態として保持（初回レンダリング時に同期的に作成）
  const [texture] = useState<VideoTexture>(() => {
    const { video, texture: tex } = createVideoTexture()
    videoRef.current = video
    textureRef.current = tex
    return tex
  })

  // hls.js のエラーリカバリを試行
  const attemptHlsRecovery = useCallback(() => {
    const hls = hlsRef.current
    if (!hls) return false

    if (!recoveryTrackerRef.current.shouldAttemptRecovery()) {
      return false
    }

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

    const urlWithCacheKey = appendCacheKey(url, cacheKey)
    const tracker = recoveryTrackerRef.current
    tracker.reset()

    // HLS URLでない場合はネイティブ再生
    if (!isHlsUrl(url)) {
      video.src = urlWithCacheKey
      if (playing) {
        video.play().catch((err) => console.error('[useHlsVideo] Play error:', err))
      }
      return () => {
        video.pause()
        video.src = ''
        video.load()
      }
    }

    let hls: import('hls.js').default | null = null
    let useNative = false

    // ネイティブ HLS 用のエラーハンドラー
    const handleNativeError = () => {
      const error = video.error
      if (!error) return

      if (error.code === MediaError.MEDIA_ERR_DECODE) {
        if (tracker.shouldAttemptRecovery()) {
          video.currentTime = video.currentTime + 0.5
          video.play().catch(() => {})
          return
        }
      }

      if (!tracker.isErrorReported) {
        tracker.markErrorReported()
        console.error('[useHlsVideo] Native video error:', error.message)
        onError?.(new Error(error.message))
      }
    }

    const setupNativeHls = () => {
      video.src = urlWithCacheKey
      video.addEventListener('error', handleNativeError)
      if (playing) {
        video.play().catch((err) => console.error('[useHlsVideo] Play error:', err))
      }
    }

    const initHls = async () => {
      try {
        const Hls = (await import('hls.js')).default

        if (Hls.isSupported()) {
          console.log('[useHlsVideo] Using hls.js')
          hls = new Hls({ enableWorker: true, lowLatencyMode: true })
          hlsRef.current = hls

          // エラーハンドリング
          hls.on(Hls.Events.ERROR, (_event, data) => {
            if (!data.fatal) {
              console.log('[useHlsVideo] Non-fatal error:', data.details)
              return
            }

            console.warn('[useHlsVideo] Fatal error:', data.type, data.details)

            if (data.type === Hls.ErrorTypes.MEDIA_ERROR) {
              const recovered = attemptHlsRecovery()
              if (!recovered && !tracker.isErrorReported) {
                tracker.markErrorReported()
                onError?.(new Error(`HLS media error: ${data.details}`))
              }
            } else if (data.type === Hls.ErrorTypes.NETWORK_ERROR) {
              console.log('[useHlsVideo] Network error, starting load...')
              hls?.startLoad()
            } else {
              if (!tracker.isErrorReported) {
                tracker.markErrorReported()
                onError?.(new Error(`HLS error: ${data.type} - ${data.details}`))
              }
            }
          })

          hls.on(Hls.Events.FRAG_BUFFERED, () => onBufferingChange?.(false))
          hls.on(Hls.Events.MANIFEST_PARSED, () => {
            if (playing) {
              video.play().catch((err) =>
                console.error('[useHlsVideo] Play error after manifest parsed:', err)
              )
            }
          })

          hls.loadSource(urlWithCacheKey)
          hls.attachMedia(video)
        } else if (canPlayHlsNatively()) {
          console.log('[useHlsVideo] hls.js not supported, using native HLS')
          useNative = true
          setupNativeHls()
        } else {
          console.error('[useHlsVideo] HLS is not supported in this browser')
          onError?.(new Error('HLS is not supported in this browser'))
        }
      } catch (err) {
        console.warn('[useHlsVideo] Failed to load hls.js, trying native:', err)
        if (canPlayHlsNatively()) {
          useNative = true
          setupNativeHls()
        } else {
          onError?.(new Error('HLS playback is not available'))
        }
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
  }, [url, cacheKey, onError, onBufferingChange, playing, attemptHlsRecovery])

  // 再生/停止制御
  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    if (playing) {
      video.play().catch((err) => console.error('[useHlsVideo] Play error:', err))
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
