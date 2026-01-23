import { useEffect, useRef, useState, useMemo } from "react";
import { VideoTexture, SRGBColorSpace, LinearFilter } from "three";

interface HlsInstance {
  loadSource(url: string): void;
  attachMedia(video: HTMLVideoElement): void;
  destroy(): void;
  on(event: string, callback: (...args: unknown[]) => void): void;
  off(event: string, callback: (...args: unknown[]) => void): void;
}

interface HlsStatic {
  isSupported(): boolean;
  Events: {
    MANIFEST_PARSED: string;
    ERROR: string;
  };
  ErrorTypes: {
    NETWORK_ERROR: string;
    MEDIA_ERROR: string;
  };
  new (): HlsInstance;
}

// hls.js の動的インポート用キャッシュ
let hlsModule: HlsStatic | null = null;
let hlsModulePromise: Promise<HlsStatic | null> | null = null;

/**
 * hls.js を動的にインポートする
 * optional peer dependency なので、インストールされていない場合は null を返す
 */
async function loadHls(): Promise<HlsStatic | null> {
  if (hlsModule !== null) {
    return hlsModule;
  }

  if (hlsModulePromise !== null) {
    return hlsModulePromise;
  }

  hlsModulePromise = import("hls.js")
    .then((module) => {
      hlsModule = module.default as unknown as HlsStatic;
      return hlsModule;
    })
    .catch(() => {
      console.warn(
        "hls.js is not installed. HLS playback in Chrome/Firefox will not work.",
      );
      return null;
    });

  return hlsModulePromise;
}

/**
 * URL が HLS (.m3u8) かどうかを判定
 */
function isHlsUrl(url: string): boolean {
  const urlLower = url.toLowerCase();
  // クエリパラメータを除去して拡張子をチェック
  const pathWithoutQuery = urlLower.split("?")[0];
  return pathWithoutQuery.endsWith(".m3u8");
}

/**
 * ブラウザが HLS をネイティブサポートしているか確認
 */
function supportsHlsNatively(): boolean {
  const video = document.createElement("video");
  return video.canPlayType("application/vnd.apple.mpegurl") !== "";
}

interface UseHlsVideoOptions {
  muted?: boolean;
  loop?: boolean;
  autoplay?: boolean;
  crossOrigin?: string;
  playsInline?: boolean;
}

interface UseHlsVideoResult {
  video: HTMLVideoElement | null;
  texture: VideoTexture | null;
  isReady: boolean;
  error: Error | null;
}

/**
 * HLS 対応の video 要素とテクスチャを管理するフック
 *
 * - Safari: ネイティブ HLS サポートを使用
 * - Chrome/Firefox/Edge: hls.js を使用（インストールされている場合）
 * - 非 HLS URL: 通常の video.src を使用
 */
export function useHlsVideo(
  url: string | undefined,
  options: UseHlsVideoOptions = {},
): UseHlsVideoResult {
  const {
    muted = false,
    loop = false,
    autoplay = false,
    crossOrigin = "anonymous",
    playsInline = true,
  } = options;

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const hlsRef = useRef<HlsInstance | null>(null);
  const textureRef = useRef<VideoTexture | null>(null);

  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  // video 要素を作成（一度だけ）
  const video = useMemo(() => {
    const v = document.createElement("video");
    v.muted = muted;
    v.loop = loop;
    v.autoplay = autoplay;
    v.crossOrigin = crossOrigin;
    v.playsInline = playsInline;
    v.setAttribute("playsinline", "");
    v.setAttribute("webkit-playsinline", "");
    return v;
  }, [muted, loop, autoplay, crossOrigin, playsInline]);

  // video 参照を更新
  useEffect(() => {
    videoRef.current = video;
  }, [video]);

  // テクスチャを作成
  const texture = useMemo(() => {
    const tex = new VideoTexture(video);
    tex.colorSpace = SRGBColorSpace;
    tex.minFilter = LinearFilter;
    tex.magFilter = LinearFilter;
    textureRef.current = tex;
    return tex;
  }, [video]);

  // URL が変更されたときにソースを設定
  useEffect(() => {
    if (!url) {
      setIsReady(false);
      setError(null);
      return;
    }

    setIsReady(false);
    setError(null);

    const setupVideo = async () => {
      const isHls = isHlsUrl(url);

      // HLS URL でネイティブサポートがある場合（Safari）
      if (isHls && supportsHlsNatively()) {
        video.src = url;
        return;
      }

      // HLS URL でネイティブサポートがない場合（Chrome/Firefox/Edge）
      if (isHls) {
        const Hls = await loadHls();

        if (!Hls) {
          setError(
            new Error(
              "HLS playback is not supported in this browser. Please install hls.js or use Safari.",
            ),
          );
          return;
        }

        if (!Hls.isSupported()) {
          setError(
            new Error("hls.js is not supported in this browser environment."),
          );
          return;
        }

        // 既存の hls インスタンスを破棄
        if (hlsRef.current) {
          hlsRef.current.destroy();
          hlsRef.current = null;
        }

        const hls = new Hls();
        hlsRef.current = hls;

        hls.on(Hls.Events.MANIFEST_PARSED, () => {
          setIsReady(true);
        });

        hls.on(Hls.Events.ERROR, (_event: unknown, data: unknown) => {
          const errorData = data as { fatal?: boolean; type?: string };
          if (errorData.fatal) {
            console.error("HLS fatal error:", errorData);
            setError(new Error(`HLS error: ${errorData.type}`));
          }
        });

        hls.loadSource(url);
        hls.attachMedia(video);
        return;
      }

      // 非 HLS URL（通常の動画ファイル）
      video.src = url;
    };

    const handleCanPlay = () => {
      setIsReady(true);
    };

    const handleError = () => {
      const mediaError = video.error;
      if (mediaError) {
        setError(new Error(`Video error: ${mediaError.message}`));
      }
    };

    video.addEventListener("canplay", handleCanPlay);
    video.addEventListener("error", handleError);

    setupVideo();

    return () => {
      video.removeEventListener("canplay", handleCanPlay);
      video.removeEventListener("error", handleError);
    };
  }, [url, video]);

  // クリーンアップ
  useEffect(() => {
    return () => {
      // HLS インスタンスを破棄
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }

      // video をクリーンアップ
      const v = videoRef.current;
      if (v) {
        v.pause();
        v.src = "";
        v.removeAttribute("src");
        v.srcObject = null;
        v.load();
      }

      // テクスチャを破棄
      if (textureRef.current) {
        textureRef.current.dispose();
        textureRef.current = null;
      }
    };
  }, []);

  return {
    video,
    texture,
    isReady,
    error,
  };
}
