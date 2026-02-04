import { memo, useMemo } from 'react'
import { Interactable } from '../../Interactable'
import { calculateSegments, calculateProgressBar } from '../../commons/utils'
import { formatTime } from '../utils'

interface Props {
  id: string
  position: [number, number, number]
  width: number
  height: number
  progress: number
  duration: number
  onSeek: (time: number) => void
}

const SEGMENTS = 20

export const ProgressBar = memo(
  ({
    id,
    position,
    width,
    height,
    progress,
    duration,
    onSeek,
  }: Props) => {
    const { width: progressWidth, offset: progressOffset } = calculateProgressBar(progress, width)
    const segmentWidth = width / SEGMENTS

    const segments = useMemo(() => {
      return calculateSegments({
        segments: SEGMENTS,
        width,
        maxValue: duration,
        formatLabel: (value) => (value === 0 ? '最初に戻る' : formatTime(value)),
      })
    }, [duration, width])

    return (
      <group position={position}>
        {/* 背景バー */}
        <mesh position={[0, 0, 0]}>
          <planeGeometry args={[width, height]} />
          <meshBasicMaterial color="#333333" />
        </mesh>

        {/* 進捗バー */}
        {progressWidth > 0 && (
          <mesh position={[progressOffset, 0, 0.001]}>
            <planeGeometry args={[progressWidth, height]} />
            <meshBasicMaterial color="#4a9eff" />
          </mesh>
        )}

        {/* シーク用セグメント */}
        {segments.map((segment) => (
          <Interactable
            key={segment.index}
            id={`${id}-seg-${segment.index}`}
            onInteract={() => onSeek(segment.value)}
            interactionText={segment.label}
          >
            <mesh position={[segment.xPos, 0, 0.002]}>
              <planeGeometry args={[segmentWidth * 0.98, height * 2]} />
              <meshBasicMaterial transparent opacity={0} depthWrite={false} />
            </mesh>
          </Interactable>
        ))}
      </group>
    )
  }
)

ProgressBar.displayName = 'ProgressBar'
