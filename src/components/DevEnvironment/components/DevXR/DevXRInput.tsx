import { useEffect, useRef } from 'react'
import type { MutableRefObject, RefObject } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { useXR, useXRInputSourceState } from '@react-three/xr'
import { Euler, Matrix4, Quaternion, Raycaster, Vector3 } from 'three'
import type { Group } from 'three'
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
  /** false を返す間はインタラクトしない（物を掴んでいる間） */
  canInteract: () => boolean
}

const SNAP_ANGLE_RAD = (SNAP_ANGLE_DEG * Math.PI) / 180

/**
 * DevEnvironment の VR 入力（本番の VRInputHandler・VRInteractionHandler の割り当てに合わせる）
 * - 左スティック: 移動（PhysicsPlayer が体を動かす）
 * - 右スティック左右: スナップ回転（XROrigin を回す。位置は PhysicsPlayer が頭を中心に合わせ直す）
 * - 右 A: ジャンプ・着席中は降りる
 * - select（コントローラーのトリガー・手のピンチ）: そのレイの先の Interactable を押す
 *
 * PhysicsPlayer より先に置くこと（useFrame は置いた順に走る。入力と回転を同じフレームで反映するため）
 */
export function DevXRInput({ inputRef, originRef, canInteract }: Props) {
  const session = useXR((s) => s.session)
  const { gl, camera } = useThree()
  const { interactableObjects } = useXRift()
  const left = useXRInputSourceState('controller', 'left')
  const right = useXRInputSourceState('controller', 'right')

  const snapRef = useRef<SnapTurnState>({ armed: true })
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
  const alignedRef = useRef(false)

  // select（トリガー・ピンチ）でレイの先を押す。姿勢はイベントの frame から取る
  useEffect(() => {
    if (!session) return
    const handleSelectStart = (event: XRInputSourceEvent) => {
      const origin = originRef.current
      const referenceSpace = gl.xr.getReferenceSpace()
      if (!origin || !referenceSpace || !canInteract()) return
      let pose: XRPose | undefined
      try {
        pose = event.frame.getPose(event.inputSource.targetRaySpace, referenceSpace)
      } catch {
        // セッションに入り直した直後は古い XRSpace が残っていることがある
        return
      }
      if (!pose) return
      poseMatrixRef.current.fromArray(pose.transform.matrix)
      origin.updateMatrixWorld()
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
    session.addEventListener('selectstart', handleSelectStart)
    return () => session.removeEventListener('selectstart', handleSelectStart)
  }, [session, gl, originRef, canInteract, interactableObjects])

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
      alignedRef.current = false
      desktopYawRef.current = eulerRef.current.setFromQuaternion(camera.quaternion, 'YXZ').y
      return
    }
    wasInVRRef.current = true

    // 入った直後、ヘッドセットの姿勢が届いてから一度だけ、画面で向いていた方角へ合わせる
    if (!alignedRef.current) {
      const referenceSpace = gl.xr.getReferenceSpace()
      const viewerPose = referenceSpace ? gl.xr.getFrame()?.getViewerPose(referenceSpace) : undefined
      if (!viewerPose) return
      const o = viewerPose.transform.orientation
      const headYaw = eulerRef.current.setFromQuaternion(quatRef.current.set(o.x, o.y, o.z, o.w), 'YXZ').y
      origin.rotation.set(0, normalizeAngle(desktopYawRef.current - headYaw), 0)
      alignedRef.current = true
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
    if (snap.turn !== 0) origin.rotation.y = normalizeAngle(origin.rotation.y + snap.turn * SNAP_ANGLE_RAD)
  })

  return null
}
