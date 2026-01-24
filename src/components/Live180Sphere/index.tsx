import { useEffect, useRef, memo, Suspense } from 'react'
import { useFrame } from '@react-three/fiber'
import { useVideoTexture } from '@react-three/drei'
import { EyeView } from './EyeView'
import { useWebAudioVolume } from '../../hooks/useWebAudioVolume'
import type { Live180SphereProps } from './types'

export type { Live180SphereProps } from './types'

const DEFAULT_RADIUS = 5
const DEFAULT_SEGMENTS = 64

/** プレースホルダー半球（読み込み中に表示） */
const PlaceholderSphere = memo(
  ({ radius, segments, color }: { radius: number; segments: number; color: string }) => (
    <mesh rotation={[0, Math.PI, 0]} scale={[-1, 1, 1]}>
      <sphereGeometry args={[radius, segments, segments, 0, Math.PI]} />
      <meshBasicMaterial color={color} side={2} />
    </mesh>
  )
)

PlaceholderSphere.displayName = 'PlaceholderSphere'

/** ライブ動画テクスチャを半球に表示するコンポーネント */
const LiveVideoSphere = memo(
  ({
    url,
    playing,
    muted,
    volume,
    radius,
    segments,
    placeholderColor,
    onError,
    onBufferingChange,
  }: {
    url: string
    playing: boolean
    muted: boolean
    volume: number
    radius: number
    segments: number
    placeholderColor: string
    onError?: (error: Error) => void
    onBufferingChange?: (isBuffering: boolean) => void
  }) => {
    const texture = useVideoTexture(url, {
      muted,
      loop: false,
      start: playing,
    })

    const videoRef = useRef<HTMLVideoElement>(texture.image as HTMLVideoElement)

    useEffect(() => {
      videoRef.current = texture.image as HTMLVideoElement
    }, [texture])

    useEffect(() => {
      const video = videoRef.current
      if (!video) return

      if (playing) {
        video.play().catch((err) => {
          console.error('Live 180 video play error:', err)
          onError?.(err)
        })
      } else {
        video.pause()
      }
    }, [playing, onError, texture])

    // Web Audio API を使用した音量制御（iOS対応）
    useWebAudioVolume(videoRef.current, volume)

    // バッファリング状態の監視
    useEffect(() => {
      const video = videoRef.current
      if (!video) return

      const handleWaiting = () => onBufferingChange?.(true)
      const handlePlaying = () => onBufferingChange?.(false)
      const handleCanPlay = () => onBufferingChange?.(false)
      const handleError = (e: Event) => {
        const error = (e.target as HTMLVideoElement).error
        if (error) {
          console.error('Live 180 video error:', error.message)
          onError?.(new Error(error.message))
        }
      }

      video.addEventListener('waiting', handleWaiting)
      video.addEventListener('playing', handlePlaying)
      video.addEventListener('canplay', handleCanPlay)
      video.addEventListener('error', handleError)

      return () => {
        video.removeEventListener('waiting', handleWaiting)
        video.removeEventListener('playing', handlePlaying)
        video.removeEventListener('canplay', handleCanPlay)
        video.removeEventListener('error', handleError)
      }
    }, [texture, onError, onBufferingChange])

    // クリーンアップ
    useEffect(() => {
      const video = texture.image as HTMLVideoElement
      return () => {
        video.pause()
        video.src = ''
        video.removeAttribute('src')
        video.srcObject = null
        video.load()
        texture.dispose()
      }
    }, [texture])

    return (
      <>
        <EyeView texture={texture} eye="left" radius={radius} segments={segments} placeholderColor={placeholderColor} />
        <EyeView texture={texture} eye="right" radius={radius} segments={segments} placeholderColor={placeholderColor} />
      </>
    )
  }
)

LiveVideoSphere.displayName = 'LiveVideoSphere'

/**
 * 180度ステレオスコピックライブ動画を半球に表示するコンポーネント
 *
 * HLS（.m3u8）形式のライブストリームに対応。
 * Side-by-Side形式のステレオ動画に対応し、
 * VRモードでは左目と右目に適切な映像を表示する。
 *
 * @example
 * ```tsx
 * <Live180Sphere
 *   url="https://example.com/live-stream.m3u8"
 *   playing={true}
 *   muted
 * />
 * ```
 */
export const Live180Sphere = memo(
  ({
    url,
    position,
    rotation,
    scale,
    playing = false,
    muted = false,
    volume = 1,
    radius = DEFAULT_RADIUS,
    segments = DEFAULT_SEGMENTS,
    placeholderColor = '#000000',
    onError,
    onBufferingChange,
  }: Live180SphereProps) => {
    // カメラのlayers設定（@react-three/xrのバグ対策）
    // https://github.com/pmndrs/xr/issues/398
    useFrame(({ camera }) => {
      camera.layers.set(0)
    })

    return (
      <group position={position} rotation={rotation} scale={scale}>
        <Suspense fallback={<PlaceholderSphere radius={radius} segments={segments} color={placeholderColor} />}>
          <LiveVideoSphere
            url={url}
            playing={playing}
            muted={muted}
            volume={volume}
            radius={radius}
            segments={segments}
            placeholderColor={placeholderColor}
            onError={onError}
            onBufferingChange={onBufferingChange}
          />
        </Suspense>
      </group>
    )
  }
)

Live180Sphere.displayName = 'Live180Sphere'
