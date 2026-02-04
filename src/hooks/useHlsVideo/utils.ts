import { VideoTexture, SRGBColorSpace, LinearFilter } from 'three'
import { HlsJsPlayer } from './classes/HlsJsPlayer'
import { NativeHlsPlayer } from './classes/NativeHlsPlayer'
import type { HlsPlayerOptions, CreatePlayerResult, VideoTextureResult } from './types'

/** URLがHLSストリームかどうかを判定 */
export function isHlsUrl(url: string): boolean {
  return url.includes('.m3u8') || url.includes('application/vnd.apple.mpegurl')
}

/** Safari（native HLS対応ブラウザ）かどうかを判定 */
export function canPlayHlsNatively(): boolean {
  if (typeof document === 'undefined') return false
  const video = document.createElement('video')
  return video.canPlayType('application/vnd.apple.mpegurl') !== ''
}

/** URLにキャッシュバスター用のキーを付与 */
export function appendCacheKey(url: string, cacheKey: number): string {
  return `${url}${url.includes('?') ? '&' : '?'}_ck=${cacheKey}`
}

/** HLS再生用のvideo要素とテクスチャを作成 */
export function createVideoTexture(): VideoTextureResult {
  const video = document.createElement('video')
  video.crossOrigin = 'anonymous'
  video.playsInline = true
  video.muted = false

  const texture = new VideoTexture(video)
  texture.colorSpace = SRGBColorSpace
  texture.minFilter = LinearFilter
  texture.magFilter = LinearFilter

  return { video, texture }
}

/**
 * 環境に応じて適切な HLS プレイヤーを作成
 * hls.js を優先し、利用できない場合はネイティブ HLS にフォールバック
 */
export async function createHlsPlayer(
  options: HlsPlayerOptions
): Promise<CreatePlayerResult> {
  // hls.js を優先
  try {
    const Hls = (await import('hls.js')).default

    if (Hls.isSupported()) {
      return {
        player: new HlsJsPlayer(Hls, options),
        type: 'hlsjs',
      }
    }
  } catch (err) {
    console.warn('[createHlsPlayer] Failed to load hls.js:', err)
  }

  // ネイティブ HLS にフォールバック
  if (canPlayHlsNatively()) {
    return {
      player: new NativeHlsPlayer(options),
      type: 'native',
    }
  }

  return {
    player: null,
    type: 'unsupported',
    error: new Error('HLS playback is not supported in this browser'),
  }
}
