import { useEffect, useRef, useState } from 'react'
import { VideoTexture } from 'three'
import { useWebAudioVolume } from '../../../../hooks/useWebAudioVolume'
import { appendCacheKey, createVideoTexture, createHlsPlayer } from './utils'
import { RecoveryTracker } from './classes/RecoveryTracker'
import type { HlsPlayerStrategy } from './types'

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
  const textureRef = useRef<VideoTexture | null>(null)
  const playerRef = useRef<HlsPlayerStrategy | null>(null)
  const recoveryTrackerRef = useRef(new RecoveryTracker())

  // テクスチャを状態として保持（初回レンダリング時に同期的に作成）
  const [texture] = useState<VideoTexture>(() => {
    const { video, texture: tex } = createVideoTexture()
    videoRef.current = video
    textureRef.current = tex
    return tex
  })

  // プレイヤーの初期化
  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    const urlWithCacheKey = appendCacheKey(url, cacheKey)
    const tracker = recoveryTrackerRef.current
    tracker.reset()

    let player: HlsPlayerStrategy | null = null

    const init = async () => {
      const result = await createHlsPlayer({
        video,
        tracker,
        callbacks: {
          onError,
          onBufferingChange,
          onManifestParsed: () => {
            if (playing) {
              video.play().catch((err) =>
                console.error('[useHlsVideo] Play error after manifest parsed:', err)
              )
            }
          },
        },
      })

      if (result.type === 'unsupported') {
        onError?.(result.error)
        return
      }

      player = result.player
      playerRef.current = player
      player.load(urlWithCacheKey)
    }

    init()

    return () => {
      if (player) {
        player.destroy()
        playerRef.current = null
      }
      video.pause()
      video.src = ''
      video.load()
    }
  }, [url, cacheKey, onError, onBufferingChange, playing])

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
