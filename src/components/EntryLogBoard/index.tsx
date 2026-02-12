/**
 * EntryLogBoard コンポーネント
 *
 * ワールドへの入退室ログを3D空間のボードに表示する。
 * useWorldEvent でプラットフォームの user-joined / user-left イベントを受信し、
 * useInstanceState でログを全クライアント間で同期する。
 */
import { useMemo } from 'react'
import { Text } from '@react-three/drei'

import { LogRow, ROW_HEIGHT } from './components/LogRow'
import {
  DEFAULT_COLORS,
  DEFAULT_DISPLAY_NAME_FALLBACK,
  DEFAULT_LABELS,
  DEFAULT_MAX_ENTRIES,
  DEFAULT_STATE_NAMESPACE,
} from './constants'
import { useEntryLog } from './hooks/useEntryLog'
import { type Colors, type Labels, type Props } from './types'
import { defaultFormatTimestamp } from './utils'

export type { Props as EntryLogBoardProps } from './types'

const TITLE = '入退室ログ'
const BOARD_PADDING = 0.15
const TITLE_HEIGHT = 0.35

export const EntryLogBoard = ({
  stateNamespace = DEFAULT_STATE_NAMESPACE,
  maxEntries = DEFAULT_MAX_ENTRIES,
  formatTimestamp = defaultFormatTimestamp,
  displayNameFallback = DEFAULT_DISPLAY_NAME_FALLBACK,
  labels: labelsOverride,
  colors: colorsOverride,
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  scale = 1,
  onJoin,
  onLeave,
}: Props) => {
  const labels: Labels = useMemo(
    () => ({ ...DEFAULT_LABELS, ...labelsOverride }),
    [labelsOverride],
  )
  const colors: Colors = useMemo(
    () => ({ ...DEFAULT_COLORS, ...colorsOverride }),
    [colorsOverride],
  )

  const logs = useEntryLog({
    stateNamespace,
    maxEntries,
    displayNameFallback,
    formatTimestamp,
    onJoin,
    onLeave,
  })

  // ボードサイズの計算
  const rowHeight = ROW_HEIGHT * scale
  const boardWidth = 2.2 * scale
  const contentHeight = Math.max(maxEntries * rowHeight, rowHeight)
  const boardHeight = contentHeight + TITLE_HEIGHT * scale + BOARD_PADDING * 2 * scale
  const titleY = boardHeight / 2 - TITLE_HEIGHT * scale / 2 - BOARD_PADDING * scale / 2

  // ログ行は上から新しい順に表示
  const reversedLogs = useMemo(() => [...logs].reverse(), [logs])

  return (
    <group position={position} rotation={rotation}>
      {/* 背景ボード */}
      <mesh position={[0, 0, -0.01]}>
        <planeGeometry args={[boardWidth, boardHeight]} />
        <meshBasicMaterial color={colors.background} opacity={0.9} transparent />
      </mesh>

      {/* タイトル */}
      <Text
        position={[0, titleY, 0]}
        fontSize={0.16 * scale}
        color={colors.text}
        anchorX="center"
        anchorY="middle"
        fontWeight="bold"
      >
        {TITLE}
      </Text>

      {/* ログ行 */}
      {reversedLogs.map((entry, index) => {
        const y =
          titleY -
          TITLE_HEIGHT * scale / 2 -
          BOARD_PADDING * scale / 2 -
          index * rowHeight -
          rowHeight / 2

        return (
          <LogRow
            key={entry.id}
            entry={entry}
            labels={labels}
            colors={colors}
            y={y}
            scale={scale}
          />
        )
      })}
    </group>
  )
}
