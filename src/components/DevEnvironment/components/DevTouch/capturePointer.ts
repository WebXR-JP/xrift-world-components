/**
 * 指を離すまで、その指の動きをこの要素で受ける（ボタンやジョイスティックの外へ指がずれても追える）。
 * もう離れた指などで失敗しても、操作そのものは続ける
 */
export function capturePointer(element: Element, pointerId: number): void {
  try {
    element.setPointerCapture(pointerId)
  } catch {
    // 捕まえられなくても、押した・倒したことは扱う
  }
}
