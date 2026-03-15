import { useEffect, useMemo, useState } from 'react'
import * as THREE from 'three'
import { calculateContainSize } from './utils'

/**
 * VideoElement から VideoTexture を作成し管理するフック
 * @param videoElement 映像のvideo要素
 * @param screenSize スクリーンのサイズ [幅, 高さ]
 * @param targetFps テクスチャ更新のフレームレート上限（省略時は制限なし）
 */
export const useVideoTexture = (
  videoElement: HTMLVideoElement | null,
  screenSize: [number, number],
  targetFps?: number,
) => {
  const [texture, setTexture] = useState<THREE.Texture | null>(null)
  const [videoResolution, setVideoResolution] = useState<
    [number, number] | null
  >(null)
  const hasVideo = texture !== null

  // テクスチャの作成（videoElement のみに依存）
  useEffect(() => {
    if (!videoElement) {
      setTexture(null)
      setVideoResolution(null)
      return
    }

    let tex: THREE.Texture
    let rVFCId = 0

    if (
      targetFps &&
      'requestVideoFrameCallback' in videoElement
    ) {
      // フレームレート制限付き: VideoTexture を使わず手動で更新を制御
      tex = new THREE.Texture(videoElement)
      tex.generateMipmaps = false

      const frameIntervalMs = 1000 / targetFps
      let lastUpdate = 0

      const update = () => {
        const now = performance.now()
        if (now - lastUpdate >= frameIntervalMs) {
          tex.needsUpdate = true
          lastUpdate = now
        }
        rVFCId = videoElement.requestVideoFrameCallback(update)
      }
      rVFCId = videoElement.requestVideoFrameCallback(update)
    } else {
      // デフォルト: VideoTexture の自動更新（毎ビデオフレーム更新）
      tex = new THREE.VideoTexture(videoElement)
    }

    tex.minFilter = THREE.LinearFilter
    tex.magFilter = THREE.LinearFilter
    tex.colorSpace = THREE.SRGBColorSpace
    setTexture(tex)

    // 映像のメタデータがロードされたら解像度を記録
    const handleLoadedMetadata = () => {
      setVideoResolution([videoElement.videoWidth, videoElement.videoHeight])
    }

    if (videoElement.videoWidth > 0) {
      handleLoadedMetadata()
    } else {
      videoElement.addEventListener('loadedmetadata', handleLoadedMetadata)
    }

    return () => {
      videoElement.removeEventListener('loadedmetadata', handleLoadedMetadata)
      if (rVFCId) {
        videoElement.cancelVideoFrameCallback(rVFCId)
      }
      tex.dispose()
    }
  }, [videoElement, targetFps])

  // 映像サイズの計算（screenSize や videoResolution の変更時のみ再計算）
  const videoSize = useMemo<[number, number]>(() => {
    if (!videoResolution) return screenSize
    return calculateContainSize(
      videoResolution[0],
      videoResolution[1],
      screenSize[0],
      screenSize[1],
    )
  }, [videoResolution, screenSize])

  // video要素が一時停止したら自動で再生を試みる
  useEffect(() => {
    if (!videoElement) return

    const handlePause = () => {
      videoElement.play().catch(() => {
        // 再生失敗は無視
      })
    }

    // 初回チェック
    if (videoElement.paused) {
      handlePause()
    }

    videoElement.addEventListener('pause', handlePause)

    return () => {
      videoElement.removeEventListener('pause', handlePause)
    }
  }, [videoElement])

  return { texture, hasVideo, videoSize }
}
