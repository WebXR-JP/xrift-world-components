import { CuboidCollider, RigidBody } from '@react-three/rapier'
import { useEffect, useRef } from 'react'
import { type CylinderGeometry, DoubleSide, type ShaderMaterial } from 'three'
import { simplexNoise3D } from '../../shaders/noise'

const PEDESTAL_HEIGHT = 0.15
const BOTTOM_RADIUS = 1.4
const TOP_RADIUS = 1.25

const vertexShader = /* glsl */ `
varying vec3 vPosition;
varying vec3 vNormal;

void main() {
  vPosition = position;
  vNormal = normalize(normalMatrix * normal);
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`

const fragmentShader = /* glsl */ `
${simplexNoise3D}

varying vec3 vPosition;
varying vec3 vNormal;

void main() {
  // 3Dノイズで石のまだら模様
  float n1 = snoise(vPosition * 1.5) * 0.04;
  float n2 = snoise(vPosition * 4.0) * 0.02;
  float noise = n1 + n2;

  // ベースの灰色にノイズを加える
  vec3 baseColor = vec3(0.2, 0.2, 0.2);
  vec3 stoneColor = baseColor + vec3(noise);

  // 簡易ライティング（上からの光）
  float light = dot(vNormal, vec3(0.0, 1.0, 0.0)) * 0.3 + 0.7;

  gl_FragColor = vec4(stoneColor * light, 1.0);
}
`

const INITIAL_UNIFORMS = {}

const SENSOR_HALF_WIDTH = TOP_RADIUS * 0.6
const SENSOR_HALF_HEIGHT = 0.8

interface Props {
  onEnter?: () => void
}

export const PortalPedestal = ({ onEnter }: Props) => {
  const materialRef = useRef<ShaderMaterial>(null)
  const geometryRef = useRef<CylinderGeometry>(null)

  useEffect(() => {
    const material = materialRef.current
    const geometry = geometryRef.current
    return () => {
      material?.dispose()
      geometry?.dispose()
    }
  }, [])

  return (
    <RigidBody type="fixed" colliders="trimesh">
      <mesh position={[0, PEDESTAL_HEIGHT / 2, 0]} rotation={[0, Math.PI / 4, 0]}>
        <cylinderGeometry ref={geometryRef} args={[TOP_RADIUS, BOTTOM_RADIUS, PEDESTAL_HEIGHT, 4]} />
        <shaderMaterial
          ref={materialRef}
          vertexShader={vertexShader}
          fragmentShader={fragmentShader}
          uniforms={INITIAL_UNIFORMS}
          side={DoubleSide}
        />
      </mesh>
      {/* 台座上のセンサー（プレイヤー進入検知） */}
      <CuboidCollider
        args={[SENSOR_HALF_WIDTH, SENSOR_HALF_HEIGHT, SENSOR_HALF_WIDTH]}
        position={[0, PEDESTAL_HEIGHT + SENSOR_HALF_HEIGHT, 0]}
        sensor
        onIntersectionEnter={onEnter}
      />
    </RigidBody>
  )
}
