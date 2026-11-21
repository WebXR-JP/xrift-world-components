import { useCallback, useEffect, useRef } from 'react'
import type { MutableRefObject, RefObject } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { useXRStore } from '@react-three/xr'
import {
  CapsuleCollider,
  CuboidCollider,
  RigidBody,
} from '@react-three/rapier'
import type { RapierRigidBody } from '@react-three/rapier'
import { Euler, Quaternion, Vector3 } from 'three'
import type { Camera, Group, Mesh } from 'three'
import { useSpawnPoint } from '../../../hooks/useSpawnPoint'
import { LAYERS } from '../../../constants/layers'
import type { PlayerMovement } from '../../../types/movement'
import {
  PLAYER_HALF_HEIGHT,
  PLAYER_RADIUS,
  JUMP_VELOCITY,
  LINEAR_DAMPING,
  CAMERA_Y_OFFSET,
  DEV_AVATAR_HEIGHT,
  DEV_EYE_HEIGHT,
} from '../constants'
import { isGameKeyEvent } from '../utils'
import type { DevSeatStore } from './DevSeat/store'
import type { DevTeleportStore } from './DevTeleport/store'
import { toDevPlacementPose, type DevPlacementPose } from './DevTeleport/utils'
import type { DevVRInput } from './DevXR/types'
import {
  MAX_ROOM_SCALE_STEP,
  combineMoveIntent,
  horizontalBasisFromYaw,
  normalizeAngle,
  rotateYOffset,
} from './DevXR/utils'
import {
  DEV_SEAT_CAMERA_FORWARD_CLEARANCE,
  DEV_MAX_FRAME_DELTA,
  computeSeatedEyePosition,
  computeSeatedFeetPosition,
  estimateSeatOffsets,
  moveIntentFromKeys,
  toSeatControlInput,
  type DevSeatOffsets,
} from './DevSeat/utils'

interface Props {
  moveSpeed: number
  spawnPosition: [number, number, number]
  respawnThreshold: number
  allowInfiniteJump: boolean
  movementRef?: MutableRefObject<PlayerMovement>
  seatStore: DevSeatStore
  teleportStore: DevTeleportStore
  /** VR のコントローラーの入力（DevXRInput が毎フレーム書き込む） */
  vrInputRef: MutableRefObject<DevVRInput>
  /** VR 中に足元へ置く XROrigin（体の位置に合わせて毎フレーム動かす） */
  xrOriginRef: RefObject<Group | null>
}

/** RigidBody 原点（カプセル中心）から足元までの高さ */
const FEET_OFFSET_Y = PLAYER_HALF_HEIGHT + PLAYER_RADIUS
const IDENTITY_ROTATION = { x: 0, y: 0, z: 0, w: 1 }
const ZERO_VELOCITY = { x: 0, y: 0, z: 0 }

