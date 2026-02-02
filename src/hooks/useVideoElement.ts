import { useEffect, useRef } from "react";
import { useVideoTexture } from "@react-three/drei";
import type * as THREE from "three";
import { useWebAudioVolume } from "./useWebAudioVolume";

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

  // イベントリスナーの設定
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleWaiting = () => onBufferingChange?.(true);
    const handlePlaying = () => onBufferingChange?.(false);
    const handleCanPlay = () => onBufferingChange?.(false);
    const handleError = (e: Event) => {
      if (errorReportedRef.current) return;
      const error = (e.target as HTMLVideoElement).error;
      if (error) {
        errorReportedRef.current = true;
        console.error("Video error:", error.message);
        onError?.(new Error(error.message));
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
    video.addEventListener("error", handleError);
    video.addEventListener("loadedmetadata", handleLoadedMetadata);

    return () => {
      video.removeEventListener("waiting", handleWaiting);
      video.removeEventListener("playing", handlePlaying);
      video.removeEventListener("canplay", handleCanPlay);
      video.removeEventListener("error", handleError);
      video.removeEventListener("loadedmetadata", handleLoadedMetadata);
    };
  }, [texture, onError, onBufferingChange, onDurationChange]);

  // クリーンアップ
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

  return { texture, videoRef };
}
