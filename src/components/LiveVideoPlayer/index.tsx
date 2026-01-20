import {
  memo,
  Suspense,
  useState,
  useCallback,
  useEffect,
  useRef,
  Component,
  ReactNode,
} from "react";
import { useVideoTexture, Text } from "@react-three/drei";
import { ControlPanel } from "./ControlPanel";
import type { LiveVideoPlayerProps } from "./types";

export type { LiveVideoPlayerProps } from "./types";

const DEFAULT_POSITION: [number, number, number] = [0, 2, -5];
const DEFAULT_ROTATION: [number, number, number] = [0, 0, 0];
const DEFAULT_WIDTH = 4;

/** エラー境界：子コンポーネントでエラーが発生した場合にfallbackを表示 */
interface ErrorBoundaryProps {
  children: ReactNode;
  fallback: ReactNode;
  onError?: (error: Error) => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

class VideoErrorBoundary extends Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error) {
    console.error("Video load error:", error);
    this.props.onError?.(error);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback;
    }
    return this.props.children;
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
    onError,
    onBufferingChange,
  }: {
    url: string;
    width: number;
    screenHeight: number;
    playing: boolean;
    volume: number;
    onError?: (error: Error) => void;
    onBufferingChange: (isBuffering: boolean) => void;
  }) => {
    const texture = useVideoTexture(url, {
      muted: false,
      loop: false,
      start: playing,
    });

    const videoRef = useRef<HTMLVideoElement>(
      texture.image as HTMLVideoElement,
    );

    useEffect(() => {
      videoRef.current = texture.image as HTMLVideoElement;
    }, [texture]);

    useEffect(() => {
      const video = videoRef.current;
      if (!video) return;

      if (playing) {
        video.play().catch((err) => {
          console.error("Live video play error:", err);
          onError?.(err);
        });
      } else {
        video.pause();
      }
    }, [playing, onError]);

    useEffect(() => {
      const video = videoRef.current;
      if (!video) return;

      video.volume = Math.max(0, Math.min(1, volume));
    }, [volume]);

    useEffect(() => {
      const video = videoRef.current;
      if (!video) return;

      const handleWaiting = () => onBufferingChange(true);
      const handlePlaying = () => onBufferingChange(false);
      const handleCanPlay = () => onBufferingChange(false);
      const handleError = (e: Event) => {
        const error = (e.target as HTMLVideoElement).error;
        if (error) {
          console.error("Live video error:", error.message);
          onError?.(new Error(error.message));
        }
      };

      video.addEventListener("waiting", handleWaiting);
      video.addEventListener("playing", handlePlaying);
      video.addEventListener("canplay", handleCanPlay);
      video.addEventListener("error", handleError);

      return () => {
        video.removeEventListener("waiting", handleWaiting);
        video.removeEventListener("playing", handlePlaying);
        video.removeEventListener("canplay", handleCanPlay);
        video.removeEventListener("error", handleError);
      };
    }, [texture, onError, onBufferingChange]);

    useEffect(() => {
      const video = texture.image as HTMLVideoElement;
      return () => {
        video.pause();
        video.src = "";
        video.load();
      };
    }, [texture]);

    return (
      <mesh>
        <planeGeometry args={[width, screenHeight]} />
        <meshBasicMaterial map={texture} toneMapped={false} />
      </mesh>
    );
  },
);

VideoTexture.displayName = "VideoTexture";

/** プレースホルダー画面（読み込み中/エラー時/URL未設定時） */
const PlaceholderScreen = memo(
  ({
    width,
    screenHeight,
    color,
  }: {
    width: number;
    screenHeight: number;
    color: string;
  }) => (
    <mesh>
      <planeGeometry args={[width, screenHeight]} />
      <meshBasicMaterial color={color} />
    </mesh>
  ),
);

PlaceholderScreen.displayName = "PlaceholderScreen";

export const LiveVideoPlayer = memo(
  ({
    id,
    position = DEFAULT_POSITION,
    rotation = DEFAULT_ROTATION,
    width = DEFAULT_WIDTH,
    url: initialUrl,
    playing: initialPlaying = false,
    volume: initialVolume = 1,
    onError,
  }: LiveVideoPlayerProps) => {
    const [currentUrl, setCurrentUrl] = useState(initialUrl);
    const [playing, setPlaying] = useState(initialPlaying);
    const [volume, setVolume] = useState(initialVolume);
    const [isBuffering, setIsBuffering] = useState(false);
    const [hasError, setHasError] = useState(false);
    const [reloadKey, setReloadKey] = useState(0);
    const screenHeight = width * (9 / 16);

    const handleUrlChange = useCallback((newUrl: string) => {
      setCurrentUrl(newUrl);
      setHasError(false);
    }, []);

    const handleReload = useCallback(() => {
      setHasError(false);
      setReloadKey((prev) => prev + 1);
    }, []);

    const handlePlayPause = useCallback(() => {
      setPlaying((prev) => !prev);
    }, []);

    const handleVolumeChange = useCallback((newVolume: number) => {
      setVolume(newVolume);
    }, []);

    const handleBufferingChange = useCallback((buffering: boolean) => {
      setIsBuffering(buffering);
    }, []);

    const handleError = useCallback(
      (error: Error) => {
        setHasError(true);
        onError?.(error);
      },
      [onError],
    );

    return (
      <group position={position} rotation={rotation}>
        {/* 画面本体 */}
        {!currentUrl || hasError ? (
          <>
            <PlaceholderScreen
              width={width}
              screenHeight={screenHeight}
              color="#000000"
            />
            {!currentUrl && (
              <Text
                position={[0, 0, 0.01]}
                fontSize={width * 0.05}
                color="#666666"
                anchorX="center"
                anchorY="middle"
              >
                {`ライブストリームURLを入力\nHLS .m3u8 形式`}
              </Text>
            )}
          </>
        ) : (
          <VideoErrorBoundary
            fallback={
              <PlaceholderScreen
                width={width}
                screenHeight={screenHeight}
                color="#000000"
              />
            }
            onError={handleError}
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
              <VideoTexture
                key={`${currentUrl}-${reloadKey}`}
                url={currentUrl}
                width={width}
                screenHeight={screenHeight}
                playing={playing}
                volume={volume}
                onError={handleError}
                onBufferingChange={handleBufferingChange}
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
          volume={volume}
          isBuffering={isBuffering}
          currentUrl={currentUrl || ""}
          onPlayPause={handlePlayPause}
          onVolumeChange={handleVolumeChange}
          onUrlChange={handleUrlChange}
          onReload={handleReload}
        />
      </group>
    );
  },
);

LiveVideoPlayer.displayName = "LiveVideoPlayer";
