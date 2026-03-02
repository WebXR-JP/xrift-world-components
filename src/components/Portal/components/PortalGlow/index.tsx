import { useFrame } from '@react-three/fiber'
import { useEffect, useRef } from 'react'
import { AdditiveBlending, Color, DoubleSide, type PlaneGeometry, type ShaderMaterial } from 'three'

interface Props {
  color: string
  intensity: number
}

const glowVertexShader = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`

const glowFragmentShader = /* glsl */ `
uniform float uTime;
uniform vec3 uColor;
uniform float uIntensity;
varying vec2 vUv;

void main() {
  vec2 centered = (vUv - 0.5) * 2.0;
  float dist = length(centered);

  // 円形のソフトグロー
  float glow = exp(-dist * dist * 5.0);

  // ふわふわ脈動
  float pulse = sin(uTime * 1.5) * 0.08 + 0.92;
  float pulse2 = sin(uTime * 2.7 + 1.0) * 0.05 + 0.95;

  float brightness = glow * pulse * pulse2 * uIntensity * 5.0;
  vec3 finalColor = uColor * brightness;

  float alpha = glow * pulse * 1.2;
  if (alpha < 0.01) discard;

  gl_FragColor = vec4(finalColor, alpha);
}
`

const INITIAL_UNIFORMS = {
  uTime: { value: 0 },
  uColor: { value: [0.6, 0.33, 1.0] as [number, number, number] },
  uIntensity: { value: 1.5 },
}

export const PortalGlow = ({ color, intensity }: Props) => {
  const materialRef = useRef<ShaderMaterial>(null)
  const geometryRef = useRef<PlaneGeometry>(null)

  useFrame((_, delta) => {
    if (!materialRef.current) return
    materialRef.current.uniforms.uTime.value += delta

    const c = new Color(color)
    materialRef.current.uniforms.uColor.value = [c.r, c.g, c.b]
    materialRef.current.uniforms.uIntensity.value = intensity
  })

  useEffect(() => {
    const material = materialRef.current
    const geometry = geometryRef.current
    return () => {
      material?.dispose()
      geometry?.dispose()
    }
  }, [])

  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.16, 0]}>
      <planeGeometry ref={geometryRef} args={[2, 2]} />
      <shaderMaterial
        ref={materialRef}
        vertexShader={glowVertexShader}
        fragmentShader={glowFragmentShader}
        uniforms={INITIAL_UNIFORMS}
        transparent
        blending={AdditiveBlending}
        depthWrite={false}
        side={DoubleSide}
      />
    </mesh>
  )
}
