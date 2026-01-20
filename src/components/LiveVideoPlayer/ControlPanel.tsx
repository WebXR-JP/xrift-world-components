import { memo } from 'react'
import { Text } from '@react-three/drei'
import { PlayPauseButton } from './PlayPauseButton'
import { VolumeControl } from './VolumeControl'
import { LiveIndicator } from './LiveIndicator'
import { UrlInputButton } from './UrlInputButton'
import { ReloadButton } from './ReloadButton'
import type { LiveControlPanelProps } from './types'

const PANEL_HEIGHT = 0.15
const BUTTON_SIZE_RATIO = 0.6

export const ControlPanel = memo(
  ({
    id,
    width,
    screenHeight,
    playing,
    volume,
    isBuffering,
    currentUrl,
    onPlayPause,
    onVolumeChange,
    onUrlChange,
    onReload,
  }: LiveControlPanelProps) => {
    const panelY = -screenHeight / 2 - PANEL_HEIGHT / 2
    const buttonSize = PANEL_HEIGHT * BUTTON_SIZE_RATIO

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

        {/* リロードボタン */}
        <ReloadButton
          id={`${id}-reload`}
          position={[-width * 0.38, 0, 0.01]}
          size={buttonSize}
          onReload={onReload}
        />

        {/* 再生/停止ボタン（左） */}
        <PlayPauseButton
          id={`${id}-play-pause`}
          position={[-width * 0.31, 0, 0.01]}
          size={buttonSize}
          playing={playing}
          onInteract={onPlayPause}
        />

        {/* LIVEインジケータ（中央） */}
        <LiveIndicator position={[0, 0, 0.01]} size={buttonSize} playing={playing} />

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
          size={buttonSize}
          volume={volume}
          onVolumeChange={onVolumeChange}
        />
      </group>
    )
  }
)

ControlPanel.displayName = 'ControlPanel'
