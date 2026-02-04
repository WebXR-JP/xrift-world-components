import { memo } from 'react'
import { useHlsVideo } from '../hooks/useHlsVideo'
import { VideoMesh } from '../../commons/VideoMesh'

interface Props {
  url: string
  cacheKey: number
  width: number
  height: number
  playing: boolean
  volume: number
  onError?: (error: Error) => void
  onBufferingChange: (buffering: boolean) => void
}

/** ライブ動画テクスチャ（Suspense内で使用） */
export const LiveVideoTexture = memo(
  ({
    url,
    cacheKey,
    width,
    height,
    playing,
    volume,
    onError,
    onBufferingChange,
  }: Props) => {
    const { texture } = useHlsVideo({
      url,
      cacheKey,
      playing,
      volume,
      onError,
      onBufferingChange,
    })

    return <VideoMesh texture={texture} width={width} height={height} />
  }
)

LiveVideoTexture.displayName = 'LiveVideoTexture'
