import { memo } from 'react'
import { Text } from '@react-three/drei'

interface Props {
  position: [number, number, number]
  size: number
  playing: boolean
}

export const LiveIndicator = memo(({ position, size, playing }: Props) => {
  const dotSize = size * 0.15
  const fontSize = size * 0.4
  const dotColor = playing ? '#ff0000' : '#666666'

  return (
    <group position={position}>
      <mesh position={[-size * 0.5, 0, 0]}>
        <circleGeometry args={[dotSize, 16]} />
        <meshBasicMaterial key={playing ? 'playing' : 'paused'} color={dotColor} />
      </mesh>
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
