import { memo, Suspense, useState, useCallback, useRef } from 'react'
import { Text } from '@react-three/drei'
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

const DEFAULT_POSITION: [number, number, number] = [0, 2, -5]
const DEFAULT_ROTATION: [number, number, number] = [0, 0, 0]
const DEFAULT_WIDTH = 4

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
    const seekTimeRef = useRef<number | null>(null)
    const screenHeight = width * (9 / 16)

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
    }, [])

    const handleSeek = useCallback((time: number) => {
      seekTimeRef.current = time
    }, [])

    const handleDurationChange = useCallback((newDuration: number) => {
      setDuration(newDuration)
    }, [])

    const handleProgressChange = useCallback((newProgress: number) => {
      setProgress(newProgress)
    }, [])

    const handleError = useCallback((error: Error) => {
      console.error('VideoPlayer error:', error)
      setHasError(true)
    }, [])

    return (
      <group position={position} rotation={rotation}>
        {/* 画面本体 */}
        {!currentUrl || hasError ? (
          <>
            <PlaceholderScreen width={width} screenHeight={screenHeight} color="#000000" />
            {!currentUrl && (
              <Text
                position={[0, 0, 0.01]}
                fontSize={width * 0.05}
                color="#666666"
                anchorX="center"
                anchorY="middle"
              >
                URLを入力してください
              </Text>
            )}
          </>
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

        {/* コントロールパネル（常に表示） */}
        <ControlPanel
          id={id}
          width={width}
          screenHeight={screenHeight}
          playing={playing}
          progress={progress}
          duration={duration}
          volume={volume}
          url={currentUrl || ''}
          onPlayPause={handlePlayPause}
          onStop={handleStop}
          onSeek={handleSeek}
          onVolumeChange={handleVolumeChange}
          onUrlChange={handleUrlChange}
        />
      </group>
    )
  }
)

VideoPlayer.displayName = 'VideoPlayer'
