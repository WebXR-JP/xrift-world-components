import { memo, useState, useEffect, useRef, useMemo } from "react";
import { useVideoTexture } from "@react-three/drei";
import * as THREE from "three";
import { useWebAudioVolume } from "../../../hooks/useWebAudioVolume";

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

interface VideoTextureProps {
  url: string;
  cacheKey: number;
  width: number;
  screenHeight: number;
  playing: boolean;
  volume: number;
  onError?: (error: Error) => void;
  onBufferingChange: (isBuffering: boolean) => void;
}

/** 動画テクスチャを表示するコンポーネント（Suspense内で使用） */
export const VideoTexture = memo(
  ({
    url,
    cacheKey,
    width,
    screenHeight,
    playing,
    volume,
    onError,
    onBufferingChange,
  }: VideoTextureProps) => {
    // 動画のアスペクト比を管理（レターボックス/ピラーボックス用）
    const [videoAspectRatio, setVideoAspectRatio] = useState<number | null>(
      null,
    );
    // エラー報告済みフラグ（同じマウント中に複数回エラーを報告しない）
    const errorReportedRef = useRef(false);

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
          if (!errorReportedRef.current) {
            errorReportedRef.current = true;
            console.error("Live video play error:", err);
            onError?.(err);
          }
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
        if (errorReportedRef.current) return;
        const error = (e.target as HTMLVideoElement).error;
        if (error) {
          errorReportedRef.current = true;
          console.error("Live video error:", error.message);
          onError?.(new Error(error.message));
        }
      };

      // 動画のアスペクト比を更新する共通関数
      const updateVideoAspectRatio = () => {
        if (video.videoWidth && video.videoHeight) {
          setVideoAspectRatio(video.videoWidth / video.videoHeight);
        }
      };

      // メタデータ読み込み時のハンドラ
      const handleLoadedMetadata = updateVideoAspectRatio;

      // 既にメタデータが読み込まれている場合
      updateVideoAspectRatio();

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
    // videoAspectRatioは依存配列から除外し、useEffectで更新することでマテリアル再作成を防ぐ
    const shaderMaterial = useMemo(() => {
      return new THREE.ShaderMaterial({
        uniforms: {
          map: { value: texture },
          videoAspectRatio: { value: screenAspectRatio },
          screenAspectRatio: { value: screenAspectRatio },
        },
        vertexShader: letterboxVertexShader,
        fragmentShader: letterboxFragmentShader,
        toneMapped: false,
      });
    }, [texture, screenAspectRatio]);

    // アスペクト比が変わったらuniformを更新（マテリアル再作成なしで効率的に更新）
    useEffect(() => {
      shaderMaterial.uniforms.videoAspectRatio.value =
        videoAspectRatio ?? screenAspectRatio;
      shaderMaterial.uniforms.screenAspectRatio.value = screenAspectRatio;
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
