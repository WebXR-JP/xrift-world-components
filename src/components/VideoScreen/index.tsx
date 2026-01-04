import { Suspense, useEffect, useRef, useState } from 'react'
import { useVideoTexture } from '@react-three/drei'
import { useInstanceState } from '../../hooks/useInstanceState'
import { VideoScreenProps, VideoState } from './types'

export type { VideoScreenProps, VideoState } from './types'

/**
 * 動画を表示する内部コンポーネント
 * useVideoTextureを使用するためSuspense内で使用する必要がある
 */
function VideoScreenInner({
  id,
  position = [0, 2, -5],
  rotation = [0, 0, 0],
  scale = [16 / 9 * 3, 3],
  url = '',
  playing = true,
  currentTime = 0,
  sync = 'global',
  muted = false,
}: VideoScreenProps) {
  // グローバル同期用の状態
  const [globalState, setGlobalState] = useInstanceState<VideoState>(
    `video-${id}`,
    {
      url: url,
      isPlaying: playing,
      currentTime: currentTime,
      serverTime: Date.now(),
    }
  )

  // ローカル専用の状態
  const [localState, setLocalState] = useState<VideoState>({
    url: url,
    isPlaying: playing,
    currentTime: currentTime,
    serverTime: Date.now(),
  })

  // sync modeに応じて使用する状態を切り替え
  const videoState = sync === 'global' ? globalState : localState
  const setVideoState = sync === 'global' ? setGlobalState : setLocalState

  // propsが変更されたら、状態も更新
  // serverTimeは毎回Date.now()で変わってしまうので、本当に変更があった時だけ更新
  useEffect(() => {
    if (
      videoState.url !== url ||
      videoState.isPlaying !== playing ||
      videoState.currentTime !== currentTime
    ) {
      setVideoState({
        url: url,
        isPlaying: playing,
        currentTime: currentTime,
        serverTime: Date.now(),
      })
    }
  }, [url, playing, currentTime, videoState, setVideoState])

  // useVideoTextureで動画テクスチャを取得
  const texture = useVideoTexture(url || '', {
    muted,
    loop: true,
    start: playing,
  })

  const videoRef = useRef<HTMLVideoElement>(texture.image)

  // 再生状態の同期
  useEffect(() => {
    const video = texture.image as HTMLVideoElement
    if (!video) return

    if (playing) {
      video.play().catch(err => {
        console.error('Video play error:', err)
      })
    } else {
      video.pause()
    }
  }, [playing, texture])

  // 再生位置の同期ロジック（VRChat方式）
  // currentTimeが外部から変更された場合のみ同期
  const lastSyncTimeRef = useRef(currentTime)

  useEffect(() => {
    const video = texture.image as HTMLVideoElement
    if (!video) return

    // currentTimeが外部から変更された場合のみシークする
    if (lastSyncTimeRef.current !== currentTime) {
      video.currentTime = currentTime
      lastSyncTimeRef.current = currentTime
    }
  }, [currentTime, texture])

  return (
    <group position={position} rotation={rotation}>
      <mesh>
        <planeGeometry args={[scale[0], scale[1]]} />
        <meshBasicMaterial map={texture} toneMapped={false} />
      </mesh>
    </group>
  )
}

/**
 * VideoScreenコンポーネント
 * Suspenseでラップして使用する
 */
export function VideoScreen(props: VideoScreenProps) {
  const { position, rotation, scale, url } = props
  const scaleValue = scale || [16 / 9 * 3, 3]

  // urlが空の場合は黒いスクリーンを表示
  if (!url) {
    return (
      <group position={position} rotation={rotation}>
        <mesh>
          <planeGeometry args={scaleValue} />
          <meshBasicMaterial color="#000000" />
        </mesh>
      </group>
    )
  }

  return (
    <Suspense
      fallback={
        <group position={position} rotation={rotation}>
          <mesh>
            <planeGeometry args={scaleValue} />
            <meshBasicMaterial color="#333333" />
          </mesh>
        </group>
      }
    >
      <VideoScreenInner {...props} />
    </Suspense>
  )
}
