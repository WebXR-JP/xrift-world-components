import { Text } from '@react-three/drei'

import type { Colors, Labels, LogEntry } from '../types'
import { AvatarIcon } from './AvatarIcon'

interface Props {
  entry: LogEntry
  y: number
  scale: number
  textZ: number
  timestampX: number
  typeX: number
  avatarX: number
  avatarSize: number
  nameX: number
  boardWidth: number
  padding: number
  resolvedLabels: Required<Labels>
  resolvedColors: Required<Colors>
}

export const LogRow: React.FC<Props> = ({
  entry, y, scale, textZ,
  timestampX, typeX, avatarX, avatarSize, nameX,
  boardWidth, padding, resolvedLabels, resolvedColors,
}) => {
  const typeLabel = entry.type === 'join' ? resolvedLabels.join : resolvedLabels.leave
  const typeColor = entry.type === 'join' ? resolvedColors.join : resolvedColors.leave

  return (
    <group position={[0, 0, textZ]}>
      <Text
        position={[timestampX, y, 0]}
        color={resolvedColors.timestamp}
        fontSize={0.0711 * scale}
        anchorX="left"
        anchorY="middle"
      >
        {entry.timestamp}
      </Text>

      <Text
        position={[typeX, y, 0]}
        color={typeColor}
        fontSize={0.0711 * scale}
        anchorX="left"
        anchorY="middle"
      >
        {typeLabel}
      </Text>

      {entry.avatarUrl && (
        <AvatarIcon url={entry.avatarUrl} size={avatarSize} position={[avatarX, y, textZ]} />
      )}

      <Text
        position={[nameX, y, 0]}
        color={resolvedColors.text}
        fontSize={0.0711 * scale}
        anchorX="left"
        anchorY="middle"
        maxWidth={boardWidth - (nameX - (-boardWidth / 2)) - padding}
      >
        {entry.displayName}
      </Text>
    </group>
  )
}
