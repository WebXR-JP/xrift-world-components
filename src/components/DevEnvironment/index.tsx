import { useCallback, useMemo, useRef, useState, useSyncExternalStore } from 'react'
import { Canvas } from '@react-three/fiber'
import { PointerLockControls } from '@react-three/drei'
import { Physics } from '@react-three/rapier'
import { GrabbableProvider } from '../../contexts/GrabbableContext'
import { SpawnPointProvider } from '../../contexts/SpawnPointContext'
import { UsersProvider, type UsersContextValue, type User } from '../../contexts/UsersContext'
import { XRiftContext, type XRiftContextValue } from '../../contexts/XRiftContext'
import type { PlayerMovement } from '../../types/movement'
import type { AvatarHeight } from '../../types/avatar'
import { PCFShadowMap, type Object3D } from 'three'
import type { Props } from './types'
import { toThreeOutputBufferType } from './utils'
import {
  DEFAULT_SPAWN_POSITION,
  DEFAULT_GRAVITY,
  DEFAULT_ALLOW_INFINITE_JUMP,
  DEFAULT_CAMERA_NEAR,
  DEFAULT_CAMERA_FAR,
  MOVE_SPEED,
  RESPAWN_Y_THRESHOLD,
  DEV_LOCAL_USER_ID,
  DEV_LOCAL_USER_DISPLAY_NAME,
  DEV_AVATAR_HEIGHT,
  DEV_EYE_HEIGHT,
} from './constants'
import { PhysicsPlayer } from './components/PhysicsPlayer'
import { GrabSystem } from './components/GrabSystem'
import { createDevGrabStore } from './components/GrabSystem/store'
import { CenterRaycaster } from './components/CenterRaycaster'
import { Crosshair } from './components/Crosshair'
import { PointerLockStatus } from './components/PointerLockStatus'
import { ControlsHelp } from './components/ControlsHelp'

const DEV_LOCAL_USER: User = {
  id: DEV_LOCAL_USER_ID,
  displayName: DEV_LOCAL_USER_DISPLAY_NAME,
  avatarUrl: null,
  isGuest: true,
}

const DEV_LOCAL_AVATAR_HEIGHT: AvatarHeight = {
  height: DEV_AVATAR_HEIGHT,
  eyeHeight: DEV_EYE_HEIGHT,
}

const EMPTY_REMOTE_USERS: User[] = []

export type DevEnvironmentProps = Props

const containerStyle: React.CSSProperties = {
  width: '100vw',
  height: '100vh',
  position: 'relative',
}

function subscribePointerLock(listener: () => void): () => void {
  document.addEventListener('pointerlockchange', listener)
  return () => {
    document.removeEventListener('pointerlockchange', listener)
  }
}

function getPointerLockSnapshot(): boolean {
  return document.pointerLockElement !== null
}

export function DevEnvironment({
  children,
  camera,
  moveSpeed = MOVE_SPEED,
  shadows = true,
  spawnPosition = DEFAULT_SPAWN_POSITION,
  respawnThreshold = RESPAWN_Y_THRESHOLD,
  physicsConfig,
  outputBufferType: outputBufferTypeStr,
}: Props) {
  const [isHit, setIsHit] = useState(false)
  // ローカル掴みストア（<Grabbable> の登録先 & 開発プレビュー用 GrabSystem の状態）
  const [grabStore] = useState(createDevGrabStore)
  const isPointerLocked = useSyncExternalStore(
    subscribePointerLock,
    getPointerLockSnapshot,
    () => false,
  )
  const handleHitChange = useCallback((hit: boolean) => setIsHit(hit), [])

  // ローカルユーザーの位置情報を保持する ref。PhysicsPlayer が毎フレーム書き込み、
  // useUsers().getLocalMovement() がここから読み取る（再レンダリングは発生しない）
  const localMovementRef = useRef<PlayerMovement>({
    position: { x: spawnPosition[0], y: spawnPosition[1], z: spawnPosition[2] },
    direction: { x: 0, z: 0 },
    horizontalSpeed: 0,
    verticalSpeed: 0,
    rotation: { yaw: 0, pitch: 0 },
    isGrounded: true,
    isJumping: false,
  })

  const usersImplementation = useMemo<UsersContextValue>(
    () => ({
      localUser: DEV_LOCAL_USER,
      remoteUsers: EMPTY_REMOTE_USERS,
      getMovement: () => undefined,
      getLocalMovement: () => localMovementRef.current,
      getAvatarHeight: () => undefined,
      getLocalAvatarHeight: () => DEV_LOCAL_AVATAR_HEIGHT,
    }),
    [],
  )

  // Interactable の登録先（useXRift を使うコンポーネントを dev 環境で動かすため）
  const [interactableObjects] = useState(() => new Set<Object3D>())
  const registerInteractable = useCallback(
    (object: Object3D) => {
      interactableObjects.add(object)
    },
    [interactableObjects],
  )
  const unregisterInteractable = useCallback(
    (object: Object3D) => {
      interactableObjects.delete(object)
    },
    [interactableObjects],
  )
  const xriftContextValue = useMemo<XRiftContextValue>(
    () => ({
      baseUrl: '/',
      interactableObjects,
      registerInteractable,
      unregisterInteractable,
    }),
    [interactableObjects, registerInteractable, unregisterInteractable],
  )

  const gravity = physicsConfig?.gravity ?? DEFAULT_GRAVITY
  const allowInfiniteJump =
    physicsConfig?.allowInfiniteJump ?? DEFAULT_ALLOW_INFINITE_JUMP

  const outputBufferType = toThreeOutputBufferType(outputBufferTypeStr)
  const glProps = useMemo(
    () =>
      outputBufferType
        ? { preserveDrawingBuffer: true, stencil: true, outputBufferType }
        : { preserveDrawingBuffer: true, stencil: true },
    [outputBufferType],
  )

  const cameraPosition = camera?.position ?? spawnPosition
  const cameraFov = camera?.fov ?? 50
  const cameraNear = camera?.near ?? DEFAULT_CAMERA_NEAR
  const cameraFar = camera?.far ?? DEFAULT_CAMERA_FAR

  return (
    <div style={containerStyle}>
      <Canvas
        shadows={shadows ? { type: PCFShadowMap } : false}
        camera={{
          position: cameraPosition,
          fov: cameraFov,
          near: cameraNear,
          far: cameraFar,
        }}
        gl={glProps}
      >
        <PointerLockControls />
        <CenterRaycaster onHitChange={handleHitChange} />
        <Physics gravity={[0, -gravity, 0]} timeStep="vary">
          <XRiftContext.Provider value={xriftContextValue}>
            <SpawnPointProvider>
              <UsersProvider implementation={usersImplementation}>
                <GrabbableProvider implementation={grabStore.contextValue}>
                  <PhysicsPlayer
                    moveSpeed={moveSpeed}
                    spawnPosition={spawnPosition}
                    respawnThreshold={respawnThreshold}
                    allowInfiniteJump={allowInfiniteJump}
                    movementRef={localMovementRef}
                  />
                  <GrabSystem store={grabStore} />
                  {children}
                </GrabbableProvider>
              </UsersProvider>
            </SpawnPointProvider>
          </XRiftContext.Provider>
        </Physics>
      </Canvas>
      <Crosshair active={isHit} />
      <PointerLockStatus isLocked={isPointerLocked} />
      <ControlsHelp />
    </div>
  )
}
