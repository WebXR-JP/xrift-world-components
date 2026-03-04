import type { Vector3 } from 'three'

/**
 * カメラとターゲットのワールド座標からY軸ビルボード回転角度を計算する
 */
export const getBillboardYRotation = (
  cameraWorldPos: Vector3,
  targetWorldPos: Vector3,
): number => {
  const dx = cameraWorldPos.x - targetWorldPos.x
  const dz = cameraWorldPos.z - targetWorldPos.z
  return Math.atan2(dx, dz)
}
