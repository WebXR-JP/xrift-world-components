import { useEffect, useRef, useCallback } from "react";
import { useVideoTexture } from "@react-three/drei";
import type * as THREE from "three";
import { useWebAudioVolume } from "./useWebAudioVolume";

// 動画が停止したと判断するまでの時間（ms）
const STALL_DETECTION_DELAY = 3000;
// 停止判定のチェック間隔（ms）
const STALL_CHECK_INTERVAL = 500;

export interface UseVideoElementOptions {
  /** 動画URL */
  url: string;
  /** キャッシュバスター用キー */
  cacheKey?: number;
  /** 再生中かどうか */
  playing: boolean;
  /** 音量 0〜1 */
  volume: number;
  /** ループ再生するか */
  loop?: boolean;
  /** エラー発生時のコールバック */
  onError?: (error: Error) => void;
  /** バッファリング状態変更時のコールバック */
  onBufferingChange?: (buffering: boolean) => void;
  /** 動画の長さ取得時のコールバック */
  onDurationChange?: (duration: number) => void;
}

export interface UseVideoElementReturn {
  /** 動画テクスチャ */
  texture: THREE.VideoTexture;
  /** 動画要素への参照 */
  videoRef: React.MutableRefObject<HTMLVideoElement>;
}

/**
 * 動画要素の再生制御・音量・イベント管理を行うフック
 */
export function useVideoElement({
  url,
  cacheKey = 0,
  playing,
  volume,
  loop = false,
  onError,
  onBufferingChange,
  onDurationChange,
}: UseVideoElementOptions): UseVideoElementReturn {
  // エラー報告済みフラグ（同じマウント中に複数回エラーを報告しない）
  const errorReportedRef = useRef(false);
  // 停止検出用
  const lastTimeRef = useRef(0);
  const stallCheckIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const stallStartTimeRef = useRef<number | null>(null);

  // suspend-reactのキャッシュを無効化するためにURLにcacheKeyを付与
  const urlWithCacheKey = `${url}${url.includes("?") ? "&" : "?"}_ck=${cacheKey}`;
  const texture = useVideoTexture(urlWithCacheKey, {
    muted: false,
    loop,
    start: playing,
  });

  const videoRef = useRef<HTMLVideoElement>(texture.image as HTMLVideoElement);

  // テクスチャが変わったらvideoRefを更新
  useEffect(() => {
    videoRef.current = texture.image as HTMLVideoElement;
    errorReportedRef.current = false; // 新しいテクスチャではエラーフラグをリセット
  }, [texture]);

  // 再生/停止制御
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    if (playing) {
      video.play().catch((err) => {
        if (!errorReportedRef.current) {
          errorReportedRef.current = true;
          console.error("Video play error:", err);
          onError?.(err);
        }
      });
    } else {
      video.pause();
    }
  }, [playing, onError, texture]);

  // Web Audio API を使用した音量制御（iOS対応）
  useWebAudioVolume(videoRef.current, volume);

  // 停止検出を開始
  const startStallDetection = useCallback(
    (errorMessage: string) => {
      if (stallCheckIntervalRef.current) return; // 既に監視中

      const video = videoRef.current;
      if (!video) return;

      lastTimeRef.current = video.currentTime;
      stallStartTimeRef.current = Date.now();

      stallCheckIntervalRef.current = setInterval(() => {
        const currentVideo = videoRef.current;
        if (!currentVideo) return;

        const now = Date.now();
        const currentTime = currentVideo.currentTime;

        // 再生が進んでいる場合は停止検出をリセット
        if (currentTime > lastTimeRef.current) {
          lastTimeRef.current = currentTime;
          stallStartTimeRef.current = now;
          return;
        }

        // 一定時間再生が進まない場合はエラーを報告
        if (
          stallStartTimeRef.current &&
          now - stallStartTimeRef.current > STALL_DETECTION_DELAY
        ) {
          if (!errorReportedRef.current) {
            errorReportedRef.current = true;
            console.error("Video stalled:", errorMessage);
            onError?.(new Error(errorMessage));
          }
          // 停止検出を終了
          if (stallCheckIntervalRef.current) {
            clearInterval(stallCheckIntervalRef.current);
            stallCheckIntervalRef.current = null;
          }
        }
      }, STALL_CHECK_INTERVAL);
    },
    [onError]
  );

  // 停止検出をクリア
  const clearStallDetection = useCallback(() => {
    if (stallCheckIntervalRef.current) {
      clearInterval(stallCheckIntervalRef.current);
      stallCheckIntervalRef.current = null;
    }
    stallStartTimeRef.current = null;
  }, []);

  // イベントリスナーの設定
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleWaiting = () => onBufferingChange?.(true);
    const handlePlaying = () => {
      onBufferingChange?.(false);
      clearStallDetection(); // 再生が再開したら停止検出をクリア
    };
    const handleCanPlay = () => {
      onBufferingChange?.(false);
      clearStallDetection();
    };
    const handleTimeUpdate = () => {
      // 再生が進んでいれば停止検出をリセット
      lastTimeRef.current = video.currentTime;
      if (stallStartTimeRef.current) {
        stallStartTimeRef.current = Date.now();
      }
    };
    const handleError = (e: Event) => {
      if (errorReportedRef.current) return;
      const error = (e.target as HTMLVideoElement).error;
      if (error) {
        // MEDIA_ERR_DECODE (code 3) は一時的なエラーの可能性があるため、
        // 即座にエラーを報告せず、動画が本当に停止しているか監視する
        if (error.code === MediaError.MEDIA_ERR_DECODE) {
          console.warn("Video decode error (monitoring for stall):", error.message);
          startStallDetection(error.message);
        } else {
          // その他のエラーは即座に報告
          errorReportedRef.current = true;
          console.error("Video error:", error.message);
          onError?.(new Error(error.message));
        }
      }
    };
    const handleLoadedMetadata = () => {
      onDurationChange?.(video.duration || 0);
    };

    // 既にメタデータが読み込まれている場合
    if (video.duration) {
      onDurationChange?.(video.duration);
    }

    video.addEventListener("waiting", handleWaiting);
    video.addEventListener("playing", handlePlaying);
    video.addEventListener("canplay", handleCanPlay);
    video.addEventListener("timeupdate", handleTimeUpdate);
    video.addEventListener("error", handleError);
    video.addEventListener("loadedmetadata", handleLoadedMetadata);

    return () => {
      video.removeEventListener("waiting", handleWaiting);
      video.removeEventListener("playing", handlePlaying);
      video.removeEventListener("canplay", handleCanPlay);
      video.removeEventListener("timeupdate", handleTimeUpdate);
      video.removeEventListener("error", handleError);
      video.removeEventListener("loadedmetadata", handleLoadedMetadata);
      clearStallDetection();
    };
  }, [texture, onError, onBufferingChange, onDurationChange, startStallDetection, clearStallDetection]);

  // クリーンアップ
  useEffect(() => {
    const video = texture.image as HTMLVideoElement;
    return () => {
      // 停止検出をクリア
      if (stallCheckIntervalRef.current) {
        clearInterval(stallCheckIntervalRef.current);
        stallCheckIntervalRef.current = null;
      }

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

  return { texture, videoRef };
}
