import { useEffect, useMemo, useRef } from 'react'
import { Text } from '@react-three/drei'

import { DEFAULT_COLORS, DEFAULT_LABELS, DEFAULT_PLACEHOLDER_ENTRIES } from './constants'
import type { LogEntry, Props } from './types'
import { defaultFormatTimestamp } from './utils'
import { useEntryLog } from './hooks/useEntryLog'
import { LogRow } from './components/LogRow'

export type {
  Colors as EntryLogBoardColors,
  Labels as EntryLogBoardLabels,
  Props as EntryLogBoardProps,
  KnownUser,
  LogEntry,
} from './types'

export const EntryLogBoard: React.FC<Props> = ({
  position = [0, 1.5, 0],
  rotation = [0, 0, 0],
  scale = 1,
  maxEntries = 20,
  stateNamespace = 'entry-log',
  leaveGraceMs = 5_000,
  leaderHydrationGraceMs = 3_000,
  labels,
  colors,
  placeholderEntries,
  displayNameFallback = 'ユーザー',
  formatTimestamp = defaultFormatTimestamp,
  onJoin,
  onLeave,
}) => {
  const resolvedLabels = useMemo(() => ({ ...DEFAULT_LABELS, ...labels }), [labels])
  const resolvedColors = useMemo(() => ({ ...DEFAULT_COLORS, ...colors }), [colors])
  const placeholderLogEntries = useMemo(
    () => placeholderEntries ?? DEFAULT_PLACEHOLDER_ENTRIES,
    [placeholderEntries],
  )

  const { logs } = useEntryLog({
    stateNamespace,
    maxEntries,
    leaveGraceMs,
    leaderHydrationGraceMs,
    displayNameFallback,
    formatTimestamp,
  })

  // --- イベントコールバック ---

  const onJoinRef = useRef(onJoin)
  const onLeaveRef = useRef(onLeave)
  const prevLogsLenRef = useRef<number | null>(null)

  useEffect(() => { onJoinRef.current = onJoin }, [onJoin])
  useEffect(() => { onLeaveRef.current = onLeave }, [onLeave])

  useEffect(() => {
    const prevLen = prevLogsLenRef.current
    prevLogsLenRef.current = logs.length

    // 初回レンダーではコールバックを発火しない
    if (prevLen === null) return
    if (logs.length <= prevLen) return

    const delta = logs.slice(prevLen)
    for (const entry of delta) {
      if (entry.type === 'join') onJoinRef.current?.(entry)
      if (entry.type === 'leave') onLeaveRef.current?.(entry)
    }
  }, [logs])

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
    <group position={position} rotation={rotation}>
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
    </group>
  )
}
