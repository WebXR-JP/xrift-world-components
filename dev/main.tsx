import { createRoot } from 'react-dom/client'
import { RigidBody } from '@react-three/rapier'
import { DevEnvironment } from '../src/components/DevEnvironment'
import { SpawnPoint } from '../src/components/SpawnPoint'
import { TextInputProvider, createDefaultTextInputImplementation } from '../src/contexts/TextInputContext'
import { TestScene } from '../src/scenes/TestScene'

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

function App() {
  return (
    <DevEnvironment>
      <ambientLight intensity={1} />
      <directionalLight position={[5, 10, 5]} intensity={1} castShadow />
      <TextInputProvider value={textInput}>
        <Floor />
        <SpawnPoint position={[5, 0, 5]} yaw={180} />
        <TestScene />
      </TextInputProvider>
    </DevEnvironment>
  )
}

createRoot(document.getElementById('root')!).render(<App />)
