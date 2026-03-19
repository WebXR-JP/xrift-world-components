import { memo, Suspense, useState, useCallback, useRef, useEffect } from 'react'
import { Container, Text } from '@react-three/uikit'
import { useFrame } from '@react-three/fiber'
import { ControlPanel } from './components/ControlPanel'
import { useVideoElement } from '../../hooks/useVideoElement'
import { VideoMesh } from '../commons/VideoMesh'
import { ErrorBoundary } from '../commons/ErrorBoundary'
import { PlaceholderScreen } from '../commons/PlaceholderScreen'

interface Props {
  /** スクリーンの一意なID（必須） */
  id: string
  /** スクリーンの位置 */
  position?: [number, number, number]
  /** スクリーンの回転 */
  rotation?: [number, number, number]
  /** スクリーンの幅（高さは16:9で自動計算、デフォルト: 4） */
  width?: number
  /** 動画のURL */
  url?: string
  /** 初期再生状態（デフォルト: true） */
  playing?: boolean
  /** 初期音量 0〜1（デフォルト: 1） */
  volume?: number
}

/** @public */
export type VideoPlayerProps = Props

/** UI操作後に自動非表示するまでの時間（ms） */
const AUTO_HIDE_DELAY = 3000

const DEFAULT_POSITION: [number, number, number] = [0, 2, -5]
const DEFAULT_ROTATION: [number, number, number] = [0, 0, 0]
const DEFAULT_WIDTH = 4
const PIXEL_SIZE = 0.01

/** 動画テクスチャを表示するコンポーネント（Suspense内で使用） */
const VideoTextureInner = memo(
  ({
    url,
    cacheKey,
    width,
    screenHeight,
    playing,
    volume,
    onDurationChange,
    onProgressChange,
    seekTimeRef,
  }: {
    url: string
    cacheKey: number
    width: number
    screenHeight: number
    playing: boolean
    volume: number
    onDurationChange: (duration: number) => void
    onProgressChange: (progress: number) => void
    seekTimeRef: React.MutableRefObject<number | null>
  }) => {
    const { texture, videoRef } = useVideoElement({
      url,
      cacheKey,
      playing,
      volume,
      loop: true,
      onDurationChange,
    })

    // シーク処理
    useFrame(() => {
      const video = videoRef.current
      if (!video) return

      // シークリクエストがあれば処理
      if (seekTimeRef.current !== null) {
        video.currentTime = seekTimeRef.current
        seekTimeRef.current = null
      }

      // 進捗更新
      if (video.duration) {
        const currentProgress = video.currentTime / video.duration
        onProgressChange(currentProgress)
      }
    })

    return <VideoMesh texture={texture} width={width} height={screenHeight} />
  }
)

VideoTextureInner.displayName = 'VideoTextureInner'

