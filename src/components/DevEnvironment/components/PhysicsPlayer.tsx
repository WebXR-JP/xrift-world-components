import { useEffect, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import {
  CapsuleCollider,
  CuboidCollider,
  RigidBody,
} from '@react-three/rapier'
import type { RapierRigidBody } from '@react-three/rapier'
import { Vector3 } from 'three'
import type { Group, Mesh } from 'three'
import { LAYERS } from '../../../constants/layers'
import {
  PLAYER_HALF_HEIGHT,
  PLAYER_RADIUS,
  JUMP_VELOCITY,
  LINEAR_DAMPING,
  CAMERA_Y_OFFSET,
} from '../constants'

interface Props {
  moveSpeed: number
  spawnPosition: [number, number, number]
  respawnThreshold: number
  allowInfiniteJump: boolean
}

const DUMMY_AVATAR_HEIGHT = 1.5

export function PhysicsPlayer({
  moveSpeed,
  spawnPosition,
  respawnThreshold,
  allowInfiniteJump,
}: Props) {
  const rigidBodyRef = useRef<RapierRigidBody>(null)
  const avatarGroupRef = useRef<Group>(null)
  const headRef = useRef<Mesh>(null)
  const pressedKeysRef = useRef<Set<string>>(new Set())
  const isGroundedRef = useRef(false)
  const prevSpaceRef = useRef(false)
  const forwardRef = useRef(new Vector3())
  const rightRef = useRef(new Vector3())

  const { camera } = useThree()

  // アバターを三人称レイヤーに設定（一人称カメラには映らない）
  useEffect(() => {
    avatarGroupRef.current?.traverse((obj) => {
      obj.layers.set(LAYERS.THIRD_PERSON_ONLY)
    })
  }, [])

  useEffect(() => {
    const shouldHandle = (event: KeyboardEvent) => {
      if (event.isComposing) return false
      const target = event.target as HTMLElement
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable
      ) return false
      return true
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (!shouldHandle(event)) return
      const code = event.code
      if (!pressedKeysRef.current.has(code)) {
        pressedKeysRef.current.add(code)
      }
      if (event.key) {
        pressedKeysRef.current.add(event.key)
      }
      event.preventDefault()
      event.stopPropagation()
      event.stopImmediatePropagation()
    }

    const handleKeyUp = (event: KeyboardEvent) => {
      if (!shouldHandle(event)) return
      pressedKeysRef.current.delete(event.code)
      if (event.key) {
        pressedKeysRef.current.delete(event.key)
      }
      event.preventDefault()
      event.stopPropagation()
      event.stopImmediatePropagation()
    }

    const options = { passive: false, capture: true }
    window.addEventListener('keydown', handleKeyDown, options)
    window.addEventListener('keyup', handleKeyUp, options)

    return () => {
      window.removeEventListener('keydown', handleKeyDown, options)
      window.removeEventListener('keyup', handleKeyUp, options)
    }
  }, [])

  useFrame(() => {
    const rb = rigidBodyRef.current
    if (!rb) return

    const keys = pressedKeysRef.current

    // --- 移動ベクトル算出 ---
    const fwd =
      (keys.has('KeyW') || keys.has('w') || keys.has('ArrowUp') ? 1 : 0) +
      (keys.has('KeyS') || keys.has('s') || keys.has('ArrowDown') ? -1 : 0)
    const strafe =
      (keys.has('KeyD') || keys.has('d') || keys.has('ArrowRight') ? 1 : 0) +
      (keys.has('KeyA') || keys.has('a') || keys.has('ArrowLeft') ? -1 : 0)

    camera.getWorldDirection(forwardRef.current)
    forwardRef.current.y = 0
    forwardRef.current.normalize()
    rightRef.current.crossVectors(forwardRef.current, camera.up).normalize()

    let moveX = forwardRef.current.x * fwd + rightRef.current.x * strafe
    let moveZ = forwardRef.current.z * fwd + rightRef.current.z * strafe
    const len = Math.sqrt(moveX * moveX + moveZ * moveZ)
    if (len > 0) {
      moveX = (moveX / len) * moveSpeed
      moveZ = (moveZ / len) * moveSpeed
    }

    // --- ジャンプ ---
    const currentVel = rb.linvel()
    const spacePressed =
      keys.has('Space') || keys.has(' ') || keys.has('KeyE') || keys.has('e')
    let vy = currentVel.y

    if (allowInfiniteJump) {
      if (spacePressed) {
        vy = JUMP_VELOCITY
      }
    } else {
      const spaceEdge = spacePressed && !prevSpaceRef.current
      if (spaceEdge && isGroundedRef.current) {
        vy = JUMP_VELOCITY
      }
    }
    prevSpaceRef.current = spacePressed

    rb.setLinvel({ x: moveX, y: vy, z: moveZ }, true)

    // --- カメラ位置同期 ---
    const pos = rb.translation()
    camera.position.set(pos.x, pos.y + CAMERA_Y_OFFSET, pos.z)

    // --- DummyAvatar 位置同期 ---
    if (avatarGroupRef.current) {
      avatarGroupRef.current.position.set(
        pos.x,
        pos.y + CAMERA_Y_OFFSET,
        pos.z,
      )
      camera.getWorldDirection(forwardRef.current)
      const yaw = -Math.atan2(forwardRef.current.x, -forwardRef.current.z)
      const pitch = Math.asin(forwardRef.current.y)
      avatarGroupRef.current.rotation.set(0, yaw, 0)
      if (headRef.current) {
        headRef.current.rotation.set(pitch, 0, 0)
      }
    }

    // --- リスポーン ---
    if (pos.y < respawnThreshold) {
      rb.setTranslation(
        { x: spawnPosition[0], y: spawnPosition[1], z: spawnPosition[2] },
        true,
      )
      rb.setLinvel({ x: 0, y: 0, z: 0 }, true)
    }
  })

  return (
    <>
      <RigidBody
        ref={rigidBodyRef}
        type="dynamic"
        position={spawnPosition}
        lockRotations
        friction={0}
        restitution={0}
        linearDamping={LINEAR_DAMPING}
        enabledRotations={[false, false, false]}
      >
        <CapsuleCollider args={[PLAYER_HALF_HEIGHT, PLAYER_RADIUS]} />
        <CuboidCollider
          args={[PLAYER_RADIUS * 0.9, 0.05, PLAYER_RADIUS * 0.9]}
          position={[0, -(PLAYER_HALF_HEIGHT + PLAYER_RADIUS), 0]}
          sensor
          onIntersectionEnter={() => {
            isGroundedRef.current = true
          }}
          onIntersectionExit={() => {
            isGroundedRef.current = false
          }}
        />
      </RigidBody>

      {/* DummyAvatar - RigidBody 外に配置し useFrame で位置同期 */}
      <group ref={avatarGroupRef}>
        <mesh castShadow ref={headRef}>
          <boxGeometry args={[0.2, 0.1, 0.2]} />
          <meshLambertMaterial color="#ffcccc" />
        </mesh>
        <mesh castShadow position={[0, -DUMMY_AVATAR_HEIGHT * 0.55, 0]}>
          <boxGeometry args={[0.3, DUMMY_AVATAR_HEIGHT, 0.1]} />
          <meshLambertMaterial color="#ccffcc" />
        </mesh>
      </group>
    </>
  )
}
