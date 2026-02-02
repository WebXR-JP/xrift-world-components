/** レターボックス/ピラーボックス対応のシェーダー */
export const letterboxVertexShader = `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

export const letterboxFragmentShader = `
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
