import { useEffect, useMemo, useRef } from 'react'
import { BackSide, Color, Mesh, SRGBColorSpace, VideoTexture } from 'three'

interface EyeViewProps {
  video: HTMLVideoElement
  eye: 'left' | 'right'
  radius: number
  segments: number
  placeholderColor: string
}

/**
 * 各目用のビューを表示する内部コンポーネント
 * Three.jsのlayersを使用してVR時に左右の目に適切な映像を表示
 */
export const EyeView = ({ video, eye, radius, segments, placeholderColor }: EyeViewProps) => {
  const eyeIndex = eye === 'left' ? 0 : 1
  const meshRef = useRef<Mesh>(null)

  const texture = useMemo(() => {
    const tex = new VideoTexture(video)
    tex.colorSpace = SRGBColorSpace
    return tex
  }, [video])

  const placeholderColorVec = useMemo(() => {
    const color = new Color(placeholderColor)
    return [color.r, color.g, color.b]
  }, [placeholderColor])

  useEffect(() => {
    if (!meshRef.current) return
    // layer 0 = 通常カメラ（非VR）, layer 1 = 左目, layer 2 = 右目
    // 左目のメッシュはlayer 0と1に、右目はlayer 2のみ
    // これにより非VRモードでは左目の映像が見える
    if (eye === 'left') {
      meshRef.current.layers.enable(0)
      meshRef.current.layers.enable(1)
    } else {
      meshRef.current.layers.set(2)
    }
  }, [eye])

  useEffect(() => {
    return () => {
      texture.dispose()
    }
  }, [texture])

  // X軸のスケールを反転させて正しい向きのテクスチャを表示
  // rotation=[0, Math.PI, 0]で180度回転し、前方を向くように調整
  return (
    <mesh rotation={[0, Math.PI, 0]} scale={[-1, 1, 1]} ref={meshRef}>
      <sphereGeometry args={[radius, segments, segments, 0, Math.PI]} />
      <shaderMaterial
        uniforms={{
          map: { value: texture },
          eyeIndex: { value: eyeIndex },
          placeholderColor: { value: placeholderColorVec },
        }}
        side={BackSide}
        vertexShader={`
          varying vec2 vUv;
          void main() {
            vUv = uv;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }
        `}
        fragmentShader={`
          uniform sampler2D map;
          uniform int eyeIndex;
          uniform vec3 placeholderColor;
          varying vec2 vUv;
          void main() {
            vec2 uv = vUv;
            // Side-by-Side形式のステレオ動画: 左半分が左目、右半分が右目
            if (eyeIndex == 0) {
              // 左目: テクスチャの左半分を使用
              uv.x = uv.x * 0.5;
            } else {
              // 右目: テクスチャの右半分を使用
              uv.x = uv.x * 0.5 + 0.5;
            }
            vec4 texColor = texture2D(map, uv);
            // 動画未読み込み時（黒い画面）はプレースホルダー色を表示
            float luminance = dot(texColor.rgb, vec3(0.299, 0.587, 0.114));
            if (luminance < 0.01) {
              gl_FragColor = vec4(placeholderColor, 1.0);
              return;
            }
            gl_FragColor = texColor;
          }
        `}
      />
    </mesh>
  )
}
