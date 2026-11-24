/** ジョイスティックのつまみの位置（中心からのずれ）。maxDistance より外へは出さない（本番と同じ） */
export function calculateJoystickPosition(
  touchX: number,
  touchY: number,
  centerX: number,
  centerY: number,
  maxDistance: number,
): { x: number; y: number } {
  const dx = touchX - centerX
  const dy = touchY - centerY
  const distance = Math.sqrt(dx * dx + dy * dy)
  if (distance <= maxDistance) return { x: dx, y: dy }
  const ratio = maxDistance / distance
  return { x: dx * ratio, y: dy * ratio }
}

/**
 * つまみの位置を移動の入力（-1〜1）にする。遊びより小さければ 0（本番と同じ）。
 * y は画面の下向きが正なので、そのまま「後ろ」が正の値になる
 */
export function normalizeJoystickInput(
  x: number,
  y: number,
  maxDistance: number,
  deadZone: number,
): { x: number; y: number } {
  const magnitude = Math.sqrt(x * x + y * y)
  if (magnitude < deadZone) return { x: 0, y: 0 }
  return { x: x / maxDistance, y: y / maxDistance }
}

/**
 * 指の動きで向きを変える（右へなぞると右を向く・上へなぞると見上げる）。
 * 見上げ・見下ろしは ±maxPitch で止める
 */
export function applyTouchLook(
  yaw: number,
  pitch: number,
  dx: number,
  dy: number,
  sensitivity: number,
  maxPitch: number,
): { yaw: number; pitch: number } {
  return {
    yaw: yaw - dx * sensitivity,
    pitch: Math.max(-maxPitch, Math.min(maxPitch, pitch - dy * sensitivity)),
  }
}
