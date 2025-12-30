import { type FC, useEffect } from 'react'
import { shaderMaterial } from '@react-three/drei'
import { extend } from '@react-three/fiber'
import { DoubleSide } from 'three'
import { useSpawnPointContext } from '../../contexts/SpawnPointContext'

const GradientCylinderMaterial = shaderMaterial(
  { color: [0, 1, 0.53], opacity: 0.5 },
  // vertex shader
  `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  // fragment shader
  `
    uniform vec3 color;
    uniform float opacity;
    varying vec2 vUv;
    void main() {
      float alpha = opacity * (1.0 - vUv.y);
      gl_FragColor = vec4(color, alpha);
    }
  `
)

extend({ GradientCylinderMaterial })

declare module '@react-three/fiber' {
  interface ThreeElements {
    gradientCylinderMaterial: React.JSX.IntrinsicElements['shaderMaterial']
  }
}

export interface SpawnPointProps {
  /** スポーン位置 [x, y, z] */
  position?: [number, number, number]
  /** スポーン時の向き（度数法 0-360） */
  yaw?: number
}

/**
 * ワールド内のリスポーン地点を指定するコンポーネント
 * ワールド作成者がこのコンポーネントを配置することで、
 * プラットフォーム側がプレイヤーのスポーン位置を取得できる
 *
 * @example
 * // ワールド側での使用例
 * <SpawnPoint position={[0, 0, 5]} yaw={180} />
 *
 * @note
 * - 開発時（import.meta.env.DEV === true）のみヘルパー表示が有効になります
 * - 本番ビルドにはヘルパーのコードが含まれません
 * - 1つのワールドに複数のSpawnPointがある場合、最後に設定されたものが有効になります
 */
export const SpawnPoint: FC<SpawnPointProps> = ({
  position = [0, 0, 0],
  yaw = 0,
}) => {
  const { setSpawnPoint } = useSpawnPointContext()
  const yawRad = (yaw * Math.PI) / 180

  useEffect(() => {
    setSpawnPoint({ position, yaw })
  }, [position, yaw, setSpawnPoint])

  // Vite以外の環境では import.meta.env が存在しない可能性があるため安全にアクセス
  const isDev = typeof import.meta !== 'undefined' && import.meta.env?.DEV
  if (!isDev) {
    return null
  }

  return (
    <group position={position}>
      {/* 半透明の円柱（下から上にかけて透明度が増す） */}
      <mesh position={[0, 0.375, 0]}>
        <cylinderGeometry args={[0.5, 0.5, 0.75, 32, 1, true]} />
        <gradientCylinderMaterial
          transparent
          side={DoubleSide}
          depthWrite={false}
        />
      </mesh>

      {/* 矢印（向きを示す） - yawに合わせて回転 */}
      <group rotation={[0, -yawRad, 0]}>
        {/* 矢印の軸 */}
        <mesh position={[0, 0.3, -0.1]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.03, 0.03, 0.3, 8]} />
          <meshBasicMaterial color="#00ff88" />
        </mesh>
        {/* 矢印の先端 */}
        <mesh position={[0, 0.3, 0.12]} rotation={[Math.PI / 2, 0, 0]}>
          <coneGeometry args={[0.08, 0.15, 8]} />
          <meshBasicMaterial color="#00ff88" />
        </mesh>
      </group>
    </group>
  )
}
