import { useFrame } from '@react-three/fiber'
import { useEffect, useMemo, useRef } from 'react'
import { AdditiveBlending, type BufferAttribute, type BufferGeometry, Color, type Points, type ShaderMaterial } from 'three'

interface Props {
  particleCount: number
  color: string
  portalRadius: number
  rotationSpeed: number
}

const particleVertexShader = /* glsl */ `
attribute float aOpacity;
varying float vOpacity;

void main() {
  vOpacity = aOpacity;
  vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
  gl_PointSize = 30.0 / -mvPosition.z;
  gl_Position = projectionMatrix * mvPosition;
}
`

const particleFragmentShader = /* glsl */ `
uniform vec3 uColor;
varying float vOpacity;

void main() {
  // 円形のポイント
  float dist = length(gl_PointCoord - vec2(0.5));
  if (dist > 0.5) discard;
  float soft = 1.0 - smoothstep(0.3, 0.5, dist);
  gl_FragColor = vec4(uColor, soft * vOpacity);
}
`

const INITIAL_UNIFORMS = {
  uColor: { value: [0.73, 0.53, 1.0] as [number, number, number] },
}

const initParticles = (count: number, radius: number) => {
  const positions = new Float32Array(count * 3)
  const opacities = new Float32Array(count)
  const speeds = new Float32Array(count)

  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2
    const dist = radius * (0.3 + Math.random() * 0.7)
    const height = Math.random() * 0.8 + 0.2

    positions[i * 3] = Math.cos(angle) * dist
    positions[i * 3 + 1] = height
    positions[i * 3 + 2] = Math.sin(angle) * dist

    opacities[i] = 0.0
    speeds[i] = 0.3 + Math.random() * 0.7
  }

  return { positions, opacities, speeds }
}

const MAX_HEIGHT = 1.0
const FADE_START = 0.7

export const PortalParticles = ({ particleCount, color, portalRadius, rotationSpeed }: Props) => {
  const pointsRef = useRef<Points>(null)
  const geometryRef = useRef<BufferGeometry>(null)
  const materialRef = useRef<ShaderMaterial>(null)
  const timeRef = useRef(0)

  const { positions, opacities, speeds } = useMemo(
    () => initParticles(particleCount, portalRadius),
    [particleCount, portalRadius],
  )

  useFrame((_, delta) => {
    if (!geometryRef.current || !materialRef.current) return
    timeRef.current += delta

    const c = new Color(color)
    materialRef.current.uniforms.uColor.value = [c.r, c.g, c.b]

    const posAttr = geometryRef.current.getAttribute('position') as BufferAttribute
    const posArray = posAttr.array as Float32Array
    const opacityAttr = geometryRef.current.getAttribute('aOpacity') as BufferAttribute
    const opacityArray = opacityAttr.array as Float32Array

    for (let i = 0; i < particleCount; i++) {
      const x = posArray[i * 3]
      let y = posArray[i * 3 + 1]
      const z = posArray[i * 3 + 2]

      const angle = Math.atan2(z, x)
      const dist = Math.sqrt(x * x + z * z)

      const angularSpeed = speeds[i] * rotationSpeed * (2.0 + 1.5 / (dist + 0.1))
      const newAngle = angle + angularSpeed * delta

      const shrinkRate = 0.25 * speeds[i]
      const fallRate = 0.35 * speeds[i]
      let newDist = dist - shrinkRate * delta
      y -= fallRate * delta

      // 高さに応じたフェードイン（上=透明、下=不透明）
      const normalizedHeight = Math.min(Math.max((MAX_HEIGHT - y) / (MAX_HEIGHT - 0.15), 0), 1)
      opacityArray[i] = normalizedHeight < FADE_START
        ? normalizedHeight / FADE_START * 0.8
        : 0.8

      if (newDist < 0.05 || y < 0.15) {
        const resetAngle = Math.random() * Math.PI * 2
        newDist = portalRadius * (0.5 + Math.random() * 0.5)
        y = 0.5 + Math.random() * 0.5
        opacityArray[i] = 0.0

        posArray[i * 3] = Math.cos(resetAngle) * newDist
        posArray[i * 3 + 1] = y
        posArray[i * 3 + 2] = Math.sin(resetAngle) * newDist
      } else {
        posArray[i * 3] = Math.cos(newAngle) * newDist
        posArray[i * 3 + 1] = y
        posArray[i * 3 + 2] = Math.sin(newAngle) * newDist
      }
    }

    posAttr.needsUpdate = true
    opacityAttr.needsUpdate = true
  })

  useEffect(() => {
    const geometry = geometryRef.current
    const material = materialRef.current
    return () => {
      geometry?.dispose()
      material?.dispose()
    }
  }, [])

  return (
    <points ref={pointsRef}>
      <bufferGeometry ref={geometryRef}>
        <bufferAttribute
          attach="attributes-position"
          args={[positions, 3]}
          count={particleCount}
        />
        <bufferAttribute
          attach="attributes-aOpacity"
          args={[opacities, 1]}
          count={particleCount}
        />
      </bufferGeometry>
      <shaderMaterial
        ref={materialRef}
        vertexShader={particleVertexShader}
        fragmentShader={particleFragmentShader}
        uniforms={INITIAL_UNIFORMS}
        transparent
        blending={AdditiveBlending}
        depthWrite={false}
      />
    </points>
  )
}
