import { memo, useCallback, useMemo } from 'react'
import { Container, Text } from '@react-three/uikit'
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
  visible: boolean
  onPlayPause: () => void
  onStop: () => void
  onSeek: (time: number) => void
  onVolumeChange: (volume: number) => void
  onUrlChange: (url: string) => void
  onToggleVisible: () => void
}

const PIXEL_SIZE = 0.01
const PROGRESS_SEGMENTS = 20
const VOLUME_SEGMENTS = 11

/** パネル高さの割合（screenHeight の 10%） */
const PANEL_HEIGHT_RATIO = 0.1

/** 一時停止アイコン: 2本の縦棒 */
const PauseIcon = memo(({ size }: { size: number }) => (
  <Container width={size} height={size} flexDirection="row" justifyContent="center" alignItems="center" gap={size * 0.15}>
    <Container width={size * 0.2} height={size * 0.7} backgroundColor={0xffffff} borderRadius={1} />
    <Container width={size * 0.2} height={size * 0.7} backgroundColor={0xffffff} borderRadius={1} />
  </Container>
))
PauseIcon.displayName = 'PauseIcon'

/** 再生アイコン: 右向き三角（3つの棒で近似） */
const PlayIcon = memo(({ size }: { size: number }) => (
  <Container width={size} height={size} flexDirection="row" justifyContent="center" alignItems="center" gap={0}>
    <Container width={size * 0.15} height={size * 0.7} backgroundColor={0xffffff} borderRadius={1} />
    <Container width={size * 0.15} height={size * 0.5} backgroundColor={0xffffff} borderRadius={1} />
    <Container width={size * 0.15} height={size * 0.3} backgroundColor={0xffffff} borderRadius={1} />
  </Container>
))
PlayIcon.displayName = 'PlayIcon'

/** 停止アイコン: 四角 */
const StopIcon = memo(({ size }: { size: number }) => (
  <Container width={size} height={size} justifyContent="center" alignItems="center">
    <Container width={size * 0.5} height={size * 0.5} backgroundColor={0xffffff} borderRadius={1} />
  </Container>
))
StopIcon.displayName = 'StopIcon'

