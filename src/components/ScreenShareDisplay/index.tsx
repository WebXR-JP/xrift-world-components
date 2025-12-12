import { Text } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import { memo, useCallback, useEffect, useRef, useState } from 'react'
import * as THREE from 'three'
import { Interactable } from '../Interactable'
import type { Props } from './types'

export type { Props as ScreenShareDisplayProps } from './types'

// デフォルト値
const DEFAULT_SCALE: [number, number] = [4, 4 * (9 / 16)]
const DEFAULT_POSITION: [number, number, number] = [0, 2, -5]
const DEFAULT_ROTATION: [number, number, number] = [0, 0, 0]
const DEFAULT_GUIDE_TEXT = 'クリックして画面共有'
const DEFAULT_START_TEXT = '画面共有を開始'
const DEFAULT_STOP_TEXT = '画面共有を停止'
const DEFAULT_BG_COLOR = '#1a1a2a'
const DEFAULT_TEXT_COLOR = '#666666'

/**
 * 映像を3D空間内にスクリーンとして表示するコンポーネント
 * 画面共有やカメラ映像などの表示に使用可能
 */
export const ScreenShareDisplay = memo(
  ({
    id,
    position = DEFAULT_POSITION,
    rotation = DEFAULT_ROTATION,
    scale = DEFAULT_SCALE,
    videoElement = null,
    isSharing = false,
    canStartShare = true,
    onStartShare,
    onStopShare,
    guideText = DEFAULT_GUIDE_TEXT,
    startShareText = DEFAULT_START_TEXT,
    stopShareText = DEFAULT_STOP_TEXT,
    backgroundColor = DEFAULT_BG_COLOR,
    guideTextColor = DEFAULT_TEXT_COLOR,
    interactable = true,
  }: Props) => {
    const materialRef = useRef<THREE.MeshBasicMaterial>(null)
    const [texture, setTexture] = useState<THREE.VideoTexture | null>(null)

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
      if (materialRef.current && texture) {
        materialRef.current.map = texture
        materialRef.current.needsUpdate = true
      }
    }, [texture])

    // テクスチャ更新（毎フレーム）
    useFrame(() => {
      if (texture) {
        texture.needsUpdate = true
      }
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

    // インタラクションハンドラ
    const handleInteract = useCallback(
      (_id: string) => {
        if (isSharing && onStopShare) {
          onStopShare()
        } else if (canStartShare && onStartShare) {
          onStartShare()
        }
      },
      [isSharing, canStartShare, onStartShare, onStopShare],
    )

    const interactionText = isSharing ? stopShareText : startShareText
    const hasVideo = texture !== null

    // スクリーンのメッシュ
    const screenMesh = (
      <mesh>
        <planeGeometry args={[scale[0], scale[1]]} />
        <meshBasicMaterial
          ref={materialRef}
          map={texture}
          side={THREE.FrontSide}
          toneMapped={false}
          color={hasVideo ? 'white' : backgroundColor}
        />
      </mesh>
    )

    return (
      <group position={position} rotation={rotation}>
        {interactable ? (
          <Interactable
            id={id}
            onInteract={handleInteract}
            interactionText={interactionText}
            enabled={canStartShare || isSharing}
          >
            {screenMesh}
          </Interactable>
        ) : (
          screenMesh
        )}

        {/* ガイドテキスト */}
        {!hasVideo && guideText && (
          <Text
            position={[0, 0, 0.01]}
            fontSize={scale[0] * 0.05}
            color={guideTextColor}
            anchorX="center"
            anchorY="middle"
          >
            {guideText}
          </Text>
        )}
      </group>
    )
  },
)
