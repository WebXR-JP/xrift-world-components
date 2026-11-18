import { MathUtils } from 'three'

export interface DevPlacementPose {
  /** RigidBody（カプセル中心）を置く位置 */
  bodyPosition: { x: number; y: number; z: number }
  /** カメラの向き（ラジアン）。undefined ならいまの方角のまま */
  yaw: number | undefined
}

/**
 * 足元の位置と向き（度数法）を、DevEnvironment の体とカメラの姿勢に直す。
 * スポーン地点・リスポーン・テレポートで共通に使う。
 * 足元の位置（SpawnPoint・useTeleport の行き先）から、カプセルの中心まで feetOffsetY だけ浮かせる
 */
export function toDevPlacementPose(
  feetPosition: readonly [number, number, number],
  yawDegrees: number | undefined,
  feetOffsetY: number,
): DevPlacementPose {
  const [x, y, z] = feetPosition
  return {
    bodyPosition: { x, y: y + feetOffsetY, z },
    yaw: yawDegrees == null ? undefined : MathUtils.degToRad(yawDegrees),
  }
}
