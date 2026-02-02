import { memo, useMemo } from 'react'
import { Text } from '@react-three/drei'
import { Interactable } from '../../Interactable'
import {
  calculateSegments,
  calculateProgressBar,
  getVolumeIcon,
} from '../../VideoPlayer/utils'
import type { VolumeControlProps } from '../types'

const SEGMENTS = 11

export const VolumeControl = memo(
  ({ id, position, size, volume, onVolumeChange }: VolumeControlProps) => {
    const barWidth = size * 3
    const barHeight = size * 0.2
    const segmentWidth = barWidth / SEGMENTS
    const { width: volumeWidth, offset: volumeOffset } = calculateProgressBar(
      volume,
      barWidth
    )

    const segments = useMemo(() => {
      return calculateSegments({
        segments: SEGMENTS,
        width: barWidth,
        maxValue: 1,
        formatLabel: (value) => {
          const percent = Math.round(value * 100)
          return percent === 0 ? 'ミュート' : `音量: ${percent}%`
        },
      })
    }, [barWidth])

    return (
      <group position={position}>
        {/* スピーカーアイコン */}
        <Text
          position={[-barWidth / 2 - size * 0.4, 0, 0.01]}
          fontSize={size * 0.4}
          color="#ffffff"
          anchorX="center"
          anchorY="middle"
        >
          {getVolumeIcon(volume)}
        </Text>

        {/* 背景バー */}
        <mesh position={[0, 0, 0]}>
          <planeGeometry args={[barWidth, barHeight]} />
          <meshBasicMaterial color="#333333" />
        </mesh>

        {/* 音量バー */}
        {volumeWidth > 0 && (
          <mesh position={[volumeOffset, 0, 0.001]}>
            <planeGeometry args={[volumeWidth, barHeight]} />
            <meshBasicMaterial color="#4aff4a" />
          </mesh>
        )}

        {/* セグメント */}
        {segments.map((segment) => (
          <Interactable
            key={segment.index}
            id={`${id}-seg-${segment.index}`}
            onInteract={() => onVolumeChange(segment.value)}
            interactionText={segment.label}
          >
            <mesh position={[segment.xPos, 0, 0.002]}>
              <planeGeometry args={[segmentWidth * 0.98, barHeight * 2]} />
              <meshBasicMaterial transparent opacity={0} depthWrite={false} />
            </mesh>
          </Interactable>
        ))}
      </group>
    )
  }
)

VolumeControl.displayName = 'VolumeControl'
