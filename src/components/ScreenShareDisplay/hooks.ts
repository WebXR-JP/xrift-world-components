import { useFrame } from '@react-three/fiber'
import { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'

/**
 * テクスチャのrepeatとoffsetを設定してobject-fit: contain効果を実現
 */
const applyContainFit = (
  texture: THREE.VideoTexture,
  videoElement: HTMLVideoElement,
  screenAspect: number,
) => {
  const videoAspect = videoElement.videoWidth / videoElement.videoHeight

  if (videoAspect > screenAspect) {
    // 映像が横長 → 上下に黒帯
    const scale = screenAspect / videoAspect
    texture.repeat.set(1, scale)
    texture.offset.set(0, (1 - scale) / 2)
  } else {
    // 映像が縦長 → 左右に黒帯
    const scale = videoAspect / screenAspect
    texture.repeat.set(scale, 1)
    texture.offset.set((1 - scale) / 2, 0)
  }
}

/**
 * VideoElement から VideoTexture を作成し管理するフック
 * @param videoElement 映像のvideo要素
 * @param screenAspect スクリーンのアスペクト比（幅/高さ）
 */
export const useVideoTexture = (
  videoElement: HTMLVideoElement | null,
  screenAspect: number,
) => {
  const materialRef = useRef<THREE.MeshBasicMaterial>(null)
  const [texture, setTexture] = useState<THREE.VideoTexture | null>(null)
  const hasVideo = texture !== null

  // VideoTextureの作成と更新
  useEffect(() => {
    if (!videoElement) {
      setTexture(null)
      return
    }

    const videoTexture = new THREE.VideoTexture(videoElement)
    videoTexture.minFilter = THREE.LinearFilter
    videoTexture.magFilter = THREE.LinearFilter
    videoTexture.colorSpace = THREE.SRGBColorSpace
    videoTexture.needsUpdate = true
    setTexture(videoTexture)

    // 映像のメタデータがロードされたらアスペクト比を調整
    const handleLoadedMetadata = () => {
      applyContainFit(videoTexture, videoElement, screenAspect)
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
  }, [videoElement, screenAspect])

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

  return { texture, hasVideo, materialRef }
}
