import { Quaternion, Vector3 } from 'three'
import type { SeatControlInput, SeatSurface } from '../../../../contexts/SeatContext'
import type { Position3D } from '../../../../types/movement'
import {
  DEV_SEAT_CAMERA_FORWARD_CLEARANCE,
  ESTIMATED_SEATED_HIP_RATIO,
  FALLBACK_EYE_HEIGHT_RATIO,
  SEAT_CONTACT_BELOW_HIPS_RATIO,
  STANDING_HIP_RATIO,
} from './constants'

export { DEV_SEAT_CAMERA_FORWARD_CLEARANCE }

const _quaternion = new Quaternion()
const _offset = new Vector3()

/** 足元（RigidBody 原点）から腰・目までの高さ[m] */
export interface DevSeatOffsets {
  /** 座面に腰を載せるための高さ。足元Y = 座面Y − hipOffset（傾きがある座席では座席の下方向） */
  hipOffset: number
  /** 着席中のカメラ目線の高さ（立ち姿勢の eyeHeight の代わりに使う） */
  eyeOffset: number
}

/**
 * 押されているキー集合から移動の入力意図を求める。
 * x は右が +、z は three.js の前方（-Z）が -。斜めは正規化する
 */
export function moveIntentFromKeys(keys: ReadonlySet<string>): { x: number; z: number } {
  const intent = { x: 0, z: 0 }
  if (keys.has('KeyW') || keys.has('w') || keys.has('ArrowUp')) intent.z -= 1
  if (keys.has('KeyS') || keys.has('s') || keys.has('ArrowDown')) intent.z += 1
  if (keys.has('KeyA') || keys.has('a') || keys.has('ArrowLeft')) intent.x -= 1
  if (keys.has('KeyD') || keys.has('d') || keys.has('ArrowRight')) intent.x += 1
  if (intent.x !== 0 && intent.z !== 0) {
    const length = Math.sqrt(intent.x * intent.x + intent.z * intent.z)
    intent.x /= length
    intent.z /= length
  }
  return intent
}

/**
 * 移動の入力意図（three.js の XZ 平面）を座席の操縦入力へ変換する。
 *
 * **Z の符号が反転する**。入力層は前進を -Z（three.js の前方）で表すが、
 * 操縦入力は「前が +1」で表すため。X はどちらも右が + なのでそのまま
 */
export function toSeatControlInput(intent: { x: number; z: number }): SeatControlInput {
  return { forward: -intent.z, right: intent.x }
}

/**
 * 腰ボーンの高さ（足元から）を「座面に触れる点」の高さに直す。
 * 座面に載せるのは腰ボーンではなくお尻の底
 */
export function seatContactOffsetFromHipBone(hipBoneOffset: number, avatarHeight: number): number {
  return hipBoneOffset - avatarHeight * SEAT_CONTACT_BELOW_HIPS_RATIO
}

/**
 * 着席時の腰・目線オフセットの推定値。
 * 本番は座りポーズ確定後に VRM ボーンの実測値で上書きするが、
 * DevEnvironment の DummyAvatar には実測がないので推定値のまま運用する
 */
export function estimateSeatOffsets(avatarHeight: number, eyeHeight: number): DevSeatOffsets {
  const hipOffset = seatContactOffsetFromHipBone(
    avatarHeight * ESTIMATED_SEATED_HIP_RATIO,
    avatarHeight,
  )
  const drop = avatarHeight * (STANDING_HIP_RATIO - ESTIMATED_SEATED_HIP_RATIO)
  const estimated = { hipOffset, eyeOffset: eyeHeight - drop }
  if (isPlausibleSeatOffsets(estimated)) return estimated
  return { hipOffset, eyeOffset: avatarHeight * FALLBACK_EYE_HEIGHT_RATIO - drop }
}

/** 実測オフセットとして採用できる下限[m]（これ以下は測定失敗とみなす） */
const MIN_PLAUSIBLE_HIP_OFFSET = 0.05

/**
 * 腰・目線オフセットが妥当か判定する。
 * ボーン欠落・未初期化・想定外のリグで異常値が出たときは推定値のまま運用する
 */
export function isPlausibleSeatOffsets({ hipOffset, eyeOffset }: DevSeatOffsets): boolean {
  if (!Number.isFinite(hipOffset) || !Number.isFinite(eyeOffset)) return false
  if (hipOffset <= MIN_PLAUSIBLE_HIP_OFFSET) return false
  return eyeOffset > hipOffset
}

/**
 * 着席中の体の置き場所（足元＝RigidBody 原点）。
 * 傾いた座席では「座席の下方向」に足元を下げる。結果を out に書き込む
 */
export function computeSeatedFeetPosition(
  surface: SeatSurface,
  hipOffset: number,
  out: Position3D,
): Position3D {
  const { x, y, z, w } = surface.quaternion
  _offset.set(0, -hipOffset, 0).applyQuaternion(_quaternion.set(x, y, z, w))
  out.x = surface.position.x + _offset.x
  out.y = surface.position.y + _offset.y
  out.z = surface.position.z + _offset.z
  return out
}

/**
 * 着席中のカメラ位置。腰の位置から座席の上方向へ eyeAboveHip、
 * 前方（座席の -Z）へ forwardClearance ずらした点。
 * 傾いた座席でワールド基準の真上に取ると頭が体から外れるため、
 * オフセットは必ず座席の姿勢で回す。結果を out に書き込む
 */
export function computeSeatedEyePosition(
  surface: SeatSurface,
  eyeAboveHip: number,
  forwardClearance: number,
  out: Position3D,
): Position3D {
  const { x, y, z, w } = surface.quaternion
  _offset.set(0, eyeAboveHip, -forwardClearance).applyQuaternion(_quaternion.set(x, y, z, w))
  out.x = surface.position.x + _offset.x
  out.y = surface.position.y + _offset.y
  out.z = surface.position.z + _offset.z
  return out
}
