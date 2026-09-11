import { Matrix4, Quaternion, Vector3 } from 'three'
import type { Position3D } from '../../types/movement'
import type { SeatSurface } from '../../contexts/SeatContext'
import type { SeatExitOffset } from './types'
import { DEFAULT_EXIT_OFFSET } from './constants'

const _position = new Vector3()
const _quaternion = new Quaternion()
const _scale = new Vector3()
const _forward = new Vector3()

/**
 * <Seat> の group のワールド行列から座面の姿勢を取り出す。
 * 親の group・乗り物・回転台の変換がそのまま伝わるので、作者は「置くだけ」でよい。
 * スケールは捨てる（座面は点と向きだけで決まる）
 */
export function decomposeSeatSurface(matrixWorld: Matrix4): SeatSurface {
  matrixWorld.decompose(_position, _quaternion, _scale)
  return {
    position: { x: _position.x, y: _position.y, z: _position.z },
    quaternion: { x: _quaternion.x, y: _quaternion.y, z: _quaternion.z, w: _quaternion.w },
  }
}

/**
 * 座席の yaw（Y 軸まわりの向き）。yaw=0 で前方が -Z、正で左回り。
 * 前方ベクトルを XZ 平面に落として求めるので、傾いた座席でも「だいたい向いている方向」が出る。
 * 真上・真下を向いていて水平成分が無いときは 0 を返す（降車位置の向きにしか使わないので十分）
 */
export function seatYaw(surface: SeatSurface): number {
  const { x, y, z, w } = surface.quaternion
  _forward.set(0, 0, -1).applyQuaternion(_quaternion.set(x, y, z, w))
  if (_forward.x * _forward.x + _forward.z * _forward.z < 1e-6) return 0
  return Math.atan2(-_forward.x, -_forward.z)
}

/**
 * 降車位置。forward/right は yaw だけで回し、up はワールド上方向に足す。
 * yaw=0 のとき forward は -Z、right は +X
 */
export function computeExitPosition(surface: SeatSurface, exitOffset?: SeatExitOffset): Position3D {
  const forward = exitOffset?.forward ?? DEFAULT_EXIT_OFFSET.forward
  const right = exitOffset?.right ?? DEFAULT_EXIT_OFFSET.right
  const up = exitOffset?.up ?? DEFAULT_EXIT_OFFSET.up
  const yaw = seatYaw(surface)
  const sin = Math.sin(yaw)
  const cos = Math.cos(yaw)
  return {
    x: surface.position.x - sin * forward + cos * right,
    y: surface.position.y + up,
    z: surface.position.z - cos * forward - sin * right,
  }
}
