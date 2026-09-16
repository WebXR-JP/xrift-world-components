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

/**
 * このフレームで反射テクスチャを更新すべきかを判定する。
 *
 * 更新しないフレームは前回のテクスチャが残るため、見た目はほぼ変わらず
 * 描画コストだけが約 1/interval になる。
 *
 * frame には renderer.info.render.frame を使ってはいけない。
 * Reflector が内部で renderer.render() を再帰呼び出しするため、
 * info のカウンタは1フレームに2以上進み、interval=2 で詰み
 * （常に更新／常にスキップのどちらかに固定される）.
 * 呼び出し側で1フレームに1だけ進む自前カウンタを渡すこと。
 *
 * @param frame 自前フレームカウンタ（1フレームに1だけ進む通番）
 * @param interval 何フレームに1回更新するか（1以下は毎フレーム）
 */
export function shouldUpdateReflection(frame: number, interval: number): boolean {
  if (interval <= 1) return true
  return frame % Math.floor(interval) === 0
}
