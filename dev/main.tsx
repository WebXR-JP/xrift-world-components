import { useRef } from 'react'
import { createRoot } from 'react-dom/client'
import { useFrame } from '@react-three/fiber'
import { RigidBody } from '@react-three/rapier'
import { DevEnvironment } from '../src/components/DevEnvironment'
import { SpawnPoint } from '../src/components/SpawnPoint'
import { TextInputProvider, createDefaultTextInputImplementation } from '../src/contexts/TextInputContext'
import { TestScene } from '../src/scenes/TestScene'
import { useUsers } from '../src/contexts/UsersContext'

const textInput = createDefaultTextInputImplementation()

function Floor() {
  return (
    <RigidBody type="fixed">
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[50, 50]} />
        <meshStandardMaterial color="#444444" transparent opacity={0} />
      </mesh>
    </RigidBody>
  )
}

const debugOverlayStyle: React.CSSProperties = {
  position: 'fixed',
  top: 12,
  left: 12,
  padding: '8px 12px',
  background: 'rgba(0, 0, 0, 0.6)',
  color: '#fff',
  font: '12px/1.5 ui-monospace, SFMono-Regular, Menlo, monospace',
  borderRadius: 4,
  pointerEvents: 'none',
  whiteSpace: 'pre',
  zIndex: 1000,
}

function MovementDebugReader({
  targetRef,
}: {
  targetRef: React.RefObject<HTMLPreElement>
}) {
  const { getLocalMovement, localUser } = useUsers()
  useFrame(() => {
    if (!targetRef.current) return
    const m = getLocalMovement()
    const fmt = (n: number) => n.toFixed(2)
    targetRef.current.textContent = [
      `user      : ${localUser?.displayName ?? 'null'} (${localUser?.id ?? 'null'})`,
      `position  : x=${fmt(m.position.x)} y=${fmt(m.position.y)} z=${fmt(m.position.z)}`,
      `direction : x=${fmt(m.direction.x)} z=${fmt(m.direction.z)}`,
      `speed     : h=${fmt(m.horizontalSpeed)} v=${fmt(m.verticalSpeed)}`,
      `rotation  : yaw=${fmt(m.rotation.yaw)} pitch=${fmt(m.rotation.pitch)}`,
      `grounded  : ${m.isGrounded}`,
      `jumping   : ${m.isJumping}`,
    ].join('\n')
  })
  return null
}

function App() {
  const debugRef = useRef<HTMLPreElement>(null)
  return (
    <>
      <DevEnvironment>
        <ambientLight intensity={1} />
        <directionalLight position={[5, 10, 5]} intensity={1} castShadow />
        <TextInputProvider value={textInput}>
          <Floor />
          <SpawnPoint position={[5, 0, 5]} yaw={180} />
          <TestScene />
          <MovementDebugReader targetRef={debugRef} />
        </TextInputProvider>
      </DevEnvironment>
      <pre ref={debugRef} style={debugOverlayStyle} />
    </>
  )
}

createRoot(document.getElementById('root')!).render(<App />)
