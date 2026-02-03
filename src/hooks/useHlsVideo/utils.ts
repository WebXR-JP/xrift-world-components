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

import { VideoTexture, SRGBColorSpace, LinearFilter } from 'three'

export interface VideoTextureResult {
  video: HTMLVideoElement
  texture: VideoTexture
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
