import { memo } from 'react'
import { Text } from '@react-three/drei'
import { Interactable } from '../../Interactable'
import type { PlayPauseButtonProps } from '../types'

export const PlayPauseButton = memo(
  ({ id, position, size, playing, onInteract }: PlayPauseButtonProps) => {
    return (
      <group position={position}>
        <Interactable
          id={id}
          onInteract={onInteract}
          interactionText={playing ? '一時停止' : '再生'}
        >
          <mesh>
            <circleGeometry args={[size / 2, 32]} />
            <meshBasicMaterial color="#444444" />
          </mesh>
        </Interactable>
        <Text
          position={[0, 0, 0.01]}
          fontSize={size * 0.4}
          color="#ffffff"
          anchorX="center"
          anchorY="middle"
        >
          {playing ? '||' : '▶'}
        </Text>
      </group>
    )
  }
)

PlayPauseButton.displayName = 'PlayPauseButton'
