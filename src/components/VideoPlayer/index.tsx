import { memo, Suspense, useState, useCallback, useEffect, useRef, Component, ReactNode } from 'react'
import { useVideoTexture, Text } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import { ControlPanel } from './ControlPanel'
import { useWebAudioVolume } from '../../hooks/useWebAudioVolume'
import type { VideoPlayerProps } from './types'

export type { VideoPlayerProps } from './types'

const DEFAULT_POSITION: [number, number, number] = [0, 2, -5]
const DEFAULT_ROTATION: [number, number, number] = [0, 0, 0]
const DEFAULT_WIDTH = 4

/** エラー境界：子コンポーネントでエラーが発生した場合にfallbackを表示 */
interface ErrorBoundaryProps {
  children: ReactNode
  fallback: ReactNode
  onError?: (error: Error) => void
}

interface ErrorBoundaryState {
  hasError: boolean
}

class VideoErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true }
  }

  componentDidCatch(error: Error) {
    console.error('Video load error:', error)
    this.props.onError?.(error)
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback
    }
    return this.props.children
  }
}

/** 動画テクスチャを表示するコンポーネント（Suspense内で使用） */
const VideoTexture = memo(
  ({
    url,
    width,
    screenHeight,
    playing,
    volume,
    videoRef,
    onDurationChange,
    onProgressChange,
  }: {
    url: string
    width: number
    screenHeight: number
    playing: boolean
    volume: number
    videoRef: React.MutableRefObject<HTMLVideoElement | null>
    onDurationChange: (duration: number) => void
    onProgressChange: (progress: number) => void
  }) => {
    const texture = useVideoTexture(url, {
      muted: false,
      loop: true,
      start: playing,
    })

    useEffect(() => {
      videoRef.current = texture.image as HTMLVideoElement
    }, [texture, videoRef])

    useEffect(() => {
      const video = videoRef.current
      if (!video) return

      if (playing) {
        video.play().catch((err) => {
          console.error('Video play error:', err)
        })
      } else {
        video.pause()
      }
    }, [playing, videoRef])

    // Web Audio API を使用した音量制御（iOS対応）
    useWebAudioVolume(videoRef.current, volume)

    useEffect(() => {
      const video = videoRef.current
      if (!video) return

      const handleLoadedMetadata = () => {
        onDurationChange(video.duration || 0)
      }

      if (video.duration) {
        onDurationChange(video.duration)
      }

      video.addEventListener('loadedmetadata', handleLoadedMetadata)
      return () => {
        video.removeEventListener('loadedmetadata', handleLoadedMetadata)
      }
    }, [texture, onDurationChange, videoRef])

    useFrame(() => {
      const video = videoRef.current
      if (!video || !video.duration) return

      const currentProgress = video.currentTime / video.duration
      onProgressChange(currentProgress)
    })

    useEffect(() => {
      const video = texture.image as HTMLVideoElement
      return () => {
        video.pause()
        video.src = ''
        video.load()
      }
    }, [texture])

    return (
      <mesh>
        <planeGeometry args={[width, screenHeight]} />
        <meshBasicMaterial map={texture} toneMapped={false} />
      </mesh>
    )
  }
)

VideoTexture.displayName = 'VideoTexture'

/** プレースホルダー画面（読み込み中/エラー時/URL未設定時） */
const PlaceholderScreen = memo(
  ({ width, screenHeight, color }: { width: number; screenHeight: number; color: string }) => (
    <mesh>
      <planeGeometry args={[width, screenHeight]} />
      <meshBasicMaterial color={color} />
    </mesh>
  )
)

PlaceholderScreen.displayName = 'PlaceholderScreen'

export const VideoPlayer = memo(
  ({
    id,
    position = DEFAULT_POSITION,
    rotation = DEFAULT_ROTATION,
    width = DEFAULT_WIDTH,
    url: initialUrl,
    playing: initialPlaying = true,
    volume: initialVolume = 1,
  }: VideoPlayerProps) => {
    const [currentUrl, setCurrentUrl] = useState(initialUrl)
    const [playing, setPlaying] = useState(initialPlaying)
    const [volume, setVolume] = useState(initialVolume)
    const [progress, setProgress] = useState(0)
    const [duration, setDuration] = useState(0)
    const [hasError, setHasError] = useState(false)
    const [reloadKey, setReloadKey] = useState(0)
    const videoRef = useRef<HTMLVideoElement | null>(null)
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
      const video = videoRef.current
      if (!video) return
      video.currentTime = time
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
          <VideoErrorBoundary
            fallback={<PlaceholderScreen width={width} screenHeight={screenHeight} color="#000000" />}
            onError={handleError}
          >
            <Suspense
              fallback={<PlaceholderScreen width={width} screenHeight={screenHeight} color="#333333" />}
            >
              <VideoTexture
                key={`${currentUrl}-${reloadKey}`}
                url={currentUrl}
                width={width}
                screenHeight={screenHeight}
                playing={playing}
                volume={volume}
                videoRef={videoRef}
                onDurationChange={handleDurationChange}
                onProgressChange={handleProgressChange}
              />
            </Suspense>
          </VideoErrorBoundary>
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
          currentUrl={currentUrl || ''}
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
