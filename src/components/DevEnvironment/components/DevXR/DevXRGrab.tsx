import { useEffect, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { useXR, useXRInputSourceState } from '@react-three/xr'
import { Euler, Matrix4, type Object3D, Quaternion, Raycaster, Vector3 } from 'three'
import { LAYERS } from '../../../../constants/layers'
import {
  MAX_HOLD_DISTANCE,
  VR_GRIP_PRESS_THRESHOLD,
  VR_GRIP_RELEASE_THRESHOLD,
  VR_STICK_DEADZONE,
  VR_STICK_DISTANCE_SPEED,
  VR_TOUCH_RADIUS,
} from '../GrabSystem/constants'
import type { DevGrabHand, DevGrabStore } from '../GrabSystem/store'
import {
  clampVRHoldDistance,
  findFirstGrabbableId,
  findTouchedGrabbableId,
  nextGripPressed,
} from '../GrabSystem/utils'
import { CONTROLLER_POINTING_ANGLE, XR_AXIS, XR_BUTTON } from './constants'

interface Props {
  store: DevGrabStore
}

const HANDS: readonly DevGrabHand[] = ['left', 'right']
const CONTROLLER_FORWARD = new Vector3(0, 0, -1).applyEuler(new Euler(CONTROLLER_POINTING_ANGLE, 0, 0))

const _handPosition = new Vector3()
const _handQuaternion = new Quaternion()
const _direction = new Vector3()
const _inverseHand = new Matrix4()
const _objectPosition = new Vector3()
const _objectQuaternion = new Quaternion()
const _heldPosition = new Vector3()
const _heldQuaternion = new Quaternion()
const _euler = new Euler()

/**
 * DevEnvironment の VR で掴む（本番の VRGrabInputHandler と同じ操作）
 * - グリップを握る: 手で触れている物を掴む（手にくっつく）。無ければレイの先の物を掴む（手の先に浮く）
 * - グリップを離す: 確定して離す
 * - 持っている手のトリガー: 使う（押す＝onUseStart・離す＝onUseEnd）
 * - 右スティック上下: レイの先に浮かせている物を遠ざける・近づける
 * - VR を抜けたら持っている物を離す
 */
export function DevXRGrab({ store }: Props) {
  const session = useXR((s) => s.session)
  const scene = useThree((s) => s.scene)
  const left = useXRInputSourceState('controller', 'left')
  const right = useXRInputSourceState('controller', 'right')
  const gripRef = useRef<Record<DevGrabHand, boolean>>({ left: false, right: false })
  const triggerRef = useRef<Record<DevGrabHand, boolean>>({ left: false, right: false })
  const raycasterRef = useRef(new Raycaster())

  // VR の出入りで持ち方が合わなくなる物は、いまの位置で離す（本番と同じ）
  // - 抜けたら: VR で持っていた物（画面に戻ると手が無いので持ち続けられない）
  // - 入ったら: PC の視点の前で持っていた物（VR 中のカメラは XROrigin の子で、視点の前に置き続けられない）
  useEffect(() => {
    gripRef.current = { left: false, right: false }
    triggerRef.current = { left: false, right: false }
    const { phase, vrHold } = store.getState()
    if (phase !== 'holding') return
    if (session ? !vrHold : vrHold) store.release()
  }, [session, store])

  const tryGrab = (hand: DevGrabHand, controller: Object3D) => {
    controller.updateWorldMatrix(true, false)
    controller.getWorldPosition(_handPosition)
    controller.getWorldQuaternion(_handQuaternion)

    let mode: 'attached' | 'ray' = 'attached'
    let id = findTouchedGrabbableId(scene, _handPosition, VR_TOUCH_RADIUS)
    if (!id) {
      const raycaster = raycasterRef.current
      raycaster.layers.set(LAYERS.GRABBABLE)
      raycaster.set(_handPosition, _direction.copy(CONTROLLER_FORWARD).applyQuaternion(_handQuaternion))
      raycaster.far = MAX_HOLD_DISTANCE
      id = findFirstGrabbableId(raycaster.intersectObjects(scene.children, true))
      mode = 'ray'
    }
    if (!id) return
    const entry = store.getEntry(id)
    if (!entry) return

    const t = entry.getTransform()
    _objectPosition.set(t.position.x, t.position.y, t.position.z)
    _objectQuaternion.setFromEuler(_euler.set(t.rotation.x, t.rotation.y, t.rotation.z))
    const distance = clampVRHoldDistance(_objectPosition.distanceTo(_handPosition))
    // 手から見た物の位置・向き（手にくっつけたまま動かすのに使う）
    const offsetPosition = _objectPosition.clone().applyMatrix4(_inverseHand.copy(controller.matrixWorld).invert())
    const offsetQuaternion = _handQuaternion.clone().invert().multiply(_objectQuaternion)
    store.grabVR(id, hand, {
      mode,
      distance,
      offsetPosition: { x: offsetPosition.x, y: offsetPosition.y, z: offsetPosition.z },
      offsetQuaternion: {
        x: offsetQuaternion.x,
        y: offsetQuaternion.y,
        z: offsetQuaternion.z,
        w: offsetQuaternion.w,
      },
    })
  }

  // 持っている物を手元へ動かす
  const poseHeld = (controller: Object3D) => {
    const { grabbedId, vrHold, heldScale } = store.getState()
    if (!grabbedId || !vrHold) return
    const entry = store.getEntry(grabbedId)
    if (!entry) return

    controller.updateWorldMatrix(true, false)
    controller.getWorldPosition(_handPosition)
    controller.getWorldQuaternion(_handQuaternion)
    if (vrHold.mode === 'attached') {
      const o = vrHold.offsetPosition
      _heldPosition.set(o.x, o.y, o.z).applyMatrix4(controller.matrixWorld)
    } else {
      _direction.copy(CONTROLLER_FORWARD).applyQuaternion(_handQuaternion)
      _heldPosition.copy(_handPosition).addScaledVector(_direction, vrHold.distance)
    }
    const q = vrHold.offsetQuaternion
    _heldQuaternion.copy(_handQuaternion).multiply(_objectQuaternion.set(q.x, q.y, q.z, q.w))
    entry.setHeldPose(_heldPosition, _heldQuaternion, heldScale)
    _euler.setFromQuaternion(_heldQuaternion)
    store.updateHeldPose(
      { x: _heldPosition.x, y: _heldPosition.y, z: _heldPosition.z },
      { x: _euler.x, y: _euler.y, z: _euler.z },
    )
  }

  useFrame((_state, delta) => {
    if (!session) return

    for (const hand of HANDS) {
      const controller = hand === 'left' ? left : right
      const gamepad = controller?.inputSource.gamepad

      const wasGrip = gripRef.current[hand]
      const isGrip = nextGripPressed(
        wasGrip,
        gamepad?.buttons[XR_BUTTON.GRIP]?.value ?? 0,
        VR_GRIP_PRESS_THRESHOLD,
        VR_GRIP_RELEASE_THRESHOLD,
      )
      gripRef.current[hand] = isGrip
      const state = store.getState()
      if (!wasGrip && isGrip && controller?.object && state.phase === 'idle') {
        tryGrab(hand, controller.object)
      }
      if (wasGrip && !isGrip && state.vrHold && state.hand === hand) store.release()

      // 持っている手のトリガーは「使う」（その手ではインタラクトしない）
      const wasTrigger = triggerRef.current[hand]
      const isTrigger = gamepad?.buttons[XR_BUTTON.TRIGGER]?.pressed ?? false
      triggerRef.current[hand] = isTrigger
      const holding = store.getState()
      if (!holding.vrHold || holding.hand !== hand) continue
      if (!wasTrigger && isTrigger) store.useStart()
      if (wasTrigger && !isTrigger) store.useEnd()
    }

    const { vrHold, hand } = store.getState()
    if (!vrHold) return
    // 右スティック上下: レイの先に浮かせている物の距離（上に倒すと遠ざける）
    const stickY = right?.inputSource.gamepad?.axes[XR_AXIS.STICK_Y] ?? 0
    if (vrHold.mode === 'ray' && Math.abs(stickY) > VR_STICK_DEADZONE) {
      store.setVRHoldDistance(clampVRHoldDistance(vrHold.distance - stickY * VR_STICK_DISTANCE_SPEED * delta))
    }
    const controller = (hand === 'left' ? left : right)?.object
    if (controller) poseHeld(controller)
  })

  return null
}
