import { useMemo } from 'react'
import { RigidBody } from '@react-three/rapier'
import { Text, useTexture } from '@react-three/drei'
import { useXRift } from '../../contexts/XRiftContext'

import { DEFAULT_COLORS, DEFAULT_LABELS, DEFAULT_PLACEHOLDER_ENTRIES } from './constants'
import type { LogEntry, Props } from './types'
import { defaultFormatTimestamp } from './utils'
import { useChime, useEntryLog } from './hooks'

export type {
  Colors as EntryLogBoardColors,
  Labels as EntryLogBoardLabels,
  Props as EntryLogBoardProps,
  KnownUser,
  LogEntry,
} from './types'

const AvatarIcon: React.FC<{
  url: string
  size: number
  position: [number, number, number]
}> = ({ url, size, position }) => {
  const texture = useTexture(url)
  return (
    <mesh position={position}>
      <circleGeometry args={[size / 2, 32]} />
      <meshStandardMaterial map={texture} />
    </mesh>
  )
}

export const EntryLogBoard: React.FC<Props> = ({
  position = [0, 1.5, 0],
  rotation = [0, 0, 0],
  scale = 1,
  maxEntries = 20,
  stateNamespace = 'entry-log',
  leaveGraceMs = 5_000,
  leaderHydrationGraceMs = 3_000,
  chimeFileName = 'chime.mp3',
  labels,
  colors,
  placeholderEntries,
  displayNameFallback = 'ユーザー',
  formatTimestamp = defaultFormatTimestamp,
}) => {
  const resolvedLabels = useMemo(() => ({ ...DEFAULT_LABELS, ...labels }), [labels])
  const resolvedColors = useMemo(() => ({ ...DEFAULT_COLORS, ...colors }), [colors])
  const placeholderLogEntries = useMemo(
    () => placeholderEntries ?? DEFAULT_PLACEHOLDER_ENTRIES,
    [placeholderEntries],
  )

  const { baseUrl } = useXRift()
  const chimeUrl = useMemo(() => {
    const normalized = chimeFileName.startsWith('/') ? chimeFileName.slice(1) : chimeFileName
    return `${baseUrl}${normalized}`
  }, [baseUrl, chimeFileName])

  const { logs, localUser } = useEntryLog({
    stateNamespace,
    maxEntries,
    leaveGraceMs,
    leaderHydrationGraceMs,
    displayNameFallback,
    formatTimestamp,
  })

  useChime({ logs, localUserId: localUser?.id, chimeUrl })

  // --- レイアウト計算 ---

  const boardWidth = 2 * scale
  const boardHeight = 3 * scale
  const headerHeight = 0.32 * scale
  const padding = 0.09 * scale
  const lineHeight = 0.1245 * scale
  const textZ = 0.006 * scale
  const avatarSize = 0.09 * scale

  const rows = useMemo(() => {
    const source = logs.length ? logs : placeholderLogEntries
    const visible = Math.max(4, Math.floor((boardHeight - headerHeight - padding * 2) / lineHeight))
    return [...source].slice(-visible).reverse()
  }, [logs, placeholderLogEntries, boardHeight, headerHeight, padding, lineHeight])

  const timestampX = (-boardWidth / 2) + padding
  const typeX = timestampX + 0.75 * scale
  const avatarX = typeX + 0.20 * scale
  const nameX = avatarX + avatarSize + 0.02 * scale
  const startY = (boardHeight / 2) - headerHeight - padding - (lineHeight / 2)

  return (
    <RigidBody
      type="fixed"
      colliders="cuboid"
      position={position}
      rotation={rotation}
    >
      <mesh>
        <boxGeometry args={[boardWidth, boardHeight, 0.01 * scale]} />
        <meshStandardMaterial color={resolvedColors.background} />
      </mesh>

      <mesh position={[0, (boardHeight / 2) - (headerHeight / 2), 0.006 * scale]}>
        <planeGeometry args={[boardWidth, headerHeight]} />
        <meshStandardMaterial color={resolvedColors.header} />
      </mesh>

      <Text
        position={[0, (boardHeight / 2) - (headerHeight / 2), textZ + 0.001 * scale]}
        color={resolvedColors.title}
        fontSize={0.15 * scale}
        anchorX="center"
        anchorY="middle"
        maxWidth={boardWidth - padding * 2}
      >
        {resolvedLabels.title}
      </Text>

      {rows.map((entry, index) => (
        <LogRow
          key={entry.id}
          entry={entry}
          y={startY - (index * lineHeight)}
          scale={scale}
          textZ={textZ}
          timestampX={timestampX}
          typeX={typeX}
          avatarX={avatarX}
          avatarSize={avatarSize}
          nameX={nameX}
          boardWidth={boardWidth}
          padding={padding}
          resolvedLabels={resolvedLabels}
          resolvedColors={resolvedColors}
        />
      ))}
    </RigidBody>
  )
}

// --- LogRow ---

const LogRow: React.FC<{
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
  resolvedLabels: Required<{ title: string; join: string; leave: string }>
  resolvedColors: Required<{
    background: string; header: string; title: string
    timestamp: string; text: string; join: string; leave: string
  }>
}> = ({
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