/** 音量アイコン: 棒グラフ風 */
const VolumeIcon = memo(({ size, muted }: { size: number; muted: boolean }) => (
  <Container width={size} height={size} flexDirection="row" justifyContent="center" alignItems="flex-end" gap={size * 0.06}>
    <Container width={size * 0.12} height={size * 0.25} backgroundColor={muted ? 0x666666 : 0xffffff} borderRadius={1} />
    <Container width={size * 0.12} height={size * 0.45} backgroundColor={muted ? 0x666666 : 0xffffff} borderRadius={1} />
    <Container width={size * 0.12} height={size * 0.65} backgroundColor={muted ? 0x666666 : 0xffffff} borderRadius={1} />
  </Container>
))
VolumeIcon.displayName = 'VolumeIcon'

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
    visible,
    onPlayPause,
    onStop,
    onSeek,
    onVolumeChange,
    onUrlChange,
    onToggleVisible,
  }: Props) => {
    const pxHeight = screenHeight / PIXEL_SIZE
    const panelHeight = pxHeight * PANEL_HEIGHT_RATIO

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

    const progressSegments = useMemo(() => {
      return Array.from({ length: PROGRESS_SEGMENTS }).map((_, i) => {
        const value = (i / (PROGRESS_SEGMENTS - 1)) * duration
        const isFilled = i / PROGRESS_SEGMENTS <= progress
        return { index: i, value, isFilled }
      })
    }, [duration, progress])

    const volumeSegments = useMemo(() => {
      return Array.from({ length: VOLUME_SEGMENTS }).map((_, i) => {
        const value = i / (VOLUME_SEGMENTS - 1)
        const isFilled = value <= volume
        return { index: i, value, isFilled }
      })
    }, [volume])

    const buttonSize = panelHeight * 0.6
    const iconSize = buttonSize * 0.5

    return (
      <Container
        sizeX={width}
        sizeY={screenHeight}
        pixelSize={PIXEL_SIZE}
        flexDirection="column"
        justifyContent="flex-end"
        onClick={onToggleVisible}
        cursor="pointer"
      >
        {/* コントロールパネル */}
        {!visible ? null : <>
          {/* 画面全体を覆う半透明オーバーレイ */}
          <Container flexGrow={1} width="100%" backgroundColor={0x000000} opacity={0.4} />
          <Container
            width="100%"
            height={panelHeight}
            backgroundColor={0x000000}
            opacity={0.6}
            flexDirection="row"
            alignItems="center"
            paddingX={panelHeight * 0.15}
            gap={panelHeight * 0.1}
          >
          {/* URL入力ボタン */}
          <Container
            width={buttonSize}
            height={buttonSize}
            backgroundColor={0x444444}
            borderRadius={buttonSize / 2}
            justifyContent="center"
            alignItems="center"
            hover={{ backgroundColor: 0x666666 }}
            active={{ backgroundColor: 0x333333 }}
            onClick={handleUrlInput}
            cursor="pointer"
          >
            <Text fontSize={iconSize * 0.6} color={0xffffff} fontWeight="bold">URL</Text>
          </Container>

          {/* 再生/一時停止ボタン */}
          <Container
            width={buttonSize}
            height={buttonSize}
            backgroundColor={0x444444}
            borderRadius={buttonSize / 2}
            justifyContent="center"
            alignItems="center"
            hover={{ backgroundColor: 0x666666 }}
            active={{ backgroundColor: 0x333333 }}
            onClick={onPlayPause}
            cursor="pointer"
          >
            {playing ? <PauseIcon size={iconSize} /> : <PlayIcon size={iconSize} />}
          </Container>

          {/* 停止ボタン */}
          <Container
            width={buttonSize}
            height={buttonSize}
            backgroundColor={0x444444}
            borderRadius={buttonSize / 2}
            justifyContent="center"
            alignItems="center"
            hover={{ backgroundColor: 0x666666 }}
            active={{ backgroundColor: 0x333333 }}
            onClick={onStop}
            cursor="pointer"
          >
            <StopIcon size={iconSize} />
          </Container>

          {/* プログレスバー */}
          <Container
            flexGrow={1}
            height={panelHeight * 0.2}
            flexDirection="row"
            gap={1}
            borderRadius={2}
          >
            {progressSegments.map((seg) => (
              <Container
                key={seg.index}
                flexGrow={1}
                height="100%"
                backgroundColor={seg.isFilled ? 0x4a9eff : 0x333333}
                hover={{ backgroundColor: seg.isFilled ? 0x6ab4ff : 0x555555 }}
                onClick={() => onSeek(seg.value)}
                cursor="pointer"
              />
            ))}
          </Container>

          {/* 時間表示 */}
          <Text fontSize={iconSize * 0.7} color={0xaaaaaa} whiteSpace="pre">
            {timeText}
          </Text>

          {/* 音量アイコン */}
          <VolumeIcon size={iconSize} muted={volume === 0} />

          {/* 音量バー */}
          <Container
            width={panelHeight * 1.2}
            height={panelHeight * 0.2}
            flexDirection="row"
            gap={1}
            borderRadius={2}
          >
            {volumeSegments.map((seg) => (
              <Container
                key={seg.index}
                flexGrow={1}
                height="100%"
                backgroundColor={seg.isFilled ? 0x4aff4a : 0x333333}
                hover={{ backgroundColor: seg.isFilled ? 0x6eff6e : 0x555555 }}
                onClick={() => onVolumeChange(seg.value)}
                cursor="pointer"
              />
            ))}
          </Container>
        </Container>
        </>}
      </Container>
    )
  }
)

ControlPanel.displayName = 'ControlPanel'
