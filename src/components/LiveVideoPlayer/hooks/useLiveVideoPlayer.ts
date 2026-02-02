import { useState, useCallback, useEffect, useRef } from "react";
import { useInstanceState } from "../../../hooks/useInstanceState";
import type { LiveVideoState } from "../types";

const RETRY_DELAY_MS = 2000;

interface UseLiveVideoPlayerOptions {
  id: string;
  initialUrl?: string;
  initialPlaying?: boolean;
  initialVolume?: number;
  sync?: "global" | "local";
}

export const useLiveVideoPlayer = ({
  id,
  initialUrl,
  initialPlaying = false,
  initialVolume = 1,
  sync = "global",
}: UseLiveVideoPlayerOptions) => {
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
  const [isRetrying, setIsRetrying] = useState(false);
  const retryTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // コンポーネントのクリーンアップ時にタイマーをクリア
  useEffect(() => {
    return () => {
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
      }
    };
  }, []);

  const clearRetryState = useCallback(() => {
    isRetryingRef.current = false;
    setIsRetrying(false);
    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current);
      retryTimeoutRef.current = null;
    }
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
      clearRetryState();
    },
    [setVideoState, clearRetryState],
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
    clearRetryState();
  }, [setVideoState, clearRetryState]);

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

  return {
    videoState,
    volume,
    isBuffering,
    isRetrying,
    hasError,
    errorMessage,
    handlers: {
      onUrlChange: handleUrlChange,
      onPlayPause: handlePlayPause,
      onStop: handleStop,
      onVolumeChange: handleVolumeChange,
      onBufferingChange: handleBufferingChange,
      onError: handleError,
    },
  };
};
