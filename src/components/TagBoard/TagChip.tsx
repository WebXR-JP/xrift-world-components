/**
 * TagChip コンポーネント
 *
 * タグを表示するシンプルなチップUI。
 * 色付きのプレーン + 表裏両面にラベルテキストを表示します。
 */
import { Text } from '@react-three/drei'
import { DoubleSide } from 'three'

import { type Tag } from './types'

export interface TagChipProps {
  tag: Tag
  width: number
  height: number
  fontSize: number
  opacity?: number
}

export const TagChip = ({
  tag,
  width,
  height,
  fontSize,
  opacity = 1,
}: TagChipProps) => {
  return (
    <group>
      {/* タグボックス */}
      <mesh position={[0, 0, -0.01]}>
        <planeGeometry args={[width, height]} />
        <meshBasicMaterial
          color={tag.color}
          opacity={opacity}
          transparent
          side={DoubleSide}
        />
      </mesh>
      {/* タグラベルテキスト（表面） */}
      <Text
        position={[0, 0, 0]}
        fontSize={fontSize}
        color={0xffffff}
        anchorX="center"
        anchorY="middle"
      >
        {tag.label}
      </Text>
      {/* タグラベルテキスト（裏面） */}
      <Text
        position={[0, 0, -0.03]}
        fontSize={fontSize}
        anchorX="center"
        anchorY="middle"
        color={0xffffff}
      >
        {tag.label}
      </Text>
    </group>
  )
}
