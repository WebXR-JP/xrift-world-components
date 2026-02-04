import { memo, useCallback } from 'react'
import { Text } from '@react-three/drei'
import { IconButton } from '../../commons/IconButton'
import { VolumeControl } from '../../commons/VolumeControl'
import { ProgressBar } from './ProgressBar'
import { formatTime } from '../utils'
import { useTextInputContext } from '../../../contexts/TextInputContext'

interface Props {
  id: string
  width: number
  screenHeight: number
  playing: boolean
  progress: number
  duration: number
  volume: number
  url: string
  onPlayPause: () => void
  onStop: () => void
  onSeek: (time: number) => void
  onVolumeChange: (volume: number) => void
  onUrlChange: (url: string) => void
}

const PANEL_HEIGHT = 0.15
const BUTTON_SIZE = PANEL_HEIGHT * 0.6
const PROGRESS_BAR_WIDTH_RATIO = 0.5
const PROGRESS_BAR_HEIGHT = 0.02

export const ControlPanel = memo(
  ({
    id,
    width,
    screenHeight,
    playing,
    progress,
    duration,
    volume,
    url,
    onPlayPause,
    onStop,
    onSeek,
    onVolumeChange,
    onUrlChange,
  }: Props) => {
    const panelY = -screenHeight / 2 - PANEL_HEIGHT / 2
    const progressBarWidth = width * PROGRESS_BAR_WIDTH_RATIO

    const currentTime = progress * duration
    const timeText = `${formatTime(currentTime)} / ${formatTime(duration)}`

    const { requestTextInput } = useTextInputContext()

    const handleUrlInput = useCallback(() => {
      requestTextInput({
        id: `${id}-url-input`,
        placeholder: '動画のURLを入力',
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

        {/* プログレスバー（中央） */}
        <ProgressBar
          id={`${id}-progress`}
          position={[0, 0.01, 0.01]}
          width={progressBarWidth}
          height={PROGRESS_BAR_HEIGHT}
          progress={progress}
          duration={duration}
          onSeek={onSeek}
        />

        {/* 時間表示（プログレスバーの下） */}
        <Text
          position={[0, -0.035, 0.01]}
          fontSize={0.025}
          color="#aaaaaa"
          anchorX="center"
          anchorY="middle"
        >
          {timeText}
        </Text>

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
