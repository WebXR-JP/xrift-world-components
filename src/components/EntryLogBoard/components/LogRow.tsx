/**
 * LogRow コンポーネント
 *
 * 入退室ログの1行分を3D空間にレンダリングする。
 * [アバター] [時刻] [名前] [ラベル]
 */
import { Text } from '@react-three/drei'

import { type Colors, type Labels, type LogEntry } from '../types'
import { AvatarIcon } from './AvatarIcon'

interface Props {
  entry: LogEntry
  labels: Labels
  colors: Colors
  y: number
  scale: number
}

const ROW_HEIGHT = 0.25
const AVATAR_SIZE = 0.18
const FONT_SIZE = 0.1

export const LogRow = ({ entry, labels, colors, y, scale }: Props) => {
  const rowHeight = ROW_HEIGHT * scale
  const avatarSize = AVATAR_SIZE * scale
  const fontSize = FONT_SIZE * scale
  const labelColor = entry.type === 'join' ? colors.join : colors.leave
  const labelText = entry.type === 'join' ? labels.join : labels.leave

  return (
    <group position={[0, y, 0.01]}>
      {/* アバターアイコン */}
      <AvatarIcon
        avatarUrl={entry.avatarUrl}
        size={avatarSize}
        position={[-0.9 * scale, 0, 0]}
      />

      {/* タイムスタンプ */}
      <Text
        position={[-0.7 * scale, 0, 0]}
        fontSize={fontSize * 0.8}
        color={0x888888}
        anchorX="left"
        anchorY="middle"
      >
        {entry.timestamp}
      </Text>

      {/* 表示名 */}
      <Text
        position={[-0.3 * scale, 0, 0]}
        fontSize={fontSize}
        color={colors.text}
        anchorX="left"
        anchorY="middle"
        maxWidth={0.8 * scale}
      >
        {entry.displayName}
      </Text>

      {/* 入退室ラベル */}
      <Text
        position={[0.55 * scale, 0, 0]}
        fontSize={fontSize * 0.9}
        color={labelColor}
        anchorX="left"
        anchorY="middle"
        fontWeight="bold"
      >
        {labelText}
      </Text>
    </group>
  )
}

export { ROW_HEIGHT }
