import { simplexNoise3D } from './noise'

export const portalFragmentShader = /* glsl */ `
${simplexNoise3D}

uniform float uTime;
uniform vec3 uColor;
uniform vec3 uSecondaryColor;
uniform float uIntensity;

varying vec2 vUv;
varying vec3 vPosition;

void main() {
  // 3D位置から角度を計算（UV継ぎ目なし）
  float angle = atan(vPosition.z, vPosition.x);
  float height = vUv.y; // 0=頂点, 1=底面

  // 高さに応じてねじり（頂点側ほど強くねじれる）
  float twistedAngle = angle - (1.0 - height) * 3.0;

  // ストライプパターン
  float arms = 8.0;
  float rawPattern = sin(twistedAngle * arms) * 0.5 + 0.5;
  float radialPattern = smoothstep(0.2, 0.6, rawPattern);

  // 緩やかな脈動
  float pulse = sin(uTime * 2.0) * 0.08 + 0.92;

  // 底面側（上）を明るく、頂点側（下）を暗く
  float heightBrightness = smoothstep(0.0, 0.5, height);

  // 距離ベースの色混合（頂点=メインカラー、底面=サブカラー）
  vec3 baseColor = mix(uColor, uSecondaryColor, height);

  // 最終色合成
  float brightness = (radialPattern * 0.7 + heightBrightness * 0.3) * pulse * uIntensity;
  vec3 finalColor = baseColor * brightness;

  // 頂点付近をフェードアウト
  float alpha = smoothstep(0.0, 0.5, height) * clamp(brightness, 0.0, 1.0);

  gl_FragColor = vec4(finalColor, alpha);
}
`
