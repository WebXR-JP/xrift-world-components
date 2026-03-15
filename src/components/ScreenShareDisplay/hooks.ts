import { useEffect, useState } from 'react'
import * as THREE from 'three'
import { calculateContainSize } from './utils'

/**
 * VideoElement から VideoTexture を作成し管理するフック
 * @param videoElement 映像のvideo要素
 * @param screenSize スクリーンのサイズ [幅, 高さ]
 */
export const useVideoTexture = (
  videoElement: HTMLVideoElement | null,
  screenSize: [number, number],
) => {
  const [texture, setTexture] = useState<THREE.VideoTexture | null>(null)
  const [videoSize, setVideoSize] = useState<[number, number]>(screenSize)
  const hasVideo = texture !== null

  // VideoTextureの作成と更新
  useEffect(() => {
    if (!videoElement) {
      setTexture(null)
      setVideoSize(screenSize)
      return
    }

    const videoTexture = new THREE.VideoTexture(videoElement)
    videoTexture.minFilter = THREE.LinearFilter
    videoTexture.magFilter = THREE.LinearFilter
    videoTexture.colorSpace = THREE.SRGBColorSpace
    setTexture(videoTexture)

    // 映像のメタデータがロードされたらサイズを計算
    const handleLoadedMetadata = () => {
      const size = calculateContainSize(
        videoElement.videoWidth,
        videoElement.videoHeight,
        screenSize[0],
        screenSize[1],
      )
      setVideoSize(size)
    }

    if (videoElement.videoWidth > 0) {
      handleLoadedMetadata()
    } else {
      videoElement.addEventListener('loadedmetadata', handleLoadedMetadata)
    }

    return () => {
      videoElement.removeEventListener('loadedmetadata', handleLoadedMetadata)
      videoTexture.dispose()
    }
  }, [videoElement, screenSize])

  // video要素が一時停止していたら再生を試みる
  useEffect(() => {
    if (!videoElement) return

    const checkAndPlay = () => {
      if (videoElement.paused) {
        videoElement.play().catch(() => {
          // 再生失敗は無視
        })
      }
    }

    checkAndPlay()
    const interval = setInterval(checkAndPlay, 1000)

    return () => clearInterval(interval)
  }, [videoElement])

  return { texture, hasVideo, videoSize }
}