export function PhysicsPlayer({
  moveSpeed,
  spawnPosition,
  respawnThreshold,
  allowInfiniteJump,
  movementRef,
  seatStore,
  teleportStore,
  vrInputRef,
  xrOriginRef,
}: Props) {
  const rigidBodyRef = useRef<RapierRigidBody>(null)
  const avatarGroupRef = useRef<Group>(null)
  const headRef = useRef<Mesh>(null)
  const pressedKeysRef = useRef<Set<string>>(new Set())
  const isGroundedRef = useRef(false)
  const prevSpaceRef = useRef(false)
  const forwardRef = useRef(new Vector3())
  // 着席中の座席姿勢まわり（GC回避のため使い回す）
  const seatQuatRef = useRef(new Quaternion())
  const prevSeatQuatRef = useRef(new Quaternion())
  const invQuatRef = useRef(new Quaternion())
  const deltaQuatRef = useRef(new Quaternion())
  const lookQuatRef = useRef(new Quaternion())
  const eulerRef = useRef(new Euler(0, 0, 0, 'YXZ'))
  const prevSeatIdRef = useRef<string | null>(null)
  const seatedOffsetsRef = useRef<DevSeatOffsets | null>(null)
  const feetPosRef = useRef({ x: 0, y: 0, z: 0 })
  const eyePosRef = useRef({ x: 0, y: 0, z: 0 })
  // 体を置き直した（スポーン・リスポーン・テレポート）直後のフレームは跳ばせない。
  // 接地センサーの「離れた」は次の物理ステップまで届かないので、空中へ置いても接地したままに見える
  const justPlacedRef = useRef(false)
  // VR で前のフレームの頭の位置（XROrigin から見た水平位置）。実際に歩いた分だけ体を動かすのに使う
  const prevHeadLocalRef = useRef<{ x: number; z: number } | null>(null)

  const { camera } = useThree()
  const spawnPoint = useSpawnPoint()
  const xrStore = useXRStore()

  // カメラの向きを整える。ロール（座席の傾き）は必ず消す。
  // yaw を省略したらいまの方角のまま、resetPitch なら見上げ・見下ろしを水平に戻す
  // VR 中は頭の向きをヘッドセットが決めるので、向けたい方角へは XROrigin を回して合わせる
  const levelCamera = useCallback(
    (cam: Camera, yaw?: number, resetPitch = false) => {
      const origin = xrOriginRef.current
      if (xrStore.getState().session && origin) {
        if (yaw === undefined) return
        const headYaw = eulerRef.current.setFromQuaternion(
          cam.getWorldQuaternion(lookQuatRef.current),
          'YXZ',
        ).y
        origin.rotation.y = normalizeAngle(origin.rotation.y + yaw - headYaw)
        return
      }
      const euler = eulerRef.current.setFromQuaternion(cam.quaternion, 'YXZ')
      cam.quaternion.setFromEuler(euler.set(resetPitch ? 0 : euler.x, yaw ?? euler.y, 0))
    },
    [xrStore, xrOriginRef],
  )

  // VR 中か（XROrigin が使える状態か）
  const getVROrigin = useCallback(
    (): Group | null => (xrStore.getState().session ? xrOriginRef.current : null),
    [xrStore, xrOriginRef],
  )

  // VR 中は、頭がちょうど体（足元）の真上に来るよう XROrigin を置く。
  // 頭は XROrigin の中でずれている（部屋の中を歩く）ので、そのずれを差し引く。
  // こうしておくと、スナップ回転やテレポートの向き合わせも頭を中心に回る
  const syncVROrigin = useCallback(
    (origin: Group, cam: Camera, feet: { x: number; y: number; z: number }) => {
      const offset = rotateYOffset(cam.position.x, cam.position.z, origin.rotation.y)
      origin.position.set(feet.x - offset.x, feet.y, feet.z - offset.z)
    },
    [],
  )

  // 体を置き直す（スポーン・リスポーン・テレポートの共通処理）。
  // 本番と同じく、スポーン・リスポーンは視線を水平に戻し（resetPitch）、テレポートは保つ
  const placeBody = useCallback(
    (rb: RapierRigidBody, cam: Camera, pose: DevPlacementPose, resetPitch: boolean) => {
      rb.setTranslation(pose.bodyPosition, true)
      rb.setLinvel(ZERO_VELOCITY, true)
      justPlacedRef.current = true
      if (pose.yaw === undefined && !resetPitch) return
      levelCamera(cam, pose.yaw, resetPitch)
    },
    [levelCamera],
  )

  // 立ち上がる（降車・座席が消えた・テレポートの共通処理。本番の useRigidBodyMovement.leaveSeat に相当）。
  // 着席中は体とカメラを座席の姿勢に合わせて傾けているので、ここで必ずまっすぐに戻す
  const leaveSeat = useCallback(
    (rb: RapierRigidBody, cam: Camera) => {
      seatStore.standUp()
      prevSeatIdRef.current = null
      seatedOffsetsRef.current = null
      rb.setRotation(IDENTITY_ROTATION, true)
      levelCamera(cam)
    },
    [seatStore, levelCamera],
  )

  // SpawnPoint が登録されたらそこへ置く（SpawnPoint.position は足元の座標）。
  // カメラは依存に入れない。VR の出入りでカメラが差し替わるたびにスポーン地点へ戻されてしまう
  const getThree = useThree((state) => state.get)
  useEffect(() => {
    if (!spawnPoint) return
    const rb = rigidBodyRef.current
    if (!rb) return
    const pose = toDevPlacementPose(spawnPoint.position, spawnPoint.yaw, FEET_OFFSET_Y)
    placeBody(rb, getThree().camera, pose, true)
  }, [spawnPoint, getThree, placeBody])

  // アバターを三人称レイヤーに設定（一人称カメラには映らない）
  useEffect(() => {
    avatarGroupRef.current?.traverse((obj) => {
      obj.layers.set(LAYERS.THIRD_PERSON_ONLY)
    })
  }, [])

  useEffect(() => {
    const shouldHandle = isGameKeyEvent

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

  // 着席中は座席へ追従する（椅子でも乗り物でも同一パス）。
  // 本番（xrift-frontend の useRigidBodyMovement.handleSeatedFrame）と同順序:
  // 降車判定 → 操縦入力の委譲（onDrive が乗り物を動かす）→ 動かしたあとの座面に体を載せる。
  // このフレームを消費した（通常移動を行わない）とき true を返す
  const handleSeatedFrame = useCallback(
    (rb: RapierRigidBody, cam: Camera, delta: number): boolean => {
      const seatId = seatStore.getSeatId()
      if (!seatId) {
        prevSeatIdRef.current = null
        seatedOffsetsRef.current = null
        return false
      }
      const entry = seatStore.getSeat(seatId)
      if (!entry) {
        // 座席が消えた（アンマウント等）→ その場で立たせて通常移動に戻す
        leaveSeat(rb, cam)
        return false
      }

      const keys = pressedKeysRef.current
      const vr = vrInputRef.current
      const vrOrigin = getVROrigin()
      const spacePressed =
        keys.has('Space') || keys.has(' ') || keys.has('KeyE') || keys.has('e') || vr.jump

      // 着席した瞬間は押しっぱなしの Space を降車エッジとして拾わない
      if (prevSeatIdRef.current !== seatId) {
        prevSeatIdRef.current = seatId
        prevSpaceRef.current = spacePressed
        seatedOffsetsRef.current = estimateSeatOffsets(DEV_AVATAR_HEIGHT, DEV_EYE_HEIGHT)
        // 座った瞬間は座席の正面を向かせる（ピッチだけ維持）。
        // 向いていた方角のままにすると首だけねじれた姿勢になる
        const surface = entry.getSeatSurface()
        seatQuatRef.current.set(
          surface.quaternion.x,
          surface.quaternion.y,
          surface.quaternion.z,
          surface.quaternion.w,
        )
        if (vrOrigin) {
          // VR は頭の向きをヘッドセットが決めるので、XROrigin を回して座席の正面を向かせる
          const seatYaw = eulerRef.current.setFromQuaternion(seatQuatRef.current, 'YXZ').y
          const headYaw = eulerRef.current.setFromQuaternion(cam.quaternion, 'YXZ').y
          vrOrigin.rotation.y = normalizeAngle(seatYaw - headYaw)
        } else {
          eulerRef.current.setFromQuaternion(cam.quaternion, 'YXZ')
          cam.quaternion
            .copy(seatQuatRef.current)
            .multiply(lookQuatRef.current.setFromEuler(eulerRef.current.set(eulerRef.current.x, 0, 0)))
        }
        prevSeatQuatRef.current.copy(seatQuatRef.current)
      } else if (spacePressed && !prevSpaceRef.current) {
        // 降車（Space のエッジ）。足元を降車位置に置き、重力を復帰させる
        const exit = entry.getExitPosition()
        rb.setTranslation(
          { x: exit.x, y: exit.y + FEET_OFFSET_Y, z: exit.z },
          true,
        )
        rb.setLinvel(ZERO_VELOCITY, true)
        leaveSeat(rb, cam)
        prevSpaceRef.current = spacePressed
        return true
      }
      prevSpaceRef.current = spacePressed

      const offsets = seatedOffsetsRef.current
      if (!offsets) return false

      // 操縦入力の委譲。運転席に自分が座っている間だけ「どちらへ動かしたいか」を渡す。
      // **体を置く前に呼ぶ。** onDrive が乗り物を動かしたあとの座面に体を載せないと、
      // 1 コマ分だけ座面から遅れて座って見える。
      // delta は上限で丸める（タブ切り替え復帰時の大きな delta で乗り物が跳ばないように）
      const dt = Math.min(Math.max(delta, 0), DEV_MAX_FRAME_DELTA)
      const keyIntent = moveIntentFromKeys(keys)
      const driveIntent = combineMoveIntent(-(keyIntent.z + vr.moveY), keyIntent.x + vr.moveX)
      entry.onControlInput?.(toSeatControlInput({ x: driveIntent.strafe, z: -driveIntent.forward }), dt)

      // 座面の姿勢はこのフレームで1回だけ引く
      const surface = entry.getSeatSurface()
      seatQuatRef.current.set(
        surface.quaternion.x,
        surface.quaternion.y,
        surface.quaternion.z,
        surface.quaternion.w,
      )

      // 視点は座席と一緒に回す。PointerLockControls のマウスルックは残したまま、
      // 座席の回転差分だけカメラに足す（ユーザーの見回しと喧嘩しない）
      invQuatRef.current.copy(prevSeatQuatRef.current).invert()
      deltaQuatRef.current.copy(seatQuatRef.current).multiply(invQuatRef.current)
      if (vrOrigin) {
        // VR は座席の向きの変わった分（水平の回転）だけ XROrigin を回す
        vrOrigin.rotation.y = normalizeAngle(
          vrOrigin.rotation.y + eulerRef.current.setFromQuaternion(deltaQuatRef.current, 'YXZ').y,
        )
      } else {
        cam.quaternion.premultiply(deltaQuatRef.current)
      }
      prevSeatQuatRef.current.copy(seatQuatRef.current)

      // 腰を座面に載せる。傾いた座席では「座席の下方向」に足元を下げる
      const feet = computeSeatedFeetPosition(surface, offsets.hipOffset, feetPosRef.current)
      rb.setTranslation({ x: feet.x, y: feet.y + FEET_OFFSET_Y, z: feet.z }, true)
      rb.setLinvel({ x: 0, y: 0, z: 0 }, true)
      rb.setRotation(
        {
          x: seatQuatRef.current.x,
          y: seatQuatRef.current.y,
          z: seatQuatRef.current.z,
          w: seatQuatRef.current.w,
        },
        true,
      )

      // カメラは座面から組み立てる（腰から目までの高さ＋前方クリアランス）
      const eye = computeSeatedEyePosition(
        surface,
        offsets.eyeOffset - offsets.hipOffset,
        DEV_SEAT_CAMERA_FORWARD_CLEARANCE,
        eyePosRef.current,
      )
      if (vrOrigin) {
        // VR は座面（足元）に XROrigin を置き、目の高さはヘッドセットに任せる
        syncVROrigin(vrOrigin, cam, feet)
        prevHeadLocalRef.current = null
      } else {
        cam.position.set(eye.x, eye.y, eye.z)
      }

      // DummyAvatar も座席の姿勢そのまま（傾きも含む）
      if (avatarGroupRef.current) {
        avatarGroupRef.current.position.set(eye.x, eye.y, eye.z)
        avatarGroupRef.current.quaternion.copy(seatQuatRef.current)
      }

      // useUsers 用の PlayerMovement を更新（足元基準）
      if (movementRef) {
        const m = movementRef.current
        m.position.x = feet.x
        m.position.y = feet.y
        m.position.z = feet.z
        m.direction.x = 0
        m.direction.z = 0
        m.horizontalSpeed = 0
        m.verticalSpeed = 0
        cam.getWorldDirection(forwardRef.current)
        m.rotation.yaw = -Math.atan2(forwardRef.current.x, -forwardRef.current.z)
        m.rotation.pitch = Math.asin(forwardRef.current.y)
        m.isGrounded = true
        m.isJumping = false
      }
      return true
    },
    [seatStore, movementRef, leaveSeat, vrInputRef, getVROrigin, syncVROrigin],
  )

  // useTeleport() で預かった行き先へ体を動かす。
  // 本番（xrift-frontend の useRigidBodyMovement.handleTeleportRequest）と同じく、着席中なら立たせてから動かす
  // （座席追従がテレポート先を上書きしないように）。yaw は指定されたときだけ向きを変え、見上げ・見下ろしは保つ
  const handleTeleport = useCallback(
    (rb: RapierRigidBody, cam: Camera) => {
      const destination = teleportStore.take()
      if (!destination) return
      if (seatStore.getSeatId()) leaveSeat(rb, cam)
      placeBody(rb, cam, toDevPlacementPose(destination.position, destination.yaw, FEET_OFFSET_Y), false)
    },
    [teleportStore, seatStore, leaveSeat, placeBody],
  )

  useFrame(({ camera: frameCamera }, delta) => {
    const rb = rigidBodyRef.current
    if (!rb) return

    // テレポートを最優先で消化する（体を動かしたあと、このフレームの通常の処理を続ける）
    handleTeleport(rb, frameCamera)

    // 着席中は座席へ追従（WASD は歩行ではなく操縦入力になる）
    if (handleSeatedFrame(rb, frameCamera, delta)) return

    const keys = pressedKeysRef.current
    const vr = vrInputRef.current

    // --- 移動ベクトル算出（キーと VR の左スティックを足す） ---
    const intent = combineMoveIntent(
      (keys.has('KeyW') || keys.has('w') || keys.has('ArrowUp') ? 1 : 0) +
        (keys.has('KeyS') || keys.has('s') || keys.has('ArrowDown') ? -1 : 0) -
        vr.moveY,
      (keys.has('KeyD') || keys.has('d') || keys.has('ArrowRight') ? 1 : 0) +
        (keys.has('KeyA') || keys.has('a') || keys.has('ArrowLeft') ? -1 : 0) +
        vr.moveX,
    )
    const fwd = intent.forward
    const strafe = intent.strafe

    // 前と右は頭の向き（yaw）から作る（足元を見ていても向きが乱れない）
    const headYaw = eulerRef.current.setFromQuaternion(
      camera.getWorldQuaternion(lookQuatRef.current),
      'YXZ',
    ).y
    const basis = horizontalBasisFromYaw(headYaw)

    // 入力の長さは combineMoveIntent で 1 以下にしてある（スティックを浅く倒せば遅く歩く）
    let moveX = (basis.forward.x * fwd + basis.right.x * strafe) * moveSpeed
    let moveZ = (basis.forward.z * fwd + basis.right.z * strafe) * moveSpeed

    // VR で部屋の中を実際に歩いた分だけ、体も動かす（壁は物理で止まり、頭は体の上へ戻される）
    const vrOrigin = getVROrigin()
    if (vrOrigin) {
      const head = { x: camera.position.x, z: camera.position.z }
      const prev = prevHeadLocalRef.current
      prevHeadLocalRef.current = head
      if (prev) {
        const dx = head.x - prev.x
        const dz = head.z - prev.z
        if (Math.sqrt(dx * dx + dz * dz) <= MAX_ROOM_SCALE_STEP) {
          const step = rotateYOffset(dx, dz, vrOrigin.rotation.y)
          const dt = Math.max(delta, 1 / 240)
          moveX += step.x / dt
          moveZ += step.z / dt
        }
      }
    } else {
      prevHeadLocalRef.current = null
    }
    const len = Math.sqrt(moveX * moveX + moveZ * moveZ)

    // --- ジャンプ ---
    const currentVel = rb.linvel()
    const spacePressed =
      keys.has('Space') || keys.has(' ') || keys.has('KeyE') || keys.has('e') || vr.jump
    let vy = currentVel.y

    if (allowInfiniteJump) {
      if (spacePressed) {
        vy = JUMP_VELOCITY
      }
    } else {
      const spaceEdge = spacePressed && !prevSpaceRef.current
      if (spaceEdge && isGroundedRef.current && !justPlacedRef.current) {
        vy = JUMP_VELOCITY
      }
    }
    prevSpaceRef.current = spacePressed
    justPlacedRef.current = false

    rb.setLinvel({ x: moveX, y: vy, z: moveZ }, true)

    // --- カメラ位置同期 ---
    // VR 中はヘッドセットが頭の位置を決めるので、XROrigin（足元）を体に合わせる
    const pos = rb.translation()
    if (vrOrigin) {
      syncVROrigin(vrOrigin, camera, { x: pos.x, y: pos.y - FEET_OFFSET_Y, z: pos.z })
    } else {
      camera.position.set(pos.x, pos.y + CAMERA_Y_OFFSET, pos.z)
    }

    // --- DummyAvatar 位置同期 ---
    camera.getWorldDirection(forwardRef.current)
    const yaw = -Math.atan2(forwardRef.current.x, -forwardRef.current.z)
    const pitch = Math.asin(forwardRef.current.y)
    if (avatarGroupRef.current) {
      avatarGroupRef.current.position.set(
        pos.x,
        pos.y + CAMERA_Y_OFFSET,
        pos.z,
      )
      avatarGroupRef.current.rotation.set(0, yaw, 0)
      if (headRef.current) {
        headRef.current.rotation.set(pitch, 0, 0)
      }
    }

    // --- useUsers 用の PlayerMovement を更新（足元基準） ---
    if (movementRef) {
      const m = movementRef.current
      m.position.x = pos.x
      m.position.y = pos.y - (PLAYER_HALF_HEIGHT + PLAYER_RADIUS)
      m.position.z = pos.z
      if (len > 0) {
        m.direction.x = moveX / len
        m.direction.z = moveZ / len
        m.horizontalSpeed = len
      } else {
        m.direction.x = 0
        m.direction.z = 0
        m.horizontalSpeed = 0
      }
      m.verticalSpeed = vy
      m.rotation.yaw = yaw
      m.rotation.pitch = pitch
      m.isGrounded = isGroundedRef.current
      m.isJumping = !isGroundedRef.current && vy > 0
    }

    // --- リスポーン ---
    if (pos.y < respawnThreshold) {
      if (spawnPoint) {
        placeBody(rb, camera, toDevPlacementPose(spawnPoint.position, spawnPoint.yaw, FEET_OFFSET_Y), true)
      } else {
        // spawnPosition は RigidBody の初期位置（カプセル中心）なので、そのまま置く。向きは変えない
        const [x, y, z] = spawnPosition
        placeBody(rb, camera, { bodyPosition: { x, y, z }, yaw: undefined }, false)
      }
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
        <mesh castShadow position={[0, -DEV_AVATAR_HEIGHT * 0.55, 0]}>
          <boxGeometry args={[0.3, DEV_AVATAR_HEIGHT, 0.1]} />
          <meshLambertMaterial color="#ccffcc" />
        </mesh>
      </group>
    </>
  )
}
