import { memo } from 'react'
import { Text } from '@react-three/drei'
import { Interactable } from '../Interactable'
import type { ReloadButtonProps } from './types'

export const ReloadButton = memo(({ id, position, size, onReload }: ReloadButtonProps) => {
  return (
    <group position={position}>
      <Interactable id={id} onInteract={onReload} interactionText="再読み込み">
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
        ↻
      </Text>
    </group>
  )
})

ReloadButton.displayName = 'ReloadButton'
