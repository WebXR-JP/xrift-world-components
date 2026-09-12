/**
 * 同期されてきた姿勢へ寄せる速さ。RemotePlayer の body 補間と同じオーダーにしてある
 * （乗り物だけ追従の癖が違うと、乗っている人と車体がずれて見える）
 */
const LERP_SPEED = 25

/** これ以上離れていたら補間せずに飛ばす距離[m]（初回受信・リスポーン・巻き戻し） */
const SNAP_DISTANCE = 5

/**
 * 同期されてきた姿勢へ寄せる割合を返す。
 *
 * 姿勢は 20Hz でしか届かないので、そのまま当てると 50ms 刻みでカクつく。
 * フレーム時間に比例した割合で寄せると、届く間隔が変わっても速さが変わらない。
 *
 * ただし大きく離れているとき（初めて姿勢が届いた・リスポーンした）まで補間すると
 * 乗り物が空中を滑っていくので、そこは 1（＝そのまま当てる）を返す
 */
export function remotePoseLerpFactor(delta: number, distance: number): number {
  if (distance > SNAP_DISTANCE) return 1
  return Math.min(Math.max(delta, 0) * LERP_SPEED, 1)
}
