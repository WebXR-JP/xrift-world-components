import { Text } from '@react-three/drei'
import { memo, useCallback } from 'react'
import * as THREE from 'three'
import { useScreenShareContext } from '../../contexts/ScreenShareContext'
import { Interactable } from '../Interactable'
import { useVideoTexture } from './hooks'
import type { Props } from './types'

export type { Props as ScreenShareDisplayProps } from './types'

// デフォルト値
const DEFAULT_SCALE: [number, number] = [4, 4 * (9 / 16)]
const DEFAULT_POSITION: [number, number, number] = [0, 2, -5]
const DEFAULT_ROTATION: [number, number, number] = [0, 0, 0]

/**
 * 映像を3D空間内にスクリーンとして表示するコンポーネント
 * 画面共有やカメラ映像などの表示に使用可能
 */
export const ScreenShareDisplay = memo(({
  id,
  position = DEFAULT_POSITION,
  rotation = DEFAULT_ROTATION,
  scale = DEFAULT_SCALE,
}: Props) => {
  const { videoElement, isSharing, startScreenShare, stopScreenShare } = useScreenShareContext()
  const interactionText = isSharing ? '画面共有を停止' : '画面共有を開始'
  const { texture, hasVideo, materialRef, videoSize } = useVideoTexture(videoElement, scale)

  const handleInteract = useCallback(() => {
    if (isSharing) {
      stopScreenShare()
    } else {
      startScreenShare()
    }
  }, [isSharing, startScreenShare, stopScreenShare])

  return (
    <group position={position} rotation={rotation}>
      <Interactable
        id={id}
        onInteract={handleInteract}
        interactionText={interactionText}
      >
        {/* 背景（黒帯部分） */}
        <mesh>
          <planeGeometry args={[scale[0], scale[1]]} />
          <meshBasicMaterial
            side={THREE.FrontSide}
            toneMapped={false}
            color="#1a1a2a"
          />
        </mesh>
        {/* 映像 */}
        {hasVideo && (
          <mesh position={[0, 0, 0.001]}>
            <planeGeometry args={[videoSize[0], videoSize[1]]} />
            <meshBasicMaterial
              ref={materialRef}
              map={texture}
              side={THREE.FrontSide}
              toneMapped={false}
            />
          </mesh>
        )}
      </Interactable>

      {/* ガイドテキスト */}
      {!hasVideo && (
        <Text
          position={[0, 0, 0.01]}
          fontSize={scale[0] * 0.05}
          color="#666666"
          anchorX="center"
          anchorY="middle"
        >
          クリックして画面共有
        </Text>
      )}
    </group>
  )
})
