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
import { Text } from "@react-three/drei";
import { ControlPanel } from "./ControlPanel";
import { useWebAudioVolume } from "../../hooks/useWebAudioVolume";
import { useInstanceState } from "../../hooks/useInstanceState";
import { useHlsVideo } from "../../hooks/useHlsVideo";
import type { LiveVideoPlayerProps, LiveVideoState } from "./types";

export type { LiveVideoPlayerProps, LiveVideoState } from "./types";

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

/** 動画テクスチャを表示するコンポーネント */
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
    // HLS 対応の video とテクスチャを取得
    const { video, texture, isReady, error } = useHlsVideo(url, {
      muted: false,
      loop: false,
      autoplay: false,
    });

    const videoRef = useRef<HTMLVideoElement | null>(null);

    useEffect(() => {
      videoRef.current = video;
    }, [video]);

    // エラーをコールバックに伝える
    useEffect(() => {
      if (error) {
        console.error("HLS video error:", error);
        onError?.(error);
      }
    }, [error, onError]);

    // 再生状態の制御
    useEffect(() => {
      if (!video || !isReady) return;

      if (playing) {
        video.play().catch((err) => {
          console.error("Live video play error:", err);
          onError?.(err);
        });
      } else {
        video.pause();
      }
    }, [playing, video, isReady, onError]);

    // Web Audio API を使用した音量制御（iOS対応）
    useWebAudioVolume(video, volume);

    // バッファリング状態の監視
    useEffect(() => {
      if (!video) return;

      const handleWaiting = () => onBufferingChange(true);
      const handlePlaying = () => onBufferingChange(false);
      const handleCanPlay = () => onBufferingChange(false);
      const handleError = (e: Event) => {
        const mediaError = (e.target as HTMLVideoElement).error;
        if (mediaError) {
          console.error("Live video error:", mediaError.message);
          onError?.(new Error(mediaError.message));
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
    }, [video, onError, onBufferingChange]);

    // テクスチャが準備できていない場合はプレースホルダーを表示
    if (!texture) {
      return (
        <PlaceholderScreen
          width={width}
          screenHeight={screenHeight}
          color="#333333"
        />
      );
    }

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
    sync = "global",
    onError,
  }: LiveVideoPlayerProps) => {
    // グローバル同期用の状態
    const [globalState, setGlobalState] = useInstanceState<LiveVideoState>(
      `live-video-${id}`,
      {
        url: initialUrl,
        playing: initialPlaying,
        reloadKey: 0,
      },
    );

    // ローカル専用の状態
    const [localState, setLocalState] = useState<LiveVideoState>({
      url: initialUrl,
      playing: initialPlaying,
      reloadKey: 0,
    });

    // sync modeに応じて使用する状態を切り替え
    const videoState = sync === "global" ? globalState : localState;
    const setVideoState = sync === "global" ? setGlobalState : setLocalState;

    // 音量は常にローカル（個人設定）
    const [volume, setVolume] = useState(initialVolume);
    // バッファリング状態とエラー状態もローカル
    const [isBuffering, setIsBuffering] = useState(false);
    const [hasError, setHasError] = useState(false);

    const screenHeight = width * (9 / 16);

    const handleUrlChange = useCallback(
      (newUrl: string) => {
        setVideoState((prev) => ({
          ...prev,
          url: newUrl,
          playing: !!newUrl,
        }));
        setHasError(false);
      },
      [setVideoState],
    );

    const handlePlayPause = useCallback(() => {
      setVideoState((prev) => ({
        ...prev,
        playing: !prev.playing,
      }));
    }, [setVideoState]);

    const handleStop = useCallback(() => {
      setVideoState((prev) => ({
        url: undefined,
        playing: false,
        reloadKey: prev.reloadKey + 1,
      }));
      setIsBuffering(false);
      setHasError(false);
    }, [setVideoState]);

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
        {!videoState.url || hasError ? (
          <>
            <PlaceholderScreen
              width={width}
              screenHeight={screenHeight}
              color="#000000"
            />
            {!videoState.url && (
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
                key={`${videoState.url}-${videoState.reloadKey}`}
                url={videoState.url}
                width={width}
                screenHeight={screenHeight}
                playing={videoState.playing}
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
          playing={videoState.playing}
          volume={volume}
          isBuffering={isBuffering}
          currentUrl={videoState.url || ""}
          onPlayPause={handlePlayPause}
          onStop={handleStop}
          onVolumeChange={handleVolumeChange}
          onUrlChange={handleUrlChange}
        />
      </group>
    );
  },
);

LiveVideoPlayer.displayName = "LiveVideoPlayer";
