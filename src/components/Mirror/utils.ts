/**
 * カメラ距離に応じて Reflector を使うべきかを判定する。
 * ヒステリシスにより境界付近でのチラつきを防止する。
 *
 * - 現在 Reflector 表示中 → distance > lodDistance で envMap に切り替え
 * - 現在 envMap 表示中 → distance <= lodDistance * hysteresisRatio で Reflector に戻る
 */
export function shouldUseReflector(
  distance: number,
  lodDistance: number,
  currentlyUsingReflector: boolean,
  hysteresisRatio: number,
): boolean {
  if (currentlyUsingReflector) return distance <= lodDistance
  return distance <= lodDistance * hysteresisRatio
}
