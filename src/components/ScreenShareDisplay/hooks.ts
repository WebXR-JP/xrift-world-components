import { useFrame } from '@react-three/fiber'
import { useEffect, useMemo, useRef, useState } from 'react'
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
  const [texture, setTexture] = useState<THREE.VideoTexture | null>(null)
  const [videoResolution, setVideoResolution] = useState<
    [number, number] | null
  >(null)
  const lastUpdateRef = useRef(0)
  const hasVideo = texture !== null

  // VideoTextureの作成（videoElement のみに依存）
  useEffect(() => {
    if (!videoElement) {
      setTexture(null)
      setVideoResolution(null)
      return
    }

    const videoTexture = new THREE.VideoTexture(videoElement)
    videoTexture.minFilter = THREE.LinearFilter
    videoTexture.magFilter = THREE.LinearFilter
    videoTexture.colorSpace = THREE.SRGBColorSpace
    setTexture(videoTexture)

    // 映像のメタデータがロードされたら解像度を記録
    // WebRTC リモートトラックでは loadedmetadata 時に videoWidth/Height が 0 のケースがあるため、
    // ゼロチェックを行い、resize イベントでも解像度確定を監視する
    const handleLoadedMetadata = () => {
      if (videoElement.videoWidth > 0 && videoElement.videoHeight > 0) {
        setVideoResolution([videoElement.videoWidth, videoElement.videoHeight])
      }
    }

    if (videoElement.videoWidth > 0 && videoElement.videoHeight > 0) {
      handleLoadedMetadata()
    } else {
      videoElement.addEventListener('loadedmetadata', handleLoadedMetadata)
      videoElement.addEventListener('resize', handleLoadedMetadata)
    }

    return () => {
      videoElement.removeEventListener('loadedmetadata', handleLoadedMetadata)
      videoElement.removeEventListener('resize', handleLoadedMetadata)
      videoTexture.dispose()
    }
  }, [videoElement])

  // targetFps 指定時: VideoTexture の自動更新を間引く
  // VideoTexture は rVFC で毎ビデオフレーム source.needsUpdate = true を設定する。
  // useFrame は gl.render() の直前に実行されるため、間隔内の更新を抑制できる。
  useFrame(() => {
    if (!texture || !targetFps) return
    const now = performance.now()
    if (now - lastUpdateRef.current < 1000 / targetFps) {
      texture.source.needsUpdate = false
    } else {
      lastUpdateRef.current = now
    }
  })

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
