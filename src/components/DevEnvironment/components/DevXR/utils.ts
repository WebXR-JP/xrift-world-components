import { type Matrix4, Quaternion, Vector3 } from 'three'
import {
  MOVE_DEADZONE,
  SNAP_RESET_THRESHOLD,
  SNAP_THRESHOLD,
  XR_AXIS,
} from './constants'

/** 小さすぎる値（スティックのノイズ）を 0 にする */
export function applyDeadzone(value: number, deadzone: number): number {
  return Math.abs(value) > deadzone ? value : 0
}

/** gamepad のスティックを読む（デッドゾーン適用済み） */
export function readStick(axes: readonly number[]): { x: number; y: number } {
  return {
    x: applyDeadzone(axes[XR_AXIS.STICK_X] ?? 0, MOVE_DEADZONE),
    y: applyDeadzone(axes[XR_AXIS.STICK_Y] ?? 0, MOVE_DEADZONE),
  }
}

export interface SnapTurnState {
  /** 次のスナップ回転を受け付けるか（一度倒したら戻すまで受け付けない） */
  armed: boolean
}

/**
 * 右スティックの左右からスナップ回転の向きを決める。
 * 戻り値の turn は 右へ倒したら -1（yaw が減る＝右を向く）、左へ倒したら +1、回さないなら 0
 */
export function nextSnapTurn(
  stickX: number,
  state: SnapTurnState,
): { turn: -1 | 0 | 1; state: SnapTurnState } {
  if (state.armed && Math.abs(stickX) > SNAP_THRESHOLD) {
    return { turn: stickX > 0 ? -1 : 1, state: { armed: false } }
  }
  if (!state.armed && Math.abs(stickX) < SNAP_RESET_THRESHOLD) {
    return { turn: 0, state: { armed: true } }
  }
  return { turn: 0, state }
}

/**
 * 移動の向きと速さを求める。キー入力（-1/0/1）とスティック（-1〜1）を足し、
 * 長さが 1 を超えたら 1 に丸める（斜めでも速くならない・スティックを浅く倒せば遅く歩く）
 */
export function combineMoveIntent(
  forward: number,
  strafe: number,
): { forward: number; strafe: number } {
  const len = Math.sqrt(forward * forward + strafe * strafe)
  if (len <= 1) return { forward, strafe }
  return { forward: forward / len, strafe: strafe / len }
}

const RAY_FORWARD = new Vector3(0, 0, -1)
const tmpQuat = new Quaternion()
const tmpScale = new Vector3()

/**
 * コントローラーのレイ（targetRaySpace）の姿勢を、ワールド座標の始点と向きにする。
 * 姿勢は XROrigin から見た値なので、XROrigin の matrixWorld を掛ける
 */
export function rayFromPose(
  poseMatrix: Matrix4,
  originMatrixWorld: Matrix4,
  outPosition: Vector3,
  outDirection: Vector3,
  outWorld: Matrix4,
): void {
  outWorld.multiplyMatrices(originMatrixWorld, poseMatrix)
  outWorld.decompose(outPosition, tmpQuat, tmpScale)
  outDirection.copy(RAY_FORWARD).applyQuaternion(tmpQuat)
}

/** -π〜π に収める */
export function normalizeAngle(angle: number): number {
  return Math.atan2(Math.sin(angle), Math.cos(angle))
}

/** Y 軸まわりに yaw だけ回した水平のずれ（three の rotation.y と同じ向き） */
export function rotateYOffset(x: number, z: number, yaw: number): { x: number; z: number } {
  const cos = Math.cos(yaw)
  const sin = Math.sin(yaw)
  return { x: x * cos + z * sin, z: -x * sin + z * cos }
}

/**
 * 向き（yaw）から、水平の前と右の向きを作る。
 * 視線の水平成分から作ると、真下を見たときに長さがほぼ 0 になって向きが乱れるので yaw から作る
 */
export function horizontalBasisFromYaw(yaw: number): {
  forward: { x: number; z: number }
  right: { x: number; z: number }
} {
  const sin = Math.sin(yaw)
  const cos = Math.cos(yaw)
  return { forward: { x: -sin, z: -cos }, right: { x: cos, z: -sin } }
}

/** 一度にこれ以上動いたら、実際に歩いたのではなくトラッキングが飛んだとみなす（m） */
export const MAX_ROOM_SCALE_STEP = 0.5