export const VideoPlayer = memo(
  ({
    id,
    position = DEFAULT_POSITION,
    rotation = DEFAULT_ROTATION,
    width = DEFAULT_WIDTH,
    url: initialUrl,
    playing: initialPlaying = true,
    volume: initialVolume = 1,
  }: Props) => {
    const [currentUrl, setCurrentUrl] = useState(initialUrl)
    const [playing, setPlaying] = useState(initialPlaying)
    const [volume, setVolume] = useState(initialVolume)
    const [progress, setProgress] = useState(0)
    const [duration, setDuration] = useState(0)
    const [hasError, setHasError] = useState(false)
    const [reloadKey, setReloadKey] = useState(0)
    const [controlsVisible, setControlsVisible] = useState(false)
    const seekTimeRef = useRef<number | null>(null)
    const autoHideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
    const screenHeight = width * (9 / 16)

    const resetAutoHideTimer = useCallback(() => {
      if (autoHideTimerRef.current) clearTimeout(autoHideTimerRef.current)
      autoHideTimerRef.current = setTimeout(() => {
        setControlsVisible(false)
      }, AUTO_HIDE_DELAY)
    }, [])

    // 再生中にUIを表示したらタイマー開始、停止中はタイマー解除
    useEffect(() => {
      if (playing && controlsVisible) {
        resetAutoHideTimer()
      } else if (autoHideTimerRef.current) {
        clearTimeout(autoHideTimerRef.current)
        autoHideTimerRef.current = null
      }
      return () => {
        if (autoHideTimerRef.current) clearTimeout(autoHideTimerRef.current)
      }
    }, [playing, controlsVisible, resetAutoHideTimer])

    const handleUrlChange = useCallback((newUrl: string) => {
      setCurrentUrl(newUrl)
      setHasError(false)
      setProgress(0)
      setDuration(0)
    }, [])

    const handlePlayPause = useCallback(() => {
      setPlaying((prev) => !prev)
    }, [])

    const handleStop = useCallback(() => {
      setCurrentUrl(undefined)
      setPlaying(false)
      setProgress(0)
      setDuration(0)
      setHasError(false)
      setReloadKey((prev) => prev + 1)
    }, [])

    const handleVolumeChange = useCallback((newVolume: number) => {
      setVolume(newVolume)
      resetAutoHideTimer()
    }, [resetAutoHideTimer])

    const handleSeek = useCallback((time: number) => {
      seekTimeRef.current = time
      resetAutoHideTimer()
    }, [resetAutoHideTimer])

    const handleDurationChange = useCallback((newDuration: number) => {
      setDuration(newDuration)
    }, [])

    const handleProgressChange = useCallback((newProgress: number) => {
      setProgress(newProgress)
    }, [])

    const handleToggleControls = useCallback(() => {
      setControlsVisible((prev) => !prev)
    }, [])

    const handleError = useCallback((error: Error) => {
      console.error('VideoPlayer error:', error)
      setHasError(true)
    }, [])

    return (
      <group position={position} rotation={rotation}>
        {/* 画面本体 */}
        {!currentUrl && !hasError ? (
          <Container
            sizeX={width}
            sizeY={screenHeight}
            pixelSize={PIXEL_SIZE}
            backgroundColor={0x000000}
            justifyContent="center"
            alignItems="center"
          >
            <Text fontSize={width / PIXEL_SIZE * 0.05} color={0x666666} textAlign="center">
              Enter Video URL
            </Text>
          </Container>
        ) : !currentUrl || hasError ? (
          <PlaceholderScreen width={width} screenHeight={screenHeight} color="#000000" />
        ) : (
          <ErrorBoundary
            fallback={<PlaceholderScreen width={width} screenHeight={screenHeight} color="#000000" />}
            onError={handleError}
          >
            <Suspense
              fallback={<PlaceholderScreen width={width} screenHeight={screenHeight} color="#333333" />}
            >
              <VideoTextureInner
                key={`${currentUrl}-${reloadKey}`}
                url={currentUrl}
                cacheKey={reloadKey}
                width={width}
                screenHeight={screenHeight}
                playing={playing}
                volume={volume}
                onDurationChange={handleDurationChange}
                onProgressChange={handleProgressChange}
                seekTimeRef={seekTimeRef}
              />
            </Suspense>
          </ErrorBoundary>
        )}

        {/* コントロールパネル（スクリーン内オーバーレイ） */}
        <group position={[0, 0, 0.01]}>
          <ControlPanel
            id={id}
            width={width}
            screenHeight={screenHeight}
            playing={playing}
            progress={progress}
            duration={duration}
            volume={volume}
            url={currentUrl || ''}
            visible={!playing || controlsVisible}
            onPlayPause={handlePlayPause}
            onStop={handleStop}
            onSeek={handleSeek}
            onVolumeChange={handleVolumeChange}
            onUrlChange={handleUrlChange}
            onToggleVisible={handleToggleControls}
          />
        </group>
      </group>
    )
  }
)

VideoPlayer.displayName = 'VideoPlayer'
