import { useEffect, useMemo, useRef, memo } from 'react'
import { useFrame } from '@react-three/fiber'
import { EyeView } from './EyeView'
import { useWebAudioVolume } from '../../hooks/useWebAudioVolume'
import type { Video180SphereProps } from './types'

export type { Video180SphereProps } from './types'

const DEFAULT_RADIUS = 5
const DEFAULT_SEGMENTS = 64

/**
 * 180度ステレオスコピック動画を半球に表示するコンポーネント
 *
 * Side-by-Side形式のステレオ動画に対応。
 * VRモードでは左目と右目に適切な映像を表示する。
 *
 * @example
 * ```tsx
 * <Video180Sphere
 *   url="/videos/sample-180-3d.mp4"
 *   playing={true}
 *   volume={0.8}
 * />
 * ```
 */
export const Video180Sphere = memo(
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
    loop = false,
    placeholderColor = '#000000',
    onEnded,
    onLoadedMetadata,
    onProgress,
  }: Video180SphereProps) => {
    const videoRef = useRef<HTMLVideoElement | null>(null)

    const video = useMemo(() => {
      const vid = document.createElement('video')
      vid.src = url
      vid.currentTime = 0
      vid.loop = loop
      vid.muted = muted
      vid.crossOrigin = 'anonymous'
      vid.playsInline = true
      return vid
    }, [url, loop, muted])

    // videoRefを更新
    useEffect(() => {
      videoRef.current = video
    }, [video])

    // イベントハンドラの設定
    useEffect(() => {
      const handleEnded = () => {
        onEnded?.()
      }

      const handleLoadedMetadata = () => {
        onLoadedMetadata?.({ duration: video.duration })
      }

      const handleTimeUpdate = () => {
        onProgress?.({ currentTime: video.currentTime })
      }

      video.addEventListener('ended', handleEnded)
      video.addEventListener('loadedmetadata', handleLoadedMetadata)
      video.addEventListener('timeupdate', handleTimeUpdate)

      return () => {
        video.removeEventListener('ended', handleEnded)
        video.removeEventListener('loadedmetadata', handleLoadedMetadata)
        video.removeEventListener('timeupdate', handleTimeUpdate)
      }
    }, [video, onEnded, onLoadedMetadata, onProgress])

    // 再生/停止の制御
    useEffect(() => {
      if (playing) {
        video.play().catch((err) => {
          console.error('Video play error:', err)
        })
      } else {
        video.pause()
      }
    }, [video, playing])

    // Web Audio API を使用した音量制御（iOS対応）
    useWebAudioVolume(videoRef.current, volume)

    // クリーンアップ
    useEffect(() => {
      return () => {
        video.pause()
        video.src = ''
        video.removeAttribute('src')
        video.srcObject = null
        video.load()
      }
    }, [video])

    // カメラのlayers設定（@react-three/xrのバグ対策）
    // https://github.com/pmndrs/xr/issues/398
    useFrame(({ camera }) => {
      camera.layers.set(0)
    })

    return (
      <group position={position} rotation={rotation} scale={scale}>
        <EyeView video={video} eye="left" radius={radius} segments={segments} placeholderColor={placeholderColor} />
        <EyeView video={video} eye="right" radius={radius} segments={segments} placeholderColor={placeholderColor} />
      </group>
    )
  }
)

Video180Sphere.displayName = 'Video180Sphere'
