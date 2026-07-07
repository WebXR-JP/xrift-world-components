import type { Object3D } from 'three'
import type { Position3D } from '../../../../types/movement'
import { GRABBABLE_USER_DATA_KEY } from '../../../Grabbable/constants'
import { MAX_ANCESTOR_DEPTH, MAX_HOLD_DISTANCE, MIN_HOLD_DISTANCE } from './constants'

/** クォータニオン（three に依存しない形） */
export interface QuaternionLike {
  x: number
  y: number
  z: number
  w: number
}

/** 掴み距離を [MIN, MAX] に収める */
export function clampHoldDistance(distance: number): number {
  return Math.min(MAX_HOLD_DISTANCE, Math.max(MIN_HOLD_DISTANCE, distance))
}

/** 2点間の距離 */
export function distanceBetween(a: Position3D, b: Position3D): number {
  return Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z)
}

/**
 * 視点（カメラ姿勢）から前方 distance[m] の位置を求める。
 * cameraQuaternion を差し替えるだけで VR コントローラーの pose にも流用できる純粋関数。
 * 前方ベクトル (0, 0, -1) をクォータニオンで回転して distance 倍する。
 */
export function computeHeldPosition(
  cameraPosition: Position3D,
  cameraQuaternion: QuaternionLike,
  distance: number,
): Position3D {
  const q = cameraQuaternion
  // v = (0, 0, -1) を q で回転: v' = v + w*t + q×t, t = 2*(q×v)
  const tx = 2 * -q.y
  const ty = 2 * q.x
  const tz = 0
  const dx = q.w * tx + (q.y * tz - q.z * ty)
  const dy = q.w * ty + (q.z * tx - q.x * tz)
  const dz = -1 + q.w * tz + (q.x * ty - q.y * tx)

  return {
    x: cameraPosition.x + dx * distance,
    y: cameraPosition.y + dy * distance,
    z: cameraPosition.z + dz * distance,
  }
}

/** ヒットした Object3D から親を辿り、grabbable ID を見つける。無ければ null */
export function findGrabbableId(object: Object3D | null): string | null {
  let current: Object3D | null = object
  for (let i = 0; i < MAX_ANCESTOR_DEPTH && current; i++) {
    const id = (current.userData as Record<string, unknown>)[GRABBABLE_USER_DATA_KEY]
    if (typeof id === 'string') return id
    current = current.parent
  }
  return null
}

/**
 * レイキャスト結果（手前から順）を走査し、最初に見つかった grabbable ID を返す。
 * どれも掴める対象でなければ null。
 */
export function findFirstGrabbableId(intersects: readonly { object: Object3D }[]): string | null {
  for (const intersect of intersects) {
    const id = findGrabbableId(intersect.object)
    if (id) return id
  }
  return null
}
