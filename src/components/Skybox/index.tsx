import { useThree } from '@react-three/fiber'
import { useEffect, useMemo } from 'react'
import { BackSide, Color, ShaderMaterial, SphereGeometry } from 'three'
import { SkyboxProps } from './types'

export type { SkyboxProps } from './types'

const vertexShader = `
  varying vec3 vWorldPosition;
  void main() {
    vec4 worldPosition = modelMatrix * vec4(position, 1.0);
    vWorldPosition = worldPosition.xyz;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`

const fragmentShader = `
  uniform vec3 topColor;
  uniform vec3 bottomColor;
  uniform float offset;
  uniform float exponent;
  varying vec3 vWorldPosition;
  void main() {
    float h = normalize(vWorldPosition + offset).y;
    gl_FragColor = vec4(mix(bottomColor, topColor, max(pow(max(h, 0.0), exponent), 0.0)), 1.0);
  }
`

export function Skybox({
  topColor = 0x87ceeb,
  bottomColor = 0xffffff,
  offset = 0,
  exponent = 1,
}: SkyboxProps) {
  const { scene } = useThree()

  const material = useMemo(() => {
    return new ShaderMaterial({
      vertexShader,
      fragmentShader,
      uniforms: {
        topColor: { value: new Color(topColor) },
        bottomColor: { value: new Color(bottomColor) },
        offset: { value: offset },
        exponent: { value: exponent },
      },
      side: BackSide,
      depthWrite: false,
    })
  }, [topColor, bottomColor, offset, exponent])

  const geometry = useMemo(() => new SphereGeometry(500, 32, 15), [])

  useEffect(() => {
    // 背景色を設定
    const originalBackground = scene.background
    scene.background = new Color(bottomColor)

    return () => {
      scene.background = originalBackground
    }
  }, [scene, bottomColor])

  return <mesh geometry={geometry} material={material} />
}
