import { useFrame } from '@react-three/fiber'
import { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'

/**
 * object-fit: contain 用の映像サイズを計算
 */
const calculateContainSize = (
  videoWidth: number,
  videoHeight: number,
  screenWidth: number,
  screenHeight: number,
): [number, number] => {
  const videoAspect = videoWidth / videoHeight
  const screenAspect = screenWidth / screenHeight

  if (videoAspect > screenAspect) {
    // 映像が横長 → 幅に合わせて高さを調整
    return [screenWidth, screenWidth / videoAspect]
  } else {
    // 映像が縦長 → 高さに合わせて幅を調整
    return [screenHeight * videoAspect, screenHeight]
  }
}

/**
 * VideoElement から VideoTexture を作成し管理するフック
 * @param videoElement 映像のvideo要素
 * @param screenSize スクリーンのサイズ [幅, 高さ]
 */
export const useVideoTexture = (
  videoElement: HTMLVideoElement | null,
  screenSize: [number, number],
) => {
  const materialRef = useRef<THREE.MeshBasicMaterial>(null)
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
    videoTexture.needsUpdate = true
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

  // マテリアルにテクスチャをセット
  useEffect(() => {
    if (!materialRef.current || !texture) return
    materialRef.current.map = texture
    materialRef.current.needsUpdate = true
  }, [texture])

  // テクスチャ更新（毎フレーム）
  useFrame(() => {
    if (!texture) return
    texture.needsUpdate = true
  })

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

  return { texture, hasVideo, materialRef, videoSize }
}
