import { memo } from 'react'
import { Text } from '@react-three/drei'
import { Interactable } from '../Interactable'
import type { StopButtonProps } from './types'

export const StopButton = memo(
  ({ id, position, size, onInteract }: StopButtonProps) => {
    return (
      <group position={position}>
        <Interactable
          id={id}
          onInteract={onInteract}
          interactionText="停止"
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
          ■
        </Text>
      </group>
    )
  }
)

StopButton.displayName = 'StopButton'
