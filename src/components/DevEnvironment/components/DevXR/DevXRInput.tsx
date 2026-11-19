import { useRef } from 'react'
import type { MutableRefObject, RefObject } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { useXR, useXRInputSourceState } from '@react-three/xr'
import { Euler, Matrix4, Quaternion, Raycaster, Vector3 } from 'three'
import type { Group, Object3D } from 'three'
import { useXRift } from '../../../../contexts/XRiftContext'
import { LAYERS } from '../../../../constants/layers'
import { INTERACT_DISTANCE } from '../../constants'
import { invokeInteract } from '../../utils'
import { SNAP_ANGLE_DEG, XR_BUTTON } from './constants'
import type { DevVRInput } from './types'
import { nextSnapTurn, normalizeAngle, rayFromPose, readStick, type SnapTurnState } from './utils'

interface Props {
  /** PhysicsPlayer へ渡す移動・ジャンプの入力（毎フレーム書き込む） */
  inputRef: MutableRefObject<DevVRInput>
  /** スナップ回転で回す XROrigin */
  originRef: RefObject<Group | null>
  /** false を返す間はトリガーでインタラクトしない（物を掴んでいる間） */
  canInteract: () => boolean
}

const SNAP_ANGLE_RAD = (SNAP_ANGLE_DEG * Math.PI) / 180

/**
 * DevEnvironment の VR 入力（本番の VRInputHandler・VRInteractionHandler の割り当てに合わせる）
 * - 左スティック: 移動（PhysicsPlayer が体を動かす）
 * - 右スティック左右: スナップ回転（XROrigin を回す）
 * - 右 A: ジャンプ
 * - トリガー: そのコントローラーのレイの先の Interactable を押す
 */
export function DevXRInput({ inputRef, originRef, canInteract }: Props) {
  const session = useXR((s) => s.session)
  const { gl, camera } = useThree()
  const { interactableObjects } = useXRift()
  const left = useXRInputSourceState('controller', 'left')
  const right = useXRInputSourceState('controller', 'right')

  const snapRef = useRef<SnapTurnState>({ armed: true })
  const triggerDownRef = useRef({ left: false, right: false })
  const raycasterRef = useRef(new Raycaster())
  const poseMatrixRef = useRef(new Matrix4())
  const worldMatrixRef = useRef(new Matrix4())
  const positionRef = useRef(new Vector3())
  const directionRef = useRef(new Vector3())
  const eulerRef = useRef(new Euler(0, 0, 0, 'YXZ'))
  const quatRef = useRef(new Quaternion())
  // VR に入る直前の画面の向き。入ったら、その方角を向いたまま VR が始まるように XROrigin を回す
  const desktopYawRef = useRef(0)
  // VR の中で最後に向いていた方角。出たら、画面のカメラをその方角へ向ける
  const vrHeadYawRef = useRef(0)
  const wasInVRRef = useRef(false)

  const interactFrom = (inputSource: XRInputSource, origin: Object3D) => {
    const frame = gl.xr.getFrame()
    const referenceSpace = gl.xr.getReferenceSpace()
    if (!frame || !referenceSpace) return
    let pose: XRPose | undefined
    try {
      pose = frame.getPose(inputSource.targetRaySpace, referenceSpace)
    } catch {
      // セッションに入り直した直後は古い XRSpace が残っていることがある
      return
    }
    if (!pose) return
    poseMatrixRef.current.fromArray(pose.transform.matrix)
    rayFromPose(
      poseMatrixRef.current,
      origin.matrixWorld,
      positionRef.current,
      directionRef.current,
      worldMatrixRef.current,
    )
    const raycaster = raycasterRef.current
    raycaster.set(positionRef.current, directionRef.current)
    raycaster.far = INTERACT_DISTANCE
    raycaster.layers.set(LAYERS.INTERACTABLE)
    const hits = raycaster.intersectObjects(Array.from(interactableObjects), true)
    invokeInteract(hits[0]?.object ?? null)
  }

  // トリガーの押し始めでインタラクトする
  const handleTrigger = (hand: 'left' | 'right', gamepad: Gamepad | undefined, inputSource: XRInputSource, origin: Object3D) => {
    const pressed = gamepad?.buttons[XR_BUTTON.TRIGGER]?.pressed ?? false
    const wasPressed = triggerDownRef.current[hand]
    triggerDownRef.current[hand] = pressed
    if (!pressed || wasPressed) return
    if (!canInteract()) return
    interactFrom(inputSource, origin)
  }

  useFrame(() => {
    const input = inputRef.current
    const origin = originRef.current
    if (!session || !origin) {
      input.moveX = 0
      input.moveY = 0
      input.jump = false
      if (wasInVRRef.current) {
        wasInVRRef.current = false
        camera.quaternion.setFromEuler(eulerRef.current.set(0, vrHeadYawRef.current, 0))
      }
      desktopYawRef.current = eulerRef.current.setFromQuaternion(camera.quaternion, 'YXZ').y
      return
    }
    if (!wasInVRRef.current) {
      wasInVRRef.current = true
      // VR 中のカメラは XROrigin の子なので、quaternion は XROrigin から見た頭の向き
      const headYaw = eulerRef.current.setFromQuaternion(camera.quaternion, 'YXZ').y
      origin.rotation.set(0, normalizeAngle(desktopYawRef.current - headYaw), 0)
    }

    vrHeadYawRef.current = eulerRef.current.setFromQuaternion(
      camera.getWorldQuaternion(quatRef.current),
      'YXZ',
    ).y

    const leftPad = left?.inputSource.gamepad
    const rightPad = right?.inputSource.gamepad

    const move = leftPad ? readStick(leftPad.axes) : { x: 0, y: 0 }
    input.moveX = move.x
    input.moveY = move.y
    input.jump = rightPad?.buttons[XR_BUTTON.PRIMARY]?.pressed ?? false

    const turnStick = rightPad ? readStick(rightPad.axes).x : 0
    const snap = nextSnapTurn(turnStick, snapRef.current)
    snapRef.current = snap.state
    if (snap.turn !== 0) origin.rotation.y += snap.turn * SNAP_ANGLE_RAD

    origin.updateMatrixWorld()
    if (left) handleTrigger('left', leftPad, left.inputSource, origin)
    if (right) handleTrigger('right', rightPad, right.inputSource, origin)
  })

  return null
}
