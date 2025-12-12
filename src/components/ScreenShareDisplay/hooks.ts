import { useFrame } from '@react-three/fiber'
import { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'

/**
 * VideoElement から VideoTexture を作成し管理するフック
 */
export const useVideoTexture = (videoElement: HTMLVideoElement | null) => {
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

    return () => {
      videoTexture.dispose()
    }
  }, [videoElement])

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
