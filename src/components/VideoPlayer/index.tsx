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
    cacheKey,
    width,
    screenHeight,
    playing,
    volume,
    videoRef,
    onDurationChange,
    onProgressChange,
  }: {
    url: string
    cacheKey: number
    width: number
    screenHeight: number
    playing: boolean
    volume: number
    videoRef: React.MutableRefObject<HTMLVideoElement | null>
    onDurationChange: (duration: number) => void
    onProgressChange: (progress: number) => void
  }) => {
    // 動画のアスペクト比を管理（レターボックス/ピラーボックス用）
    const [videoAspectRatio, setVideoAspectRatio] = useState<number | null>(null)

    // suspend-reactのキャッシュを無効化するためにURLにcacheKeyを付与
    const urlWithCacheKey = `${url}${url.includes('?') ? '&' : '?'}_ck=${cacheKey}`
    const texture = useVideoTexture(urlWithCacheKey, {
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
        // 動画のアスペクト比を取得
        if (video.videoWidth && video.videoHeight) {
          setVideoAspectRatio(video.videoWidth / video.videoHeight)
        }
      }

      if (video.duration) {
        onDurationChange(video.duration)
      }

      // 既にメタデータが読み込まれている場合
      if (video.videoWidth && video.videoHeight) {
        setVideoAspectRatio(video.videoWidth / video.videoHeight)
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
        // 再生を停止
        video.pause()

        // ソースを完全にクリア
        video.src = ''
        video.removeAttribute('src')
        video.srcObject = null

        // MediaSourceをリリースするためにloadを呼び出し
        video.load()

        // テクスチャを破棄
        texture.dispose()
      }
    }, [texture])

    // 動画の表示サイズを計算（レターボックス/ピラーボックス対応）
    const screenAspectRatio = width / screenHeight
    let videoDisplayWidth = width
    let videoDisplayHeight = screenHeight

    if (videoAspectRatio !== null) {
      if (videoAspectRatio > screenAspectRatio) {
        // 動画が横長：上下に黒帯（レターボックス）
        videoDisplayWidth = width
        videoDisplayHeight = width / videoAspectRatio
      } else {
        // 動画が縦長：左右に黒帯（ピラーボックス）
        videoDisplayHeight = screenHeight
        videoDisplayWidth = screenHeight * videoAspectRatio
      }
    }

    return (
      <group>
        {/* 黒い背景（常に16:9） */}
        <mesh>
          <planeGeometry args={[width, screenHeight]} />
          <meshBasicMaterial color="#000000" />
        </mesh>
        {/* 動画（アスペクト比に合わせてサイズ調整） */}
        <mesh position={[0, 0, 0.001]}>
          <planeGeometry args={[videoDisplayWidth, videoDisplayHeight]} />
          <meshBasicMaterial map={texture} toneMapped={false} />
        </mesh>
      </group>
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
                cacheKey={reloadKey}
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
