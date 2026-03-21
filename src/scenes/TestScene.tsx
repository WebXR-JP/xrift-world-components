import { useRef } from "react"
import { useFrame } from "@react-three/fiber"
import { CuboidCollider, RigidBody } from "@react-three/rapier"
import type { IntersectionEnterPayload } from "@react-three/rapier"
import type { Mesh } from "three"
import { Mirror } from "../components/Mirror"

const WARP_POINTS = [
  { position: [-5, 0, -5] as [number, number, number], destination: [5, 1, 5] as [number, number, number], color: "#4488ff" },
  { position: [5, 0, -5] as [number, number, number], destination: [-5, 1, -5] as [number, number, number], color: "#ff4488" },
] as const

function WarpPad({ position, destination, color }: { position: [number, number, number]; destination: [number, number, number]; color: string }) {
  const meshRef = useRef<Mesh>(null)

  useFrame((_state, delta) => {
    if (meshRef.current) {
      meshRef.current.rotation.y += delta * 2
    }
  })

  const handleIntersection = (payload: IntersectionEnterPayload) => {
    const rb = payload.other.rigidBody
    if (!rb) return
    rb.setTranslation({ x: destination[0], y: destination[1], z: destination[2] }, true)
    rb.setLinvel({ x: 0, y: 0, z: 0 }, true)
  }

  return (
    <group position={position}>
      {/* 見た目 */}
      <mesh ref={meshRef} position={[0, 0.5, 0]}>
        <torusGeometry args={[0.6, 0.1, 8, 24]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.5} />
      </mesh>
      {/* 当たり判定（センサー） */}
      <RigidBody type="fixed" position={[0, 0.5, 0]}>
        <CuboidCollider
          args={[0.8, 1, 0.8]}
          sensor
          onIntersectionEnter={handleIntersection}
        />
      </RigidBody>
    </group>
  )
}

/**
 * Mirror のテストシーン
 */
export function TestScene() {
  return (
    <>
      <ambientLight intensity={0.5} />
      <directionalLight position={[5, 5, 5]} intensity={1} />

      {/* ミラー（奥） */}
      <Mirror position={[0, 1.5, -3]} size={[3, 2]} />

      {/* 反射確認用のボックス */}
      <mesh position={[0, 0.5, 0]}>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial color="tomato" />
      </mesh>

      {/* ワープポイント */}
      {WARP_POINTS.map((wp, i) => (
        <WarpPad key={i} position={wp.position} destination={wp.destination} color={wp.color} />
      ))}

      {/* 床 */}
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[20, 20]} />
        <meshStandardMaterial color="#888" />
      </mesh>
    </>
  )
}
