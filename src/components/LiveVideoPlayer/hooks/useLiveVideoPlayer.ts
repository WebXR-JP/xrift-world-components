import { useState, useCallback, useEffect, useRef } from "react";
import { useSyncState, type SyncMode } from "../../../hooks/useSyncState";
import type { LiveVideoState } from "../types";

const RETRY_DELAY_MS = 2000;

interface UseLiveVideoPlayerOptions {
  id: string;
  initialUrl?: string;
  initialPlaying?: boolean;
  initialVolume?: number;
  sync?: SyncMode;
}

export const useLiveVideoPlayer = ({
  id,
  initialUrl,
  initialPlaying = false,
  initialVolume = 1,
  sync = "global",
}: UseLiveVideoPlayerOptions) => {
  const [videoState, setVideoState] = useSyncState<LiveVideoState>(
    `live-video-${id}`,
    {
      url: initialUrl,
      playing: initialPlaying,
      reloadKey: 0,
    },
    sync,
  );

  // 音量は常にローカル（個人設定）
  const [volume, setVolume] = useState(initialVolume);
  // バッファリング状態もローカル
  const [isBuffering, setIsBuffering] = useState(false);
  // リトライ状態（エラー発生時に無限自動リトライ）
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
    clearRetryState();
  }, [setVideoState, clearRetryState]);

  const handleVolumeChange = useCallback((newVolume: number) => {
    setVolume(newVolume);
  }, []);

  const handleBufferingChange = useCallback((buffering: boolean) => {
    setIsBuffering(buffering);
    // 再生成功（バッファリング解除）時にリトライ状態をリセット
    if (!buffering) {
      setIsRetrying(false);
    }
  }, []);

  const handleError = useCallback(
    (error: Error) => {
      // リトライ中は新しいエラーを無視（タイムアウト待機中）
      if (isRetrying) return;

      console.warn(`LiveVideoPlayer error, retrying...`, error.message);

      // 無限リトライ（接続成功または手動停止まで）
      setIsRetrying(true);
      setIsBuffering(true);

      // 遅延してリロード（セグメント生成を待つ）
      retryTimeoutRef.current = setTimeout(() => {
        setIsRetrying(false);
        setVideoState((prev) => ({
          ...prev,
          reloadKey: prev.reloadKey + 1,
        }));
      }, RETRY_DELAY_MS);
    },
    [setVideoState, isRetrying],
  );

  return {
    videoState,
    volume,
    isBuffering,
    isRetrying,
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
