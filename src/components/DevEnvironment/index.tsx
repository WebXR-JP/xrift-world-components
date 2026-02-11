import { useCallback, useEffect, useState } from 'react'
import { Canvas } from '@react-three/fiber'
import { PointerLockControls } from '@react-three/drei'
import { Physics } from '@react-three/rapier'
import { PCFShadowMap } from 'three'
import type { Props } from './types'
import {
  DEFAULT_SPAWN_POSITION,
  DEFAULT_GRAVITY,
  DEFAULT_ALLOW_INFINITE_JUMP,
  MOVE_SPEED,
  RESPAWN_Y_THRESHOLD,
} from './constants'
import { PhysicsPlayer } from './components/PhysicsPlayer'
import { CenterRaycaster } from './components/CenterRaycaster'
import { Crosshair } from './components/Crosshair'
import { PointerLockStatus } from './components/PointerLockStatus'
import { ControlsHelp } from './components/ControlsHelp'

export type DevEnvironmentProps = Props

const containerStyle: React.CSSProperties = {
  width: '100vw',
  height: '100vh',
  position: 'relative',
}

export function DevEnvironment({
  children,
  camera,
  moveSpeed = MOVE_SPEED,
  shadows = true,
  spawnPosition = DEFAULT_SPAWN_POSITION,
  respawnThreshold = RESPAWN_Y_THRESHOLD,
  physicsConfig,
}: Props) {
  const [isHit, setIsHit] = useState(false)
  const [isPointerLocked, setIsPointerLocked] = useState(false)
  const handleHitChange = useCallback((hit: boolean) => setIsHit(hit), [])

  const gravity = physicsConfig?.gravity ?? DEFAULT_GRAVITY
  const allowInfiniteJump =
    physicsConfig?.allowInfiniteJump ?? DEFAULT_ALLOW_INFINITE_JUMP

  const cameraPosition = camera?.position ?? spawnPosition
  const cameraFov = camera?.fov ?? 50

  useEffect(() => {
    const handleChange = () => {
      setIsPointerLocked(document.pointerLockElement !== null)
    }
    document.addEventListener('pointerlockchange', handleChange)
    return () => {
      document.removeEventListener('pointerlockchange', handleChange)
    }
  }, [])

  return (
    <div style={containerStyle}>
      <Canvas
        shadows={shadows ? { type: PCFShadowMap } : false}
        camera={{
          position: cameraPosition,
          fov: cameraFov,
          near: 0.01,
          far: 1000,
        }}
        gl={{ preserveDrawingBuffer: true }}
      >
        <PointerLockControls />
        <CenterRaycaster onHitChange={handleHitChange} />
        <Physics gravity={[0, -gravity, 0]} timeStep="vary">
          <PhysicsPlayer
            moveSpeed={moveSpeed}
            spawnPosition={spawnPosition}
            respawnThreshold={respawnThreshold}
            allowInfiniteJump={allowInfiniteJump}
          />
          {children}
        </Physics>
      </Canvas>
      <Crosshair active={isHit} />
      <PointerLockStatus isLocked={isPointerLocked} />
      <ControlsHelp />
    </div>
  )
}
