import { Skybox } from '../components/Skybox'
import { SpawnPoint } from '../components/SpawnPoint'
import { SpawnPointProvider } from '../contexts/SpawnPointContext'

/**
 * SpawnPointのテストシーン
 * Triplexでコンポーネントを確認するためのシーン
 */
export function SpawnPointTestScene() {
  return (
    <SpawnPointProvider>
      {/* 空 */}
      <Skybox />

      {/* 照明 */}
      <ambientLight intensity={0.5} />
      <directionalLight position={[5, 10, 5]} intensity={1} />

      {/* 床 */}
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, 0, 0]}
        receiveShadow
        name="Floor"
      >
        <planeGeometry args={[20, 20]} />
        <meshStandardMaterial color="#cccccc" />
      </mesh>

      {/* SpawnPoint - デフォルト位置 */}
      <SpawnPoint position={[0, 0, 0]} yaw={0} />

      {/* SpawnPoint - 別の位置と向き */}
      <SpawnPoint position={[3, 0, 3]} yaw={45} />

      {/* SpawnPoint - 後ろ向き */}
      <SpawnPoint position={[-3, 0, 3]} yaw={180} />

      {/* 参照用のキューブ（比較用） */}
      <mesh position={[0, 0.5, -3]} name="ReferenceCube">
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial color="orange" />
      </mesh>
    </SpawnPointProvider>
  )
}
