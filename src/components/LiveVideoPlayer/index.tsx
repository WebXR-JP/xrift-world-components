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
import { useWebAudioVolume } from "../../hooks/useWebAudioVolume";
import { useInstanceState } from "../../hooks/useInstanceState";
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

/** 動画テクスチャを表示するコンポーネント（Suspense内で使用） */
const VideoTexture = memo(
  ({
    url,
    cacheKey,
    width,
    screenHeight,
    playing,
    volume,
    onError,
    onBufferingChange,
  }: {
    url: string;
    cacheKey: number;
    width: number;
    screenHeight: number;
    playing: boolean;
    volume: number;
    onError?: (error: Error) => void;
    onBufferingChange: (isBuffering: boolean) => void;
  }) => {
    // 動画のアスペクト比を管理（レターボックス/ピラーボックス用）
    const [videoAspectRatio, setVideoAspectRatio] = useState<number | null>(
      null,
    );

    // suspend-reactのキャッシュを無効化するためにURLにcacheKeyを付与
    const urlWithCacheKey = `${url}${url.includes("?") ? "&" : "?"}_ck=${cacheKey}`;
    const texture = useVideoTexture(urlWithCacheKey, {
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
    }, [playing, onError, texture]);

    // Web Audio API を使用した音量制御（iOS対応）
    useWebAudioVolume(videoRef.current, volume);

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

      // 動画のメタデータ読み込み時にアスペクト比を取得
      const handleLoadedMetadata = () => {
        if (video.videoWidth && video.videoHeight) {
          setVideoAspectRatio(video.videoWidth / video.videoHeight);
        }
      };

      // 既にメタデータが読み込まれている場合
      if (video.videoWidth && video.videoHeight) {
        setVideoAspectRatio(video.videoWidth / video.videoHeight);
      }

      video.addEventListener("waiting", handleWaiting);
      video.addEventListener("playing", handlePlaying);
      video.addEventListener("canplay", handleCanPlay);
      video.addEventListener("error", handleError);
      video.addEventListener("loadedmetadata", handleLoadedMetadata);

      return () => {
        video.removeEventListener("waiting", handleWaiting);
        video.removeEventListener("playing", handlePlaying);
        video.removeEventListener("canplay", handleCanPlay);
        video.removeEventListener("error", handleError);
        video.removeEventListener("loadedmetadata", handleLoadedMetadata);
      };
    }, [texture, onError, onBufferingChange]);

    useEffect(() => {
      const video = texture.image as HTMLVideoElement;
      return () => {
        // 再生を停止
        video.pause();

        // ソースを完全にクリア
        video.src = "";
        video.removeAttribute("src");
        video.srcObject = null;

        // MediaSourceをリリースするためにloadを呼び出し
        video.load();

        // テクスチャを破棄
        texture.dispose();
      };
    }, [texture]);

    // 動画の表示サイズを計算（レターボックス/ピラーボックス対応）
    const screenAspectRatio = width / screenHeight;
    let videoDisplayWidth = width;
    let videoDisplayHeight = screenHeight;

    if (videoAspectRatio !== null) {
      if (videoAspectRatio > screenAspectRatio) {
        // 動画が横長：上下に黒帯（レターボックス）
        videoDisplayWidth = width;
        videoDisplayHeight = width / videoAspectRatio;
      } else {
        // 動画が縦長：左右に黒帯（ピラーボックス）
        videoDisplayHeight = screenHeight;
        videoDisplayWidth = screenHeight * videoAspectRatio;
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
                cacheKey={videoState.reloadKey}
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
