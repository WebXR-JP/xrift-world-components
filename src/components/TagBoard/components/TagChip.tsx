/**
 * TagChip コンポーネント
 *
 * タグを表示するシンプルなチップUI。
 * 色付きのプレーン + 表裏両面にラベルテキストを表示します。
 */
import { Text } from '@react-three/drei'
import { DoubleSide } from 'three'

import { type Tag } from '../types'

export interface TagChipProps {
  tag: Tag
  width: number
  height: number
  fontSize: number
  position?: [number, number, number]
  /** 裏面にもテキストを表示するか */
  doubleSided?: boolean
}

export const TagChip = ({
  tag,
  width,
  height,
  fontSize,
  position,
  doubleSided = false,
}: TagChipProps) => {
  return (
    <group position={position}>
      {/* タグボックス */}
      <mesh>
        <planeGeometry args={[width, height]} />
        <meshBasicMaterial color={tag.color} side={DoubleSide} />
      </mesh>
      {/* タグラベルテキスト（表面） */}
      <Text
        position={[0, 0, 0.01]}
        fontSize={fontSize}
        color={0xffffff}
        anchorX="center"
        anchorY="middle"
        outlineWidth={fontSize * 0.04}
        outlineColor={0x000000}
      >
        {tag.label}
      </Text>
      {/* タグラベルテキスト（裏面） */}
      {doubleSided && (
        <Text
          position={[0, 0, -0.02]}
          fontSize={fontSize}
          anchorX="center"
          anchorY="middle"
          color={0xffffff}
          outlineWidth={fontSize * 0.04}
          outlineColor={0x000000}
        >
          {tag.label}
        </Text>
      )}
    </group>
  )
}
