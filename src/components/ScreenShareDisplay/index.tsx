import { Text } from '@react-three/drei'
import { memo, useCallback, useMemo } from 'react'
import * as THREE from 'three'
import { useScreenShareContext } from '../../contexts/ScreenShareContext'
import { Interactable } from '../Interactable'
import { useVideoTexture } from './hooks'
import type { Props } from './types'

export type { Props as ScreenShareDisplayProps } from './types'

// デフォルト値
const DEFAULT_WIDTH = 4
const DEFAULT_POSITION: [number, number, number] = [0, 0, 0]
const DEFAULT_ROTATION: [number, number, number] = [0, 0, 0]

/**
 * 映像を3D空間内にスクリーンとして表示するコンポーネント
 * 画面共有やカメラ映像などの表示に使用可能
 */
export const ScreenShareDisplay = memo(({
  id,
  position = DEFAULT_POSITION,
  rotation = DEFAULT_ROTATION,
  width = DEFAULT_WIDTH,
}: Props) => {
  const { videoElement, isSharing, startScreenShare, stopScreenShare, isRoomConnected } = useScreenShareContext()
  const interactionText = isSharing ? '画面共有を停止' : '画面共有を開始'
  const screenSize = useMemo<[number, number]>(() => [width, width * (9 / 16)], [width])
  const { texture, hasVideo, materialRef, videoSize } = useVideoTexture(videoElement, screenSize)

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
        {/* 背景（映像がない時のみ表示） */}
        <mesh visible={!hasVideo}>
          <planeGeometry args={[screenSize[0], screenSize[1]]} />
          <meshBasicMaterial
            side={THREE.FrontSide}
            toneMapped={false}
            color="#1a1a2a"
          />
        </mesh>
        {/* 映像 */}
        <mesh visible={hasVideo}>
          <planeGeometry args={[videoSize[0], videoSize[1]]} />
          <meshBasicMaterial
            ref={materialRef}
            map={texture}
            side={THREE.FrontSide}
            toneMapped={false}
          />
        </mesh>
      </Interactable>

      {/* ガイドテキスト */}
      {!hasVideo && (
        <Text
          position={[0, 0, 0.01]}
          fontSize={width * 0.05}
          color="#666666"
          anchorX="center"
          anchorY="middle"
          textAlign="center"
        >
          {isRoomConnected ? 'クリックして画面共有' : '他のユーザーがいると\n画面共有できます'}
        </Text>
      )}
    </group>
  )
})
