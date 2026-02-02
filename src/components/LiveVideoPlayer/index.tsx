import { memo, Suspense } from "react";
import { Text } from "@react-three/drei";
import { ControlPanel, PlaceholderScreen } from "./components";
import { ErrorBoundary } from "../commons/ErrorBoundary";
import { useLiveVideoPlayer } from "./hooks";
import { useVideoElement } from "../../hooks/useVideoElement";
import { VideoMesh } from "../commons/VideoMesh";
import type { LiveVideoPlayerProps } from "./types";

export type { LiveVideoPlayerProps, LiveVideoState } from "./types";

const DEFAULT_POSITION: [number, number, number] = [0, 2, -5];
const DEFAULT_ROTATION: [number, number, number] = [0, 0, 0];
const DEFAULT_WIDTH = 4;

/** ライブ動画テクスチャ（Suspense内で使用） */
const LiveVideoTexture = memo(
  ({
    url,
    cacheKey,
    width,
    height,
    playing,
    volume,
    onError,
    onBufferingChange,
  }: {
    url: string;
    cacheKey: number;
    width: number;
    height: number;
    playing: boolean;
    volume: number;
    onError?: (error: Error) => void;
    onBufferingChange: (buffering: boolean) => void;
  }) => {
    const { texture } = useVideoElement({
      url,
      cacheKey,
      playing,
      volume,
      loop: false,
      onError,
      onBufferingChange,
    });

    return <VideoMesh texture={texture} width={width} height={height} />;
  },
);

LiveVideoTexture.displayName = "LiveVideoTexture";

export const LiveVideoPlayer = memo(
  ({
    id,
    position = DEFAULT_POSITION,
    rotation = DEFAULT_ROTATION,
    width = DEFAULT_WIDTH,
    url: initialUrl,
    playing: initialPlaying = false,
    volume: initialVolume = 1,
    sync = "global",
  }: LiveVideoPlayerProps) => {
    const {
      videoState,
      volume,
      isBuffering,
      isRetrying,
      handlers,
    } = useLiveVideoPlayer({
      id,
      initialUrl,
      initialPlaying,
      initialVolume,
      sync,
    });

    const screenHeight = width * (9 / 16);

    return (
      <group position={position} rotation={rotation}>
        {/* 画面本体 */}
        {!videoState.url || isRetrying ? (
          <>
            <PlaceholderScreen
              width={width}
              screenHeight={screenHeight}
              color="#000000"
            />
            {!videoState.url && !isRetrying && (
              <Text
                position={[0, 0, 0.01]}
                fontSize={width * 0.05}
                color="#666666"
                anchorX="center"
                anchorY="middle"
                textAlign="center"
              >
                {`ライブストリームURLを入力\nHLS .m3u8 形式`}
              </Text>
            )}
          </>
        ) : (
          <ErrorBoundary
            key={`error-boundary-${videoState.url}-${videoState.reloadKey}`}
            fallback={
              <PlaceholderScreen
                width={width}
                screenHeight={screenHeight}
                color="#000000"
              />
            }
            onError={handlers.onError}
          >
            <Suspense
              fallback={
                <PlaceholderScreen
                  width={width}
                  screenHeight={screenHeight}
                  color="#333333"
                />
              }
            >
              <LiveVideoTexture
                url={videoState.url}
                cacheKey={videoState.reloadKey}
                width={width}
                height={screenHeight}
                playing={videoState.playing}
                volume={volume}
                onError={handlers.onError}
                onBufferingChange={handlers.onBufferingChange}
              />
            </Suspense>
          </ErrorBoundary>
        )}

        {/* リトライ中オーバーレイ */}
        {isRetrying && (
          <Text
            position={[0, 0, 0.02]}
            fontSize={width * 0.04}
            color="#ffcc00"
            anchorX="center"
            anchorY="middle"
            textAlign="center"
          >
            再接続中...
          </Text>
        )}

        {/* コントロールパネル（常に表示） */}
        <ControlPanel
          id={id}
          width={width}
          screenHeight={screenHeight}
          playing={videoState.playing}
          volume={volume}
          isBuffering={isBuffering}
          url={videoState.url || ""}
          onPlayPause={handlers.onPlayPause}
          onStop={handlers.onStop}
          onVolumeChange={handlers.onVolumeChange}
          onUrlChange={handlers.onUrlChange}
        />
      </group>
    );
  },
);

LiveVideoPlayer.displayName = "LiveVideoPlayer";
