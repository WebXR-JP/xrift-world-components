import {
  memo,
  Suspense,
  useState,
  useCallback,
  useEffect,
  useRef,
  useMemo,
  Component,
  ReactNode,
} from "react";
import { useVideoTexture, Text } from "@react-three/drei";
import * as THREE from "three";
import { ControlPanel } from "./ControlPanel";
import { useWebAudioVolume } from "../../hooks/useWebAudioVolume";
import { useInstanceState } from "../../hooks/useInstanceState";
import type { LiveVideoPlayerProps, LiveVideoState } from "./types";

export type { LiveVideoPlayerProps, LiveVideoState } from "./types";

const DEFAULT_POSITION: [number, number, number] = [0, 2, -5];
const DEFAULT_ROTATION: [number, number, number] = [0, 0, 0];
const DEFAULT_WIDTH = 4;
const MAX_RETRY_COUNT = 3;
const RETRY_DELAY_MS = 2000;

/** レターボックス/ピラーボックス対応のシェーダー */
const letterboxVertexShader = `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const letterboxFragmentShader = `
  uniform sampler2D map;
  uniform float videoAspectRatio;
  uniform float screenAspectRatio;
  varying vec2 vUv;

  void main() {
    vec2 uv = vUv;

    if (videoAspectRatio > screenAspectRatio) {
      // 動画が横長：上下に黒帯（レターボックス）
      float scale = screenAspectRatio / videoAspectRatio;
      uv.y = (uv.y - 0.5) / scale + 0.5;
    } else {
      // 動画が縦長：左右に黒帯（ピラーボックス）
      float scale = videoAspectRatio / screenAspectRatio;
      uv.x = (uv.x - 0.5) / scale + 0.5;
    }

    if (uv.x < 0.0 || uv.x > 1.0 || uv.y < 0.0 || uv.y > 1.0) {
      gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0);
    } else {
      gl_FragColor = texture2D(map, uv);
    }
  }
`;

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

    // スクリーンのアスペクト比
    const screenAspectRatio = width / screenHeight;

    // シェーダーマテリアル（レターボックス/ピラーボックス対応）
    const shaderMaterial = useMemo(() => {
      return new THREE.ShaderMaterial({
        uniforms: {
          map: { value: texture },
          videoAspectRatio: { value: videoAspectRatio ?? screenAspectRatio },
          screenAspectRatio: { value: screenAspectRatio },
        },
        vertexShader: letterboxVertexShader,
        fragmentShader: letterboxFragmentShader,
        toneMapped: false,
      });
    }, [texture, videoAspectRatio, screenAspectRatio]);

    // アスペクト比が変わったらuniformを更新
    useEffect(() => {
      shaderMaterial.uniforms.videoAspectRatio.value =
        videoAspectRatio ?? screenAspectRatio;
    }, [shaderMaterial, videoAspectRatio, screenAspectRatio]);

    // クリーンアップ時にマテリアルを破棄
    useEffect(() => {
      return () => {
        shaderMaterial.dispose();
      };
    }, [shaderMaterial]);

    return (
      <mesh>
        <planeGeometry args={[width, screenHeight]} />
        <primitive object={shaderMaterial} attach="material" />
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
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    // リトライ回数（エラー発生時に自動リトライ）
    const [retryCount, setRetryCount] = useState(0);
    const [isRetrying, setIsRetrying] = useState(false);
    const retryTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const screenHeight = width * (9 / 16);

    // コンポーネントのクリーンアップ時にタイマーをクリア
    useEffect(() => {
      return () => {
        if (retryTimeoutRef.current) {
          clearTimeout(retryTimeoutRef.current);
        }
      };
    }, []);

    const handleUrlChange = useCallback(
      (newUrl: string) => {
        setVideoState((prev) => ({
          ...prev,
          url: newUrl,
          playing: !!newUrl,
        }));
        setHasError(false);
        setErrorMessage(null);
        setRetryCount(0);
        setIsRetrying(false);
        if (retryTimeoutRef.current) {
          clearTimeout(retryTimeoutRef.current);
          retryTimeoutRef.current = null;
        }
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
      setErrorMessage(null);
      setRetryCount(0);
      setIsRetrying(false);
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
        retryTimeoutRef.current = null;
      }
    }, [setVideoState]);

    const handleVolumeChange = useCallback((newVolume: number) => {
      setVolume(newVolume);
    }, []);

    const handleBufferingChange = useCallback((buffering: boolean) => {
      setIsBuffering(buffering);
      // 再生成功（バッファリング解除）時にリトライカウントをリセット
      if (!buffering) {
        setRetryCount(0);
        setIsRetrying(false);
        setErrorMessage(null);
      }
    }, []);

    const handleError = useCallback(
      (error: Error) => {
        console.warn(
          `LiveVideoPlayer error (retry ${retryCount + 1}/${MAX_RETRY_COUNT}):`,
          error.message,
        );

        if (retryCount < MAX_RETRY_COUNT) {
          // リトライ回数内なら自動リトライ
          setRetryCount((prev) => prev + 1);
          setIsRetrying(true);
          setIsBuffering(true);

          // 遅延してリロード（セグメント生成を待つ）
          retryTimeoutRef.current = setTimeout(() => {
            setVideoState((prev) => ({
              ...prev,
              reloadKey: prev.reloadKey + 1,
            }));
          }, RETRY_DELAY_MS);
        } else {
          // リトライ回数を超えたらエラー状態に
          setHasError(true);
          setIsRetrying(false);
          setErrorMessage(error.message);
          onError?.(error);
        }
      },
      [onError, retryCount, setVideoState],
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
            {!videoState.url && !hasError && (
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
            {hasError && (
              <Text
                position={[0, 0, 0.01]}
                fontSize={width * 0.04}
                color="#ff6666"
                anchorX="center"
                anchorY="middle"
                textAlign="center"
                maxWidth={width * 0.9}
              >
                {`接続エラー\n${errorMessage || "ストリームの読み込みに失敗しました"}\n\nURLを再入力してください`}
              </Text>
            )}
          </>
        ) : (
          <VideoErrorBoundary
            key={`error-boundary-${videoState.url}-${videoState.reloadKey}`}
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
            {`再接続中... (${retryCount}/${MAX_RETRY_COUNT})`}
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
