import { Suspense, useEffect, useRef, useState } from 'react'
import { FrontSide } from 'three'
import { useVideoTexture } from '@react-three/drei'
import { useInstanceState } from '../../hooks/useInstanceState'
import { useServerClock } from '../../hooks/useServerClock'
import { useWebAudioVolume } from '../../hooks/useWebAudioVolume'
import { useVideoTimeSync } from './hooks'
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
  volume = 1,
}: VideoScreenProps) {
  // 共有時計。アンカーの打刻に使う（端末の Date.now() は互いに 0.1〜数秒ずれている）
  const clock = useServerClock({ require: 'media' })

  // グローバル同期用の状態
  const [globalState, setGlobalState] = useInstanceState<VideoState>(
    `video-${id}`,
    {
      url: url,
      isPlaying: playing,
      currentTime: currentTime,
      serverTime: clock.now(),
    }
  )

  // ローカル専用の状態
  const [localState, setLocalState] = useState<VideoState>({
    url: url,
    isPlaying: playing,
    currentTime: currentTime,
    serverTime: clock.now(),
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
      // props が変わったらアンカーを打ち直す。
      // 「いまサーバ時刻 X で、再生位置は currentTime である」と宣言する
      setVideoState({
        url: url,
        isPlaying: playing,
        currentTime: currentTime,
        serverTime: clock.now(),
      })
    }
  }, [url, playing, currentTime, videoState, setVideoState, clock])

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

  // Web Audio API を使用した音量制御（iOS対応）
  useWebAudioVolume(texture.image as HTMLVideoElement, volume)

  // 再生位置の追従（アンカー方式）
  // 状態のアンカーと共有時計から目標位置を計算し、穏やかに寄せる。
  // 後から入った人はここで一度シークして追いつく
  useVideoTimeSync({
    video: texture.image as HTMLVideoElement,
    anchorMediaTime: videoState.currentTime,
    anchorServerTime: videoState.serverTime,
    isPlaying: videoState.isPlaying,
    loop: true,
    // ローカル再生は合わせる相手がいないので追従しない
    enabled: sync === 'global',
  })

  // アンマウント時に動画を停止
  useEffect(() => {
    const video = texture.image as HTMLVideoElement

    return () => {
      video.pause()
      video.src = ''
      video.load()
    }
  }, [texture])

  return (
    <group position={position} rotation={rotation}>
      <mesh>
        <planeGeometry args={[scale[0], scale[1]]} />
        <meshBasicMaterial map={texture} toneMapped={false} side={FrontSide} />
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
          <meshBasicMaterial color="#000000" side={FrontSide} />
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
            <meshBasicMaterial color="#333333" side={FrontSide} />
          </mesh>
        </group>
      }
    >
      <VideoScreenInner {...props} />
    </Suspense>
  )
}
