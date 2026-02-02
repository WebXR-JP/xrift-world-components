import { memo, Suspense, useState, useCallback, useEffect, useRef } from "react";
import { Text } from "@react-three/drei";
import {
  ControlPanel,
  VideoErrorBoundary,
  VideoTexture,
  PlaceholderScreen,
} from "./components";
import { useInstanceState } from "../../hooks/useInstanceState";
import type { LiveVideoPlayerProps, LiveVideoState } from "./types";

export type { LiveVideoPlayerProps, LiveVideoState } from "./types";

const DEFAULT_POSITION: [number, number, number] = [0, 2, -5];
const DEFAULT_ROTATION: [number, number, number] = [0, 0, 0];
const DEFAULT_WIDTH = 4;
const RETRY_DELAY_MS = 2000;

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
    // リトライ状態（エラー発生時に無限自動リトライ）
    const isRetryingRef = useRef(false);
    const [isRetrying, setIsRetrying] = useState(false); // 表示用
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
        isRetryingRef.current = false;
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
      isRetryingRef.current = false;
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
      // 再生成功（バッファリング解除）時にリトライ状態をリセット
      if (!buffering) {
        isRetryingRef.current = false;
        setIsRetrying(false);
        setErrorMessage(null);
      }
    }, []);

    const handleError = useCallback(
      (error: Error) => {
        // リトライ中は新しいエラーを無視（タイムアウト待機中）
        if (isRetryingRef.current) {
          return;
        }

        console.warn(`LiveVideoPlayer error, retrying...`, error.message);

        // 無限リトライ（接続成功または手動停止まで）
        isRetryingRef.current = true;
        setIsRetrying(true);
        setIsBuffering(true);

        // 遅延してリロード（セグメント生成を待つ）
        retryTimeoutRef.current = setTimeout(() => {
          isRetryingRef.current = false;
          setVideoState((prev) => ({
            ...prev,
            reloadKey: prev.reloadKey + 1,
          }));
        }, RETRY_DELAY_MS);
      },
      [setVideoState],
    );

    return (
      <group position={position} rotation={rotation}>
        {/* 画面本体 */}
        {!videoState.url || hasError || isRetrying ? (
          <>
            <PlaceholderScreen
              width={width}
              screenHeight={screenHeight}
              color="#000000"
            />
            {!videoState.url && !hasError && !isRetrying && (
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
