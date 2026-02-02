import { memo } from "react";
import { useVideoElement } from "../../../hooks/useVideoElement";
import { VideoMesh } from "../../commons/VideoMesh";

interface VideoTextureProps {
  url: string;
  cacheKey: number;
  width: number;
  screenHeight: number;
  playing: boolean;
  volume: number;
  onError?: (error: Error) => void;
  onBufferingChange: (isBuffering: boolean) => void;
}

/** 動画テクスチャを表示するコンポーネント（Suspense内で使用） */
export const VideoTexture = memo(
  ({
    url,
    cacheKey,
    width,
    screenHeight,
    playing,
    volume,
    onError,
    onBufferingChange,
  }: VideoTextureProps) => {
    const { texture } = useVideoElement({
      url,
      cacheKey,
      playing,
      volume,
      loop: false,
      onError,
      onBufferingChange,
    });

    return <VideoMesh texture={texture} width={width} height={screenHeight} />;
  },
);

VideoTexture.displayName = "VideoTexture";
