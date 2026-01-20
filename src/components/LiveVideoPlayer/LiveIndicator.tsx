import { memo } from 'react'
import { Text } from '@react-three/drei'
import type { LiveIndicatorProps } from './types'

export const LiveIndicator = memo(({ position, size }: LiveIndicatorProps) => {
  const dotSize = size * 0.15
  const fontSize = size * 0.4

  return (
    <group position={position}>
      {/* 赤い丸 */}
      <mesh position={[-size * 0.5, 0, 0]}>
        <circleGeometry args={[dotSize, 16]} />
        <meshBasicMaterial color="#ff0000" />
      </mesh>

      {/* LIVEテキスト */}
      <Text
        position={[size * 0.15, 0, 0]}
        fontSize={fontSize}
        color="#ffffff"
        anchorX="center"
        anchorY="middle"
        fontWeight="bold"
      >
        LIVE
      </Text>
    </group>
  )
})

LiveIndicator.displayName = 'LiveIndicator'
