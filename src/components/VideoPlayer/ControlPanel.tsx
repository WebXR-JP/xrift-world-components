import { memo } from 'react'
import { Text } from '@react-three/drei'
import { PlayPauseButton } from './PlayPauseButton'
import { StopButton } from './StopButton'
import { ProgressBar } from './ProgressBar'
import { VolumeControl } from './VolumeControl'
import { UrlInputButton } from './UrlInputButton'
import { formatTime } from './utils'
import type { ControlPanelProps } from './types'

const PANEL_HEIGHT = 0.15
const BUTTON_SIZE_RATIO = 0.6
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
    currentUrl,
    onPlayPause,
    onStop,
    onSeek,
    onVolumeChange,
    onUrlChange,
  }: ControlPanelProps) => {
    const panelY = -screenHeight / 2 - PANEL_HEIGHT / 2
    const buttonSize = PANEL_HEIGHT * BUTTON_SIZE_RATIO
    const progressBarWidth = width * PROGRESS_BAR_WIDTH_RATIO

    const currentTime = progress * duration
    const timeText = `${formatTime(currentTime)} / ${formatTime(duration)}`

    return (
      <group position={[0, panelY, 0]}>
        {/* パネル背景 */}
        <mesh position={[0, 0, 0]}>
          <planeGeometry args={[width, PANEL_HEIGHT]} />
          <meshBasicMaterial color="#1a1a2a" transparent opacity={0.9} />
        </mesh>

        {/* URL入力ボタン（左端） */}
        <UrlInputButton
          id={`${id}-url-input`}
          position={[-width * 0.45, 0, 0.01]}
          size={buttonSize}
          currentUrl={currentUrl}
          onUrlChange={onUrlChange}
        />

        {/* 再生/一時停止ボタン */}
        <PlayPauseButton
          id={`${id}-play-pause`}
          position={[-width * 0.38, 0, 0.01]}
          size={buttonSize}
          playing={playing}
          onInteract={onPlayPause}
        />

        {/* 停止ボタン */}
        <StopButton
          id={`${id}-stop`}
          position={[-width * 0.31, 0, 0.01]}
          size={buttonSize}
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
          size={buttonSize}
          volume={volume}
          onVolumeChange={onVolumeChange}
        />
      </group>
    )
  }
)

ControlPanel.displayName = 'ControlPanel'
