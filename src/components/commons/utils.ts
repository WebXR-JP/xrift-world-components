/**
 * セグメント情報を生成
 */
export interface Segment {
  index: number
  xPos: number
  value: number
  label: string
}

export interface CalculateSegmentsOptions {
  segments: number
  width: number
  maxValue: number
  formatLabel: (value: number, index: number) => string
}

export const calculateSegments = ({
  segments,
  width,
  maxValue,
  formatLabel,
}: CalculateSegmentsOptions): Segment[] => {
  const segmentWidth = width / segments
  return Array.from({ length: segments }).map((_, i) => {
    const value = (i / (segments - 1)) * maxValue
    const xPos = -width / 2 + segmentWidth * (i + 0.5)
    return {
      index: i,
      xPos,
      value,
      label: formatLabel(value, i),
    }
  })
}

/**
 * 進捗バーの幅とオフセットを計算
 */
export const calculateProgressBar = (
  progress: number,
  totalWidth: number,
): { width: number; offset: number } => {
  const clampedProgress = Math.min(1, Math.max(0, progress))
  const width = totalWidth * clampedProgress
  const offset = -totalWidth / 2 + width / 2
  return { width, offset }
}
