import { memo, useMemo, useEffect, useState } from "react";
import * as THREE from "three";

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

export interface VideoMeshProps {
  /** 動画テクスチャ */
  texture: THREE.VideoTexture;
  /** スクリーンの幅 */
  width: number;
  /** スクリーンの高さ */
  height: number;
}

/**
 * 動画テクスチャをレターボックス/ピラーボックス対応で表示するメッシュ
 */
export const VideoMesh = memo(({ texture, width, height }: VideoMeshProps) => {
  const video = texture.image as HTMLVideoElement;

  // 動画のアスペクト比を管理
  const [videoAspectRatio, setVideoAspectRatio] = useState<number | null>(null);

  // スクリーンのアスペクト比
  const screenAspectRatio = width / height;

  // 動画のアスペクト比を取得
  useEffect(() => {
    const updateVideoAspectRatio = () => {
      if (video.videoWidth && video.videoHeight) {
        setVideoAspectRatio(video.videoWidth / video.videoHeight);
      }
    };

    const handleLoadedMetadata = updateVideoAspectRatio;

    // 既にメタデータが読み込まれている場合
    updateVideoAspectRatio();

    video.addEventListener("loadedmetadata", handleLoadedMetadata);
    return () => {
      video.removeEventListener("loadedmetadata", handleLoadedMetadata);
    };
  }, [video]);

  // シェーダーマテリアル
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
      <planeGeometry args={[width, height]} />
      <primitive object={shaderMaterial} attach="material" />
    </mesh>
  );
});

VideoMesh.displayName = "VideoMesh";
