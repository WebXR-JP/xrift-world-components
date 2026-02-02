import { memo, useCallback } from 'react'
import { Text } from '@react-three/drei'
import { IconButton } from '../../commons/IconButton'
import { VolumeControl } from '../../commons/VolumeControl'
import { useTextInputContext } from '../../../contexts/TextInputContext'
import type { LiveControlPanelProps } from '../types'

const PANEL_HEIGHT = 0.15
const BUTTON_SIZE = PANEL_HEIGHT * 0.6

interface LiveIndicatorProps {
  position: [number, number, number]
  size: number
  playing: boolean
}

const LiveIndicator = memo(({ position, size, playing }: LiveIndicatorProps) => {
  const dotSize = size * 0.15
  const fontSize = size * 0.4
  const dotColor = playing ? '#ff0000' : '#666666'

  return (
    <group position={position}>
      <mesh position={[-size * 0.5, 0, 0]}>
        <circleGeometry args={[dotSize, 16]} />
        <meshBasicMaterial key={playing ? 'playing' : 'paused'} color={dotColor} />
      </mesh>
      <Text
        position={[size * 0.15, 0, 0]}
        fontSize={fontSize}
        color="#ffffff"
        anchorX="center"
        anchorY="middle"
        fontWeight="bold"
      >
        LIVE
      </Text>
    </group>
  )
})

LiveIndicator.displayName = 'LiveIndicator'

export const ControlPanel = memo(
  ({
    id,
    width,
    screenHeight,
    playing,
    volume,
    isBuffering,
    url,
    onPlayPause,
    onStop,
    onVolumeChange,
    onUrlChange,
  }: LiveControlPanelProps) => {
    const panelY = -screenHeight / 2 - PANEL_HEIGHT / 2

    const { requestTextInput } = useTextInputContext()

    const handleUrlInput = useCallback(() => {
      requestTextInput({
        id: `${id}-url-input`,
        placeholder: 'ライブストリームのURLを入力',
        initialValue: url,
        onSubmit: (value) => {
          if (value && value.trim() !== '') {
            onUrlChange(value.trim())
          }
        },
      })
    }, [id, url, onUrlChange, requestTextInput])

    return (
      <group position={[0, panelY, 0]}>
        {/* パネル背景 */}
        <mesh position={[0, 0, 0]}>
          <planeGeometry args={[width, PANEL_HEIGHT]} />
          <meshBasicMaterial color="#1a1a2a" transparent opacity={0.9} />
        </mesh>

        {/* URL入力ボタン（左端） */}
        <IconButton
          id={`${id}-url-input`}
          position={[-width * 0.45, 0, 0.01]}
          size={BUTTON_SIZE}
          icon="🔗"
          interactionText="URL変更"
          onInteract={handleUrlInput}
        />

        {/* 再生/一時停止ボタン */}
        <IconButton
          id={`${id}-play-pause`}
          position={[-width * 0.38, 0, 0.01]}
          size={BUTTON_SIZE}
          icon={playing ? "||" : "▶"}
          interactionText={playing ? "一時停止" : "再生"}
          onInteract={onPlayPause}
        />

        {/* 停止ボタン */}
        <IconButton
          id={`${id}-stop`}
          position={[-width * 0.31, 0, 0.01]}
          size={BUTTON_SIZE}
          icon="■"
          interactionText="停止"
          onInteract={onStop}
        />

        {/* LIVEインジケータ（中央） */}
        <LiveIndicator position={[0, 0, 0.01]} size={BUTTON_SIZE} playing={playing} />

        {/* バッファリング中のテキスト */}
        {isBuffering && (
          <Text
            position={[0, -0.04, 0.01]}
            fontSize={0.02}
            color="#aaaaaa"
            anchorX="center"
            anchorY="middle"
          >
            読み込み中...
          </Text>
        )}

        {/* 音量コントロール（右） */}
        <VolumeControl
          id={`${id}-volume`}
          position={[width * 0.4, 0, 0.01]}
          size={BUTTON_SIZE}
          volume={volume}
          onVolumeChange={onVolumeChange}
        />
      </group>
    )
  }
)

ControlPanel.displayName = 'ControlPanel'
