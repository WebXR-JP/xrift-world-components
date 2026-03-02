import { useFrame } from '@react-three/fiber'
import { useEffect, useRef } from 'react'
import { AdditiveBlending, Color, type ConeGeometry, DoubleSide, type Mesh, type ShaderMaterial } from 'three'
import { portalFragmentShader } from '../../shaders/portalFragment'
import { portalVertexShader } from '../../shaders/portalVertex'

interface Props {
  color: string
  secondaryColor: string
  intensity: number
  rotationSpeed: number
  portalRadius: number
}

const INITIAL_UNIFORMS = {
  uTime: { value: 0 },
  uColor: { value: [0.6, 0.33, 1.0] as [number, number, number] },
  uSecondaryColor: { value: [0.73, 0.53, 1.0] as [number, number, number] },
  uIntensity: { value: 1.5 },
}

const CONE_SEGMENTS = 24
const CONE_HEIGHT_SEGMENTS = 12

export const PortalVortex = ({ color, secondaryColor, intensity, rotationSpeed, portalRadius }: Props) => {
  const meshRef = useRef<Mesh>(null)
  const materialRef = useRef<ShaderMaterial>(null)
  const geometryRef = useRef<ConeGeometry>(null)

  useFrame((_, delta) => {
    if (!materialRef.current || !meshRef.current) return

    materialRef.current.uniforms.uTime.value += delta

    const mainColor = new Color(color)
    const subColor = new Color(secondaryColor)
    materialRef.current.uniforms.uColor.value = [mainColor.r, mainColor.g, mainColor.b]
    materialRef.current.uniforms.uSecondaryColor.value = [subColor.r, subColor.g, subColor.b]
    materialRef.current.uniforms.uIntensity.value = intensity

    meshRef.current.rotation.y += rotationSpeed * delta
  })

  useEffect(() => {
    const material = materialRef.current
    const geometry = geometryRef.current
    return () => {
      material?.dispose()
      geometry?.dispose()
    }
  }, [])

  const height = portalRadius * 0.15

  return (
    <mesh ref={meshRef} rotation={[Math.PI, 0, 0]} position={[0, height / 2 + 0.15, 0]}>
      <coneGeometry
        ref={geometryRef}
        args={[portalRadius, height, CONE_SEGMENTS, CONE_HEIGHT_SEGMENTS, true]}
      />
      <shaderMaterial
        ref={materialRef}
        vertexShader={portalVertexShader}
        fragmentShader={portalFragmentShader}
        uniforms={INITIAL_UNIFORMS}
        transparent
        blending={AdditiveBlending}
        depthWrite={false}
        side={DoubleSide}
      />
    </mesh>
  )
}
